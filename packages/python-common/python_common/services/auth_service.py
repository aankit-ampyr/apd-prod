from datetime import timedelta, datetime, timezone
import asyncio
import traceback
from typing import Generic, Type, TypeVar, Callable, Awaitable
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from python_common.constants.enums import (
    Platform,
    UserRole,
    AuditLogModules,
    AuditLogScenario,
)
from python_common.constants.defaults import DUMMY_OTP
from python_common.dto import OTPRequestPayload, OTPLoginPayload
from python_common.utils import Res
from python_common.models.users_models import UserMixin
from python_common.utils.common_utils import generate_otp
from python_common.utils.cache_utils import cache
from python_common.utils.jwt_utils import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from python_common.utils.template_utils import TemplateUtils
from python_common.utils.mail_utils import MailUtils
from python_common.exceptions import UserNotFound
from config import DEBUG

T = TypeVar("T", bound=UserMixin)
LoggerType = Callable[..., Awaitable[None]]


class AuthService(Generic[T]):
    def __init__(
        self,
        user_model: Type[T],
        allowed_roles: list[UserRole],
        allowed_platforms: list[Platform],
        # jwt_life_seconds: int = 900,
        jwt_life_seconds: int = 86400,
        refresh_life_seconds: int = 1800,
        otp_ttl_seconds: int = 300,
        attempts: int = 3,
        log_func: LoggerType = None,
        mail_function: Callable[..., Awaitable[None]] = None,
        template_model: Type = None,
    ):
        self.user_model = user_model
        self.template_model = template_model
        self.mail_function = mail_function
        self.allowed_roles = allowed_roles
        self.allowed_platform = allowed_platforms
        self.otp_ttl_seconds = otp_ttl_seconds
        self.attempts = attempts
        self.jwt_life_seconds = jwt_life_seconds
        self.refresh_life_seconds = refresh_life_seconds
        self.audit_log_fn = log_func

    def format_otp_label(self, email: str) -> str:
        return f"{self._normalize_email(email)}:OTP"

    def _normalize_email(self, email: str) -> str:
        return email.strip().lower()

    def _check_role_authorized(self, user_role: int):      
        allowed_values = [role.value for role in self.allowed_roles]
        return user_role in allowed_values

    async def _restore_if_block_expired(self, user: T, user_db: AsyncSession) -> None:
        if (
            not user.status
            and user.blocked_expiry
            and user.blocked_expiry <= datetime.now(timezone.utc)
        ):
            user.status = True
            user.blocked_expiry = None
            await user_db.commit()

    def _get_seconds_until_midnight(self) -> int:
        now = datetime.now(timezone.utc)
        tomorrow = (now + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        return int((tomorrow - now).total_seconds())

    async def _send_otp_via_email(
        self, email: str, name: str, otp: str, db: AsyncSession
    ):
        template_service = TemplateUtils(self.template_model)
        template_id = 7  # 7 is otp template as per LLD
        template = await template_service.get_by_ref(db, template_id)

        asyncio.create_task(
            self.mail_function(
                recipient_list=[email],
                subject=template_service.get_subject(template, username=name),
                html_message=template_service.get_message(
                    template, username=name, otp=otp
                ),
            )
        )

    async def _send_account_blocked_email(
        self, email: str, name: str, db: AsyncSession
    ):
        template_service = TemplateUtils(self.template_model)
        template_id = 8  # 8 is block user template as per LLD
        template = await template_service.get_by_ref(db, template_id)

        asyncio.create_task(
            self.mail_function(
                recipient_list=[email],
                subject=template_service.get_subject(template, name=name),
                html_message=template_service.get_message(template, name=name),
            )
        )

    async def _invalidate_prev_cache(self, cache_key):
        existing_cache = await cache.get(cache_key)
        attempts = self.attempts
        prev_otps = []
        # Preserve previous attempts and OTPs if cache exists
        if existing_cache:
            attempts = existing_cache.get("attempts", attempts)
            prev_otps = existing_cache.get("prev_otps", [])

            current_otp = existing_cache.get("otp")
            if current_otp and current_otp not in prev_otps:
                prev_otps.append(current_otp)

            # Only decrement attempts on resend (when cache already exists).
            # First-time OTP request should return full default attempts.
            attempts = attempts - 1

        return attempts, prev_otps

    async def get_otp(self, data: OTPRequestPayload, user_db: AsyncSession):
        normalized_email = self._normalize_email(data.email)

        filters = [
            func.lower(self.user_model.email) == normalized_email,
            self.user_model.is_deleted.is_(False),
        ]

        result = await user_db.execute(select(self.user_model).where(*filters))
        user = result.scalars().first()

        if not user:
            return Res.error(
                "E-10038", message="User with the given email does not exist"
            )
        
        if user.role not in [role.value for role in self.allowed_roles]:
            return Res.error("E-10011", message="You are not authorized to access this platform.")
        
        # skip role based platform based access check for super admin
        if self.allowed_platform is not None:
            allowed_platform_ids = (
                self.allowed_platform.value
                if hasattr(self.allowed_platform, "value")
                else self.allowed_platform
            )
            if not (set(user.platform or []) & set(allowed_platform_ids or [])):
                return Res.error(
                    "E-10038", message="User with the given email does not exist"
                )

        email = user.email
        # for super admin do not pass super admin as the role, modify it as admin role so that he/she can access all the admin related apis 
        # we are disguising super admin as admin 
        role = user.role
        name = user.name
        user_id = user.user_id

        # skip role based access check for super admin
        if not self._check_role_authorized(user.role):
            # TODO: the error status and message need to be changes
            return Res.error(
                "E-10011",
                message="Unauthorized Access! Sorry, we could not verify the user",
            )

        await self._restore_if_block_expired(user, user_db)

        if not user.is_active:
            return Res.error(
                "E-10039",
                message="User account is temporarily blocked. Please try again later.",
            )

        cache_key = self.format_otp_label(email)  # type: ignore
        attempts, prev_otps = await self._invalidate_prev_cache(cache_key)

        if attempts < 0:
            user.status = False
            user.blocked_expiry = datetime.now(timezone.utc) + timedelta(days=1)

            await user_db.commit()

            if self.audit_log_fn:
                await self.audit_log_fn(
                    user_id=user_id,
                    resource_id=user_id,
                    user_role=role,
                    module=AuditLogModules.AUTHENTICATION.value,
                    action=AuditLogScenario.USER_DEACTIVATED.value,
                    before=None,
                    after=f"User: {name} exceededs login attempt",
                )

            try:
                await self._send_account_blocked_email(
                    email=email, name=name, db=user_db
                )  # type: ignore
            except Exception:
                traceback.print_exc()

            await cache.delete(cache_key)  # type: ignore
            return Res.error(
                status_code="E-10044",
                message="Maximum OTP verification attempts exceeded",
            )

        otp = DUMMY_OTP if DEBUG else generate_otp()
        ttl_seconds = self._get_seconds_until_midnight()

        cache_payload = {
            "email": user.email,
            "name": user.name,
            "role": role,
            "otp": otp,
            "prev_otps": prev_otps,
            "attempts": attempts,
            "expires_in": (
                datetime.now(timezone.utc) + timedelta(seconds=self.otp_ttl_seconds)
            ).isoformat(),
        }

        try:
            await self._send_otp_via_email(email=email, name=name, otp=otp, db=user_db)  # type: ignore
        except Exception:
            traceback.print_exc()

        await cache.set(
            key=cache_key,
            value=cache_payload,
            ttl_seconds=ttl_seconds,
        )  # type: ignore

        if self.audit_log_fn:
            await self.audit_log_fn(
                user_id=user_id,
                resource_id=user_id,
                user_role=role,
                module=AuditLogModules.AUTHENTICATION.value,
                action=AuditLogScenario.OTP_SENT.value,
                before=None,
                after=f"OTP sent to registered email",
            )

        return Res.success(
            status="success",
            status_code="S-10017",
            data={
                "otp_attempts": attempts,
            },
        )

    async def verify_otp(self, data: OTPLoginPayload, user_db: AsyncSession):
        normalized_email = self._normalize_email(data.email)
        cache_key = self.format_otp_label(normalized_email)

        existing_cache = await cache.get(cache_key)
        if not existing_cache:
            return Res.error(
                status_code="E-10001",
                message="cache expired",
            )

        otp = existing_cache.get("otp")
        attempts = existing_cache.get("attempts")
        email = existing_cache.get("email")
        name = existing_cache.get("name")

        # dynamic filters for checking user
        filters = [
            func.lower(self.user_model.email) == normalized_email,
            self.user_model.is_deleted.is_(False),
        ]

        result = await user_db.execute(select(self.user_model).where(*filters))
        user = result.scalars().first()
        if not user:
            return Res.error(
                "E-10038", message="User with the given email does not exist"
            )

        if self.allowed_platform is not None:
            allowed_platform_ids = (
                self.allowed_platform.value
                if hasattr(self.allowed_platform, "value")
                else self.allowed_platform
            )
            if not (set(user.platform or []) & set(allowed_platform_ids or [])):
                return Res.error(
                    "E-10038", message="User with the given email does not exist"
                )
            
        if not user.status:
            return Res.error(
                "E-10039",
                message="User account is temporarily blocked. Please try again later.",
            )

        await self._restore_if_block_expired(user, user_db)

        user_id = user.user_id
        user_role = user.role
        user_name = user.name

        if attempts <= 0:
            user.status = False
            user.blocked_expiry = datetime.now(timezone.utc) + timedelta(days=1)
            await user_db.commit()

            if self.audit_log_fn:
                await self.audit_log_fn(
                    user_id=user_id,
                    resource_id=user_id,
                    user_role=user_role,
                    module=AuditLogModules.AUTHENTICATION.value,
                    action=AuditLogScenario.USER_DEACTIVATED.value,
                    before=None,
                    after=f"User {email} exceededs login attempt",
                )

            try:
                await self._send_account_blocked_email(
                    email=email, name=name, db=user_db
                )  # type: ignore
            except Exception:
                traceback.print_exc()

            return Res.error(
                status_code="E-10044",
                message="Maximum OTP verification attempts exceeded",
            )
        
        is_dummy_debug_otp = DEBUG and data.otp == DUMMY_OTP
        if (otp != data.otp) and not is_dummy_debug_otp:
            # reduce the attempts
            attempts -= 1
            existing_cache["attempts"] = attempts
            # update in cache

            await cache.set(
                key=cache_key,
                value=existing_cache,
                ttl_seconds=self._get_seconds_until_midnight(),
            )

            if self.audit_log_fn:
                await self.audit_log_fn(
                    user_id=user_id,
                    user_role=user_role,
                    module=AuditLogModules.AUTHENTICATION.value,
                    action=AuditLogScenario.OTP_VERIFY_FAILED.value,
                    before="OTP verification pending",
                    resource_id=user_id,
                    after="Invalid OTP entered",
                )

            return Res.error(
                status_code="E-10042",
                data={
                    "otp_attempts": attempts,
                },
                message="OTP expired",
            )

        expires_in = existing_cache.get("expires_in")
        if isinstance(expires_in, str):
            expires_in = datetime.fromisoformat(expires_in)

        if expires_in < datetime.now(timezone.utc):
            # reduce the attempts
            attempts -= 1
            existing_cache["attempts"] = attempts
            # update in cache
            await cache.set(
                key=cache_key,
                value=existing_cache,
                ttl_seconds=self._get_seconds_until_midnight(),
            )

            return Res.error(
                status_code="E-10043",
                data={
                    "otp_attempts": attempts,
                },
                message="OTP expired",
            )

        if not self._check_role_authorized(user.role):
            return Res.error(
                "E-10011",
                message="Unauthorized Access! Sorry, we could not verify the user",
            )

        access_token = create_access_token(
            email=user.email,
            user_id=user.id,
            name=user.name,
            role = user.role,
            platform=user.platform,
            expires_delta=timedelta(seconds=self.jwt_life_seconds),
        )

        refresh_token = create_refresh_token(
            email=user.email,
            user_id=user.id,
            name=user.name,
            role =user.role,
            platform=user.platform,
            expires_delta=timedelta(seconds=self.refresh_life_seconds),
        )

        await cache.delete(self.format_otp_label(normalized_email))
        user.last_activity = datetime.now(timezone.utc)

        data = {
            "id": user.id,
            "role": user.role,
            "email": user.email,
            "username": user.name,
            "platform": user.platform,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expiry_for_access_token": int(
                (
                    datetime.now(timezone.utc)
                    + timedelta(seconds=self.jwt_life_seconds)
                ).timestamp()
            ),
        }

        if self.audit_log_fn:
            await self.audit_log_fn(
                user_id=user_id,
                resource_id=user_id,
                user_role=user_role,
                module=AuditLogModules.AUTHENTICATION.value,
                action=AuditLogScenario.LOGIN_SUCCESS.value,
                before="Not logged in",
                after=f"User: {user_name} logged in successfully",
            )

        await user_db.commit()

        return Res.success(
            "S-10018",
            data=data,
        )

    async def refresh_token(self, refresh_token: str):
        try:
            payload = decode_token(refresh_token)
            email = payload.get("sub")
            user_id = payload.get("user_id")
            role = payload.get("role")
            platform = payload.get("platform")
            name = payload.get("name")
            access_token = create_access_token(
                email=email,
                user_id=user_id,
                name=name,
                role=role,
                platform=platform,
                expires_delta=timedelta(seconds=self.jwt_life_seconds),
            )

            return Res.success(
                status="success",
                status_code="S-10035",
                data={
                    "role": role,
                    "email": email,
                    "username": name,
                    "platform": platform,
                    "access_token": access_token,
                    "expiry_for_access_token": int(
                        (
                            datetime.now(timezone.utc)
                            + timedelta(seconds=self.jwt_life_seconds)
                        ).timestamp()
                    ),
                },
            )

        except Exception:
            return Res.error(
                status_code="E-10106",
                message="Invalid or expired refresh token",
            )

    async def logout(self, current_user: dict, db: AsyncSession):
        user_id = current_user.get("user_id")
        user_role = current_user.get("role")
        user_name = current_user.get("name")

        if self.audit_log_fn:
            await self.audit_log_fn(
                user_id=user_id,
                resource_id=user_id,
                user_role=user_role,
                module=AuditLogModules.AUTHENTICATION.value,
                action=AuditLogScenario.LOGOUT.value,
                before="Logged in",
                after=f"User: {user_name} logged out successfully",
                db=db,
            )
            await db.commit()

        return Res.success("S-10092",
            message="Logged out successfully",
        )
