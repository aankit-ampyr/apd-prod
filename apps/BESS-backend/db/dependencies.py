import logging
from fastapi import Request, Depends, Path
from sqlalchemy import select

from utils.response_utils import Res
from .db_config import UserSessionLocal, BessSessionLocal
from exceptions import UserNotAuthorized
from models.simulation_model import Simulation


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def get_db_session(session_maker):
    """Generic generator for DB sessions."""
    async with session_maker() as db:
        try:
            yield db
        except Exception as e:
            logger.error(f"Async database session error: {e}")
            await db.rollback()
            raise


async def get_user_db():
    async for session in get_db_session(UserSessionLocal):
        yield session


async def get_bess_db():
    async for session in get_db_session(BessSessionLocal):
        yield session


# Alias for backwards compatibility
get_db = get_user_db


def allowed_roles(*allowed_roles: int):
    """
    Role-based dependency similar to AMD backend.
    Uses `request.state.user` (set by auth middleware) and validates the numeric `role`.
    """

    def dependency(request: Request):
        user = getattr(request.state, "user", None)
        if not user:
            raise UserNotAuthorized("User not authenticated")

        # by default allow all
        if len(allowed_roles) == 0:
            return user

        user_role = user.get("role")
        if user_role is None:
            raise UserNotAuthorized("User role not found")

        user_role_int = int(user_role)
        if len(allowed_roles) > 0 and user_role_int not in allowed_roles:
            raise UserNotAuthorized("Unauthorized access")

        return user

    return dependency
