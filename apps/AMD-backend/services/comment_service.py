# ── services/comment_service.py ──

import traceback
import re
import json
import base64
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import select, or_, and_, func, cast, String,not_
from sqlalchemy.ext.asyncio import AsyncSession

from models.comment_model import Comment, Notification
from models.asset import Asset
from models.user_model import User
from models import UserOrganization
from utils import audit_logs,paginate
from redis.asyncio import Redis
from utils.comment_utils import extract_tagged_users
from python_common.utils.response_utils import Res
from constants.enums import (
    AssetStatus,
    AssetType,
    CommentContextType,
    UserRole,
    Platform,
    APDAuditLogScenario as AuditLogScenario,
    APDAuditLogModules as AuditLogModules,
    SocketEventType
)
from fastapi import BackgroundTasks
from utils.template_utils import template_utils
from utils.mail_utils import MailUtils
from config import WEB_APP_URL   
from python_common.utils import websocket_manager


class CommentService:
    def _get_audit_module_for_comment(self, context_module: str) -> int:
        if not context_module:
            return AuditLogModules.ASSET_ONBOARDING.value
            
        module_str = str(context_module).strip()
        if module_str == 'ExecutiveAnalysis':
            return AuditLogModules.EXECUTIVE_ANALYSIS.value
        elif module_str == 'ViewAnalysis':
            return AuditLogModules.VIEW_ANALYSIS.value
        elif module_str == 'BenchmarkAnalysis':
            return AuditLogModules.BENCHMARK_ANALYSIS.value
        elif module_str == 'InvoiceAnalysis':
            return AuditLogModules.INVOICE_ANALYSIS.value
        elif module_str == 'AssetDetails':
            return AuditLogModules.ASSET_ONBOARDING.value
        return AuditLogModules.ASSET_ONBOARDING.value
    
    def _validate_content(self, content: List[Dict[str, Any]], field_name: str = "Comment"):
        """Validate content for comments and replies"""
        if not content:
            return Res.error("E-10255", message=f"Please enter a {field_name.lower()}.", http_status_code=400)
        
        full_text = ""
        for block in content:
            if block.get("type") == "text":
                text = block.get("text", "").strip()
                full_text += text
            elif block.get("type") == "mention":
                user = block.get("user", {})
                user_name = user.get("name", "") if isinstance(user, dict) else ""
                if user_name:
                    full_text += f"@{user_name}"
        
        if not full_text:
            return Res.error(f"E-10266" if field_name == "Comment" else "E-10267", 
                           message=f"{field_name} cannot contain only spaces.", http_status_code=422)
        
        min_len = 5 if field_name == "Comment" else 2
        max_len = 3000
        
        if len(full_text) < min_len:
            return Res.error(f"E-10260" if field_name == "Comment" else "E-10262",
                           message=f"{field_name} should be at least {min_len} characters.", http_status_code=422)
        
        if len(full_text) > max_len:
            return Res.error(f"E-10261" if field_name == "Comment" else "E-10263",
                           message=f"{field_name} should not exceed {max_len} characters.", http_status_code=422)
        
        if re.match(r'^[\W_]+$', full_text):
            return Res.error("E-10264", message="Content should contain meaningful text.", http_status_code=422)
        
        if re.search(
                r'<script|javascript:|alert\(|eval\(|on\w+\s*=|<\?php'
                r'|(\bSELECT\b.{0,20}\bFROM\b)|(\bUNION\b\s+\bSELECT\b)|(\bINSERT\b\s+\bINTO\b)'
                r'|(\bDROP\b\s+\bTABLE\b)|(--\s)|(\bOR\b\s+1\s*=\s*1)',
                full_text, re.IGNORECASE
            ):
            return Res.error("E-10263", message="Content contains restricted content. Please remove scripts or code and try again.", http_status_code=400)
        
        if re.search(r'[^\w\s\-_\/&():,.\?\!%£$€\'"@+=<>\[\]{};\\]', full_text):
            return Res.error(f"E-10270" if field_name == "Comment" else "E-10271",
                           message=f"{field_name} contains unsupported characters.", http_status_code=422)
        
        return None

    def _validate_title(self, title: str):
        """Validate title for comments"""
        if not title or not title.strip():
            return Res.error("E-10255", message="Please enter a title.", http_status_code=422)
        
        if len(title.strip()) < 3:
            return Res.error("E-10257", message="Title should be at least 3 characters.", http_status_code=422)
        
        if len(title) > 100:
            return Res.error("E-10258", message="Title should not exceed 100 characters.", http_status_code=422)
        
        if re.match(r'^[\s]+$', title):
            return Res.error("E-10265", message="Title cannot contain only spaces.", http_status_code=422)
        
        if re.match(r'^[\W_]+$', title):
            return Res.error("E-10264", message="Title should contain meaningful text.", http_status_code=422)
        
        if re.search(r'<script|javascript:|alert\(|eval\(|on\w+\s*=|<\?php|SELECT\s+|INSERT\s+|UPDATE\s+|DELETE\s+', 
                     title, re.IGNORECASE):
            return Res.error("E-10263", message="Title contains restricted content. Please remove scripts or code and try again.",  http_status_code=400)
        
        if re.search(r'[^\w\s\-_\/&():,.\?\!%£$€\'"@]', title):
            return Res.error("E-10269", message="Title contains unsupported characters.", http_status_code=422)
        
        return None
    
    def _get_user_id(self, current_user: dict) -> int:
        """Extract integer user ID from current_user"""
        user_id = current_user.get("user_id")  # 'USER-111'
        if isinstance(user_id, str) and user_id.startswith('USER-'):
            return int(user_id.replace('USER-', ''))
        return int(user_id)
    
    
    async def _format_content_for_response(
        self, user_db: AsyncSession, content: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Resolve mention blocks from {user_id, type} into {user: {id, name}, type} per LLD"""
        formatted = []
        for block in content:
            if block.get("type") == "mention":
                user_id = block.get("user_id")
                user = await user_db.get(User, user_id) if user_id else None
                formatted.append({
                    "type": "mention",
                    "user": {
                        "id": user_id,
                        "name": user.name if user else "Unknown"
                    }
                })
            else:
                formatted.append(block)
        return formatted
    
    def _get_content_preview(self, content: List[Dict[str, Any]]) -> str:
        """Build a short plain-text preview from content blocks for email bodies"""
        if not isinstance(content, list):
            return ""

        text_parts = []
        for block in content:
            if not isinstance(block, dict):
                continue
                
            if block.get("type") == "text":
                text_parts.append(block.get("text", ""))
            elif block.get("type") == "mention":
                user = block.get("user", {})
                if isinstance(user, dict) and "name" in user:
                    text_parts.append(f"@{user['name']}")

        full_text = " ".join(text_parts).strip()
        return full_text

    def _customize_template_label(self, template, old_label: str, new_label: str):
        if not template:
            return template

        import copy
        template_copy = copy.copy(template)

        if hasattr(template_copy, "body") and template_copy.body:
            template_copy.body = template_copy.body.replace(old_label, new_label)
        elif isinstance(template_copy, dict) and template_copy.get("body"):
            template_copy["body"] = template_copy["body"].replace(old_label, new_label)

        return template_copy
    
    def _generate_deep_link(self, asset_id: int, comment: Comment) -> str:
        # Construct the NotificationMeta dictionary exactly as the frontend expects it
        meta = {
            "comment_id": str(comment.id),
            "asset_id": asset_id,
            "context_type": comment.context_type,
            "context_module": comment.context_module,
            "context_tab": comment.context_tab,
            "context_widget": comment.context_widget,
            "context_year": comment.context_year,
            "context_month": comment.context_month,
            "context_data_point": comment.context_data_point
        }
        
        # Base64 encode the JSON string
        encoded_meta = base64.b64encode(json.dumps(meta).encode('utf-8')).decode('utf-8')
        
        # We append it to the base WEB_APP_URL, and frontend intercepts it on load
        return f"{WEB_APP_URL}?deepLink={encoded_meta}"

    async def _send_comment_mention_email(
        self,
        recipient_email: str,
        recipient_name: str,
        commenter_name: str,
        title: str,
        asset_name: str,
        module_name: str,
        comment_preview: str,
        comment_url: str,
        template,
    ):
        if template:
            subject = template_utils.get_subject(template, title=title)
            
            body = template_utils.get_message(
                template,
                user_name=recipient_name,
                commented_user_name=commenter_name,
                screen_title=title,
                asset_name=asset_name,
                module_name=module_name,
                comment_preview=comment_preview,
                view_comment_url=comment_url,
            )
            
            await MailUtils.send_365_async(
                recipient_list=[recipient_email],
                subject=subject,
                html_message=body,
            )


    async def _send_reply_mention_email(
        self,
        recipient_email: str,
        recipient_name: str,
        commenter_name: str,
        title: str,
        asset_name: str,
        module_name: str,
        reply_preview: str,
        comment_url: str,
        template,
    ):
        if template:
            subject = template_utils.get_subject(template, title=title)
            
            body = template_utils.get_message(
                template,
                user_name=recipient_name,
                commented_user_name=commenter_name,
                screen_title=title,
                asset_name=asset_name,
                module_name=module_name,
                reply_preview=reply_preview,
                view_comment_url=comment_url,
            )

            await MailUtils.send_365_async(
                recipient_list=[recipient_email],
                subject=subject,
                html_message=body,
            )


    async def _send_reply_to_comment_email(
        self,
        recipient_email: str,
        recipient_name: str,
        replier_name: str,
        title: str,
        asset_name: str,
        module_name: str,
        reply_preview: str,
        comment_url: str,
        template,
    ):
        if template:
            subject = template_utils.get_subject(template, title=title)
            
            body = template_utils.get_message(
                template,
                user_name=recipient_name,
                commented_user_name=replier_name,
                screen_title=title,
                asset_name=asset_name,
                module_name=module_name,
                reply_preview=reply_preview,
                view_comment_url=comment_url,
            )

            await MailUtils.send_365_async(
                recipient_list=[recipient_email],
                subject=subject,
                html_message=body,
            )

    def _build_push_notification_text(
        self, notif_type: str, actor_name: str, title: str, preview: Optional[str] = None
    ) -> str:
        """Build push notification text per LLD format, truncated to ~2 lines"""
        if notif_type == "mention_comment":
            text = f"{actor_name} mentioned you in a comment on {title}."
        elif notif_type == "mention_reply":
            text = f"{actor_name} mentioned you in a reply on {title}."
        elif notif_type == "reply_to_comment":
            text = f"{actor_name} replied to your comment on {title}."
        else:
            text = ""

        if preview:
            text = f"{text} {preview}"

        # approx two lines
        max_length = 120
        if len(text) > max_length:
            text = text[:max_length].rstrip() + "…"

        return text


    async def _send_push_notification(
        self,
        user_id: int,
        notification_id: str,
        notif_type: str,
        actor_name: str,
        title: str,
        asset_id: int,
        module: Optional[str],
        tab: Optional[str],
        year: Optional[int],
        month: Optional[int],
        comment_id: int,
        context_type: str,
        preview: Optional[str] = None,
    ):
        """Send a push notification via websocket for comment-related activity"""
        try:
            text = self._build_push_notification_text(notif_type, actor_name, title, preview)
            message = {
                "type": SocketEventType.COMMENT_NOTIFICATION,
                "notification_id": notification_id,
                "notification_type": notif_type,
                "text": text,
                "data": {
                    "asset_id": asset_id,
                    "module": module,
                    "tab": tab,
                    "year": year,
                    "month": month,
                    "comment_id": comment_id,
                    "context_type": context_type,
                },
            }
            await websocket_manager.send_personal_message(message, user_id)
        except Exception:
            traceback.print_exc()

    async def create_comment(
        self,
        db: AsyncSession,
        redis: Redis,
        user_db: AsyncSession,
        asset_id: int,
        payload: Dict[str, Any],
        current_user: dict,
        background_task: BackgroundTasks,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", message="Asset not found.", http_status_code=404)
            
            if asset.type == AssetType.SOLAR.value:
                return Res.error("E-10120", message="Comments are not applicable for Solar assets.", http_status_code=422)
            
            if asset.status != AssetStatus.ACTIVE.value:
                return Res.error("E-10240", message="This action cannot be performed on inactive assets.", http_status_code=422)
            
            org_id = asset.organization_id
            user_id_int = self._get_user_id(current_user)
            user_role = current_user.get("role")
            
            if user_role != UserRole.ADMIN.value:
                org_check = await db.execute(
                    select(UserOrganization).where(
                        UserOrganization.user_id == user_id_int,
                        UserOrganization.organization_id == org_id
                    )
                )
                if not org_check.scalars().first():
                    return Res.error("E-10013", message="Unauthorized: You do not have access to this asset's organization.", http_status_code=403)
            
            title_validation = self._validate_title(payload.get("title", ""))
            if title_validation:
                return title_validation
            
            content_validation = self._validate_content(payload.get("content", []), "Comment")
            if content_validation:
                return content_validation
            
            raw_tagged_user_ids = extract_tagged_users(payload.get("content", []))
            tagged_user_ids = []

            if raw_tagged_user_ids:
                valid_org_users_query = await db.execute(
                    select(UserOrganization.user_id).where(
                        UserOrganization.organization_id == org_id,
                        UserOrganization.user_id.in_(raw_tagged_user_ids)
                    )
                )
                valid_org_user_ids = valid_org_users_query.scalars().all()
                
                admin_users_query = await user_db.execute(
                    select(User.id).where(
                        User.id.in_(raw_tagged_user_ids),
                        User.role == UserRole.ADMIN.value,
                    )
                )
                admin_user_ids = admin_users_query.scalars().all()
                
                base_valid_user_ids = list(set(valid_org_user_ids + admin_user_ids))
                if base_valid_user_ids:
                    active_users_query = await user_db.execute(
                        select(User.id).where(
                            User.id.in_(base_valid_user_ids),
                            User.is_deleted == False,
                            User.status == True
                        )
                    )
                    base_valid_user_ids = active_users_query.scalars().all()
                
                if user_role == UserRole.ANALYST.value and base_valid_user_ids:
                    valid_role_query = await user_db.execute(
                        select(User.id).where(
                            User.id.in_(base_valid_user_ids),
                            User.role.in_([UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value])
                        )
                    )
                    valid_tagged_ids = valid_role_query.scalars().all()
                else:
                    valid_tagged_ids = base_valid_user_ids
                
                tagged_user_ids = [uid for uid in raw_tagged_user_ids if uid in valid_tagged_ids]
            
            context_type = payload.get("context_type", CommentContextType.SCREEN.value)
            if context_type not in [e.value for e in CommentContextType]:
                return Res.error("E-10272", message="Invalid context type.", http_status_code=422)
            
            # ── Create comment first ──────────────────────────────────────────────────
            comment = Comment(
                asset_id=asset_id,
                owner_id=user_id_int,
                parent_comment_id=payload.get("parent_comment_id"),
                title=payload.get("title").strip(),
                content=json.dumps(payload.get("content")),
                context_type=context_type,
                context_module=payload.get("context_module"),
                context_tab=payload.get("context_tab"),
                context_widget=payload.get("context_widget"),
                context_data_point=payload.get("context_data_point"),
                context_year=payload.get("context_year"),
                context_month=payload.get("context_month"),
                tagged_users=tagged_user_ids if tagged_user_ids else None,
                is_read=False,
                is_deleted=False,
            )
            
            db.add(comment)
            await db.flush()
            
            
            # ── Create notifications ──────────────────────────────────────────────────
            comment_title = payload.get("title", "")
            base_msg = f"{current_user.get('name', 'User')} mentioned you in a comment on {comment_title}."
            
            for user_id in tagged_user_ids:
                if user_id != user_id_int:
                    notification = Notification(
                        user_id=user_id,
                        title="Mentioned You",
                        message=base_msg,
                        meta={
                            "comment_id": comment.comment_id,
                            "asset_id": asset_id,
                            "context_type": payload.get("context_type"),
                            "context_module": payload.get("context_module"),
                            "context_tab": payload.get("context_tab"),
                            "context_widget": payload.get("context_widget"),
                            "context_data_point": payload.get("context_data_point"),
                            "context_year": payload.get("context_year"),
                            "context_month": payload.get("context_month"),
                        },
                        is_read=False,
                    )
                    db.add(notification)
                    await db.flush()

                    # ── Send push notification ──
                    await self._send_push_notification(
                        user_id=user_id,
                        notification_id=notification.notification_id,
                        notif_type="mention_comment",
                        actor_name=current_user.get("name", "User"),
                        title=payload.get("title"),
                        asset_id=asset_id,
                        module=payload.get("context_module"),
                        tab=payload.get("context_tab"),
                        year=payload.get("context_year"),
                        month=payload.get("context_month"),
                        comment_id=comment.id,
                        context_type=context_type,
                        preview=self._get_content_preview(payload.get("content", [])),
                    )
            
            await db.commit()
            
            # ── Send mention emails to tagged users  ──────
            if tagged_user_ids:
                mention_template = await template_utils.get_by_ref(user_db, 11)
                comment_preview = self._get_content_preview(payload.get("content", []))
                comment_url = self._generate_deep_link(asset_id, comment)

                for user_id in tagged_user_ids:
                    if user_id != user_id_int:
                        tagged_user = await user_db.get(User, user_id)
                        if tagged_user and tagged_user.email:
                            background_task.add_task(
                                self._send_comment_mention_email,
                                tagged_user.email,
                                tagged_user.name,
                                current_user.get("name", "User"),
                                payload.get("title"),
                                asset.name,
                                payload.get("context_module") or "",
                                comment_preview,
                                comment_url,
                                mention_template,
                            )
            
            # ── Audit log ──────────────────────────────────────────────────────────────
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module_for_comment(payload.get("context_module")),
                action=AuditLogScenario.ADDED_COMMENT.value,
                before={
                    "Comment Title": "Not Available",
                    "Comment Content": "Not Available"
                },
                after={
                    "Comment Title": payload.get("title"),
                    "Comment Content": payload.get("content")
                },
                resource_id=f"COM-{comment.id}_(Asset ID: {asset.asset_id})",
            )
            await db.commit()
            
            owner = await user_db.get(User, user_id_int)
            
            return Res.success(
                "S-10099",
                data={
                    "id": comment.id,
                    "comment_id": comment.comment_id,
                    "title": comment.title,
                    "content": await self._format_content_for_response(user_db, json.loads(comment.content)),
                    "owner": {
                        "id": owner.id if owner else user_id_int,
                        "name": owner.name if owner else current_user.get("name", "Unknown")
                    },
                    "created_at": comment.created_at.isoformat() if comment.created_at else None,
                    "context_type": comment.context_type,
                    "context_module": comment.context_module,
                    "context_tab": comment.context_tab,
                    "context_widget": comment.context_widget,
                    "context_data_point": comment.context_data_point,
                    "context_year": comment.context_year,
                    "context_month": comment.context_month,
                    "is_read": comment.is_read,
                    "updated_at": None,
                    "replies": [],
                    "message": "Comment posted successfully."
                }
            )
            
        except Exception:
            traceback.print_exc()
            await db.rollback()
            raise
        
    async def list_comments(
        self,
        db: AsyncSession,
        user_db: AsyncSession,
        asset_id: int,
        current_user: dict,
        context_module: Optional[str] = None,
        context_tab: Optional[str] = None,
        context_type: Optional[str] = None,
        context_widget: Optional[str] = None,
        context_data_point: Optional[str] = None,
        context_year: Optional[int] = None,
        context_month: Optional[int] = None,
        search: Optional[str] = None,
        owner_id: Optional[int] = None,
        unread_only: bool = False,
        page: int = 1,
        limit: int = 100,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", message="Asset not found.", http_status_code=404)
                
            org_id = asset.organization_id
            user_id_int = self._get_user_id(current_user)
            user_role = current_user.get("role")
            
            if user_role != UserRole.ADMIN.value:
                org_check = await db.execute(
                    select(UserOrganization).where(
                        UserOrganization.user_id == user_id_int,
                        UserOrganization.organization_id == org_id
                    )
                )
                if not org_check.scalars().first():
                    return Res.error("E-10013", message="Unauthorized: You do not have access to this asset's organization.", http_status_code=403)
                    
            if user_role == UserRole.ANALYST.value and context_module == 'ExecutiveAnalysis':
                return Res.error("E-10013", message="Unauthorized: Analysts do not have access to Executive Analysis.", http_status_code=403)
                    
            query = select(Comment).where(
                Comment.asset_id == asset_id,
                Comment.is_deleted == False,
                Comment.parent_comment_id.is_(None),
            )
            
            if context_module:
                query = query.where(Comment.context_module.ilike(context_module))
            if context_tab:
                query = query.where(Comment.context_tab.ilike(context_tab))
            if context_type:
                query = query.where(Comment.context_type == context_type)
            if context_widget:
                query = query.where(Comment.context_widget.ilike(context_widget))
            if context_data_point:
                query = query.where(Comment.context_data_point.ilike(context_data_point))
            if context_year:
                query = query.where(Comment.context_year == context_year)
            if context_month:
                query = query.where(Comment.context_month == context_month)
            if owner_id:
                query = query.where(Comment.owner_id == owner_id)
            if unread_only:
                user_id_int = self._get_user_id(current_user)
                query = query.where(
                    or_(
                        Comment.read_by.is_(None),
                        not_(Comment.read_by.contains([user_id_int]))
                    )
                )
            if search:
                search_term = f"%{search.strip()}%"
                query = query.where(
                    or_(
                        Comment.title.ilike(search_term),
                        Comment.content.ilike(search_term)
                    )
                )
            
            result = await paginate(
                db=db,
                base_query=query,
                page=page,
                limit=limit,
                order_by=[func.coalesce(Comment.updated_at, Comment.created_at).desc()],
                scalar=True,
            )

            total_comments = result.total_results
            if total_comments == 0:
                return Res.success(
                    "S-10100",
                    data={
                        "current_page": page,
                        "next_page": None,
                        "total_pages": 0,
                        "total_comments": 0,
                        "comments": [],
                    }
                )

            comments = result.records
            
            comment_list = []
            for comment in comments:
                replies_query = select(Comment).where(
                    Comment.parent_comment_id == comment.id,
                    Comment.is_deleted == False
                ).order_by(Comment.created_at.asc())
                replies_result = await db.execute(replies_query)
                replies = replies_result.scalars().all()

                owner = await user_db.get(User, comment.owner_id)   # ← added, uses user_db

                reply_list = []
                for reply in replies:
                    reply_owner = await user_db.get(User, reply.owner_id)   # ← uses user_db
                    reply_list.append({
                        "id": reply.id,
                        "comment_id": reply.comment_id,
                        "title": reply.title,
                        "content": await self._format_content_for_response(user_db, json.loads(reply.content)),
                        "owner": {
                            "id": reply_owner.id if reply_owner else reply.owner_id,
                            "name": reply_owner.name if reply_owner else "Unknown"
                        },
                        "created_at": reply.created_at.isoformat() if reply.created_at else None,
                        "updated_at": reply.updated_at.isoformat() if reply.updated_at else None,
                        "is_read": self._get_user_id(current_user) in (reply.read_by or []),
                    })

                comment_list.append({
                    "id": comment.id,
                    "comment_id": comment.comment_id,
                    "title": comment.title,
                    "content": await self._format_content_for_response(user_db, json.loads(comment.content)),
                    "owner": {
                        "id": owner.id if owner else comment.owner_id,
                        "name": owner.name if owner else "Unknown"
                    },
                    "created_at": comment.created_at.isoformat() if comment.created_at else None,
                    "updated_at": comment.updated_at.isoformat() if comment.updated_at else None,
                    "context_type": comment.context_type,
                    "context_module": comment.context_module,
                    "context_tab": comment.context_tab,
                    "context_widget": comment.context_widget,
                    "context_data_point": comment.context_data_point,
                    "context_year": comment.context_year,
                    "context_month": comment.context_month,
                    "is_read": self._get_user_id(current_user) in (comment.read_by or []),
                    "replies": reply_list,
                })
                    
            return Res.success(
                "S-10100",
                data={
                    "current_page": result.current_page,
                    "next_page": result.current_page + 1 if result.current_page < result.total_pages else None,
                    "total_pages": result.total_pages,
                    "total_comments": total_comments,
                    "comments": comment_list,
                }
            )
            
        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def update_comment(
        self,
        db: AsyncSession,
        redis: Redis,
        user_db: AsyncSession,
        asset_id: int,
        comment_id: int,
        payload: Dict[str, Any],
        current_user: dict,
        background_task: BackgroundTasks,
    ):
        try:
            query = await db.execute(
                select(Comment).where(
                    Comment.asset_id == asset_id,
                    Comment.id == comment_id,
                    Comment.is_deleted == False,
                )
            )
            comment = query.scalars().first()
            
            if not comment:
                return Res.error("E-10252", message="Comment not found.", http_status_code=404)
            
            if comment.owner_id != self._get_user_id(current_user):
                return Res.error("E-10253", message="You are not authorized to edit this comment.", http_status_code=403)
            
            if comment.created_at:
                if datetime.now(timezone.utc) - comment.created_at > timedelta(minutes=15):
                    return Res.error("E-10256", message="Edit window has expired. You can no longer edit this comment.", http_status_code=409)
            
            before_title = comment.title
            before_content = comment.content
            
            if "title" in payload:
                # Do not update title if this is a reply
                if not comment.parent_comment_id:
                    title_validation = self._validate_title(payload["title"])
                    if title_validation:
                        return title_validation
                    comment.title = payload["title"].strip()
            
            if "content" in payload:
                field_name = "Reply" if comment.parent_comment_id else "Comment"
                content_validation = self._validate_content(payload["content"], field_name)
                if content_validation:
                    return content_validation
                comment.content = json.dumps(payload["content"])
            
            if "is_read" in payload:
                comment.is_read = payload["is_read"]
            
            comment.updated_at = datetime.now(timezone.utc)
            
            await db.commit()

            # ── Send "updated comment" email to tagged users, same template ref 11, label swapped ──
            if "content" in payload:
                tagged_user_ids = extract_tagged_users(payload["content"])
                if tagged_user_ids:
                    asset = await db.get(Asset, asset_id)
                    current_user_id = self._get_user_id(current_user)
                    mention_template = await template_utils.get_by_ref(user_db, 11)
                    mention_template = self._customize_template_label(mention_template, "Comment:", "Updated comment:")
                    comment_preview = self._get_content_preview(payload["content"])
                    comment_url = self._generate_deep_link(asset_id, comment)


                    for user_id in tagged_user_ids:
                        if user_id != current_user_id:
                            tagged_user = await user_db.get(User, user_id)
                            if tagged_user and tagged_user.email:
                                background_task.add_task(
                                    self._send_comment_mention_email,
                                    tagged_user.email,
                                    tagged_user.name,
                                    current_user.get("name", "User"),
                                    comment.title,
                                    asset.name if asset else "",
                                    comment.context_module or "",
                                    comment_preview,
                                    comment_url,
                                    mention_template,
                                )
            
            is_reply = comment.parent_comment_id is not None
            parent_title = "Unknown"
            if is_reply:
                parent_comment = await db.get(Comment, comment.parent_comment_id)
                if parent_comment:
                    parent_title = parent_comment.title
            
            before_audit = {
                "Comment Title": parent_title if is_reply else before_title,
                "Reply Content" if is_reply else "Comment Content": before_content
            }
            after_audit = {
                "Comment Title": parent_title if is_reply else comment.title,
                "Reply Content" if is_reply else "Comment Content": comment.content
            }
            
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module_for_comment(comment.context_module),
                action=AuditLogScenario.UPDATED_COMMENT.value,
                before=before_audit,
                after=after_audit,
                resource_id=f"COM-{comment.id}_(Asset ID: {asset_id})",
            )
            await db.commit()
            
            return Res.success(
                "S-10101",
                data={
                    "id": comment.id,
                    "comment_id": comment.comment_id,
                    "title": comment.title,
                    "content": await self._format_content_for_response(user_db, json.loads(comment.content)),
                    "is_read": comment.is_read,
                    "updated_at": comment.updated_at.isoformat() if comment.updated_at else None,
                    "message": "Comment updated successfully."
                }
            )
            
        except Exception:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10001")
    
    async def delete_comment(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        comment_id: int,
        current_user: dict,
    ):
        try:
            query = await db.execute(
                select(Comment).where(
                    Comment.asset_id == asset_id,
                    Comment.id == comment_id,
                    Comment.is_deleted == False,
                )
            )
            comment = query.scalars().first()
            
            if not comment:
                return Res.error("E-10252", message="Comment not found.", http_status_code=404)
            
            if comment.owner_id != self._get_user_id(current_user):
                return Res.error("E-10253", message="You are not authorized to delete this comment.", http_status_code=403)
            
            if comment.created_at:
                if datetime.now(timezone.utc) - comment.created_at > timedelta(minutes=15):
                    return Res.error("E-10256", message="Delete window has expired. You can no longer delete this comment.", http_status_code=409)
            
            replies_query = await db.execute(
                select(Comment).where(
                    Comment.parent_comment_id == comment.id,
                    Comment.is_deleted == False,
                )
            )
            if replies_query.scalars().first():
                return Res.error("E-10268", message="Cannot delete comment with replies. Please delete replies first.", http_status_code=409)
            
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module_for_comment(comment.context_module),
                action=AuditLogScenario.REMOVED_COMMENT.value,
                before={
                    "Comment Title": comment.title,
                    "Comment Content": comment.content
                },
                after={
                    "Comment Title": "Removed",
                    "Comment Content": "Removed"
                },
                resource_id=f"COM-{comment.id}_(Asset ID: {asset_id})",
            )
            
            comment.is_deleted = True
            await db.commit()
            
            return Res.success(
                "S-10102",
                data={
                    "comment_id": comment.id,
                    "message": "Comment deleted successfully."
                }
            )
            
        except Exception:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10001")

    async def reply_to_comment(
        self,
        db: AsyncSession,
        redis: Redis,
        user_db: AsyncSession,
        asset_id: int,
        comment_id: int,
        payload: Dict[str, Any],
        current_user: dict,
        background_task: BackgroundTasks,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", message="Asset not found.", http_status_code=404)
                
            org_id = asset.organization_id
            user_id_int = self._get_user_id(current_user)
            user_role = current_user.get("role")
            
            if user_role != UserRole.ADMIN.value:
                org_check = await db.execute(
                    select(UserOrganization).where(
                        UserOrganization.user_id == user_id_int,
                        UserOrganization.organization_id == org_id
                    )
                )
                if not org_check.scalars().first():
                    return Res.error("E-10013", message="Unauthorized: You do not have access to this asset's organization.", http_status_code=403)
                    
            parent_query = await db.execute(
                select(Comment).where(
                    Comment.asset_id == asset_id,
                    Comment.id == comment_id,
                    Comment.is_deleted == False,
                )
            )
            parent_comment = parent_query.scalars().first()
            
            if not parent_comment:
                return Res.error("E-10252", message="Comment not found.", http_status_code=404)
            
            content_validation = self._validate_content(payload.get("content", []), "Reply")
            if content_validation:
                return content_validation
            raw_tagged_user_ids = extract_tagged_users(payload.get("content", []))
            tagged_user_ids = []
            

            if raw_tagged_user_ids:
                valid_org_users_query = await db.execute(
                    select(UserOrganization.user_id).where(
                        UserOrganization.organization_id == org_id,
                        UserOrganization.user_id.in_(raw_tagged_user_ids)
                    )
                )
                valid_org_user_ids = valid_org_users_query.scalars().all()
                
                admin_users_query = await user_db.execute(
                    select(User.id).where(
                        User.id.in_(raw_tagged_user_ids),
                        User.role == UserRole.ADMIN.value,
                    )
                )
                admin_user_ids = admin_users_query.scalars().all()
                
                base_valid_user_ids = list(set(valid_org_user_ids + admin_user_ids))
                if base_valid_user_ids:
                    active_users_query = await user_db.execute(
                        select(User.id).where(
                            User.id.in_(base_valid_user_ids),
                            User.is_deleted == False,
                            User.status == True
                        )
                    )
                    base_valid_user_ids = active_users_query.scalars().all()
                
                if user_role == UserRole.ANALYST.value and base_valid_user_ids:
                    valid_role_query = await user_db.execute(
                        select(User.id).where(
                            User.id.in_(base_valid_user_ids),
                            User.role.in_([UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value])
                        )
                    )
                    valid_tagged_ids = valid_role_query.scalars().all()
                else:
                    valid_tagged_ids = base_valid_user_ids
                
                tagged_user_ids = [uid for uid in raw_tagged_user_ids if uid in valid_tagged_ids]
            
            # Get the current user
            current_user_id = self._get_user_id(current_user)
            current_user_name = current_user.get("name", "User")
            
            reply = Comment(
                asset_id=asset_id,
                owner_id=current_user_id,
                parent_comment_id=parent_comment.id,
                title=payload.get("title", f"Re: {parent_comment.title}") if payload.get("title") else f"Re: {parent_comment.title}",
                content=json.dumps(payload.get("content")),
                context_type=parent_comment.context_type,
                context_module=parent_comment.context_module,
                context_tab=parent_comment.context_tab,
                context_widget=parent_comment.context_widget,
                context_data_point=parent_comment.context_data_point,
                context_year=parent_comment.context_year,
                context_month=parent_comment.context_month,
                tagged_users=tagged_user_ids if tagged_user_ids else None,
                is_read=False,
                is_deleted=False,
            )
            
            db.add(reply)
            await db.flush()
            
            # ── Send notification to parent comment owner (if different from replier) ──
            clean_parent_title = parent_comment.title
            
            reply_preview = self._get_content_preview(payload.get("content", []))
            
            is_parent_owner_authorized = False
            if parent_comment.owner_id != current_user_id:
                parent_owner = await user_db.get(User, parent_comment.owner_id)
                if parent_owner and not parent_owner.is_deleted:
                    if parent_owner.role == UserRole.ADMIN.value:
                        is_parent_owner_authorized = True
                    elif parent_owner.role == UserRole.ANALYST.value:
                        if parent_comment.context_module == 'ExecutiveAnalysis':
                            is_parent_owner_authorized = False
                        else:
                            parent_org_check = await db.execute(
                                select(UserOrganization).where(
                                    UserOrganization.user_id == parent_comment.owner_id,
                                    UserOrganization.organization_id == org_id
                                )
                            )
                            if parent_org_check.scalars().first():
                                is_parent_owner_authorized = True
                    else:
                        parent_org_check = await db.execute(
                            select(UserOrganization).where(
                                UserOrganization.user_id == parent_comment.owner_id,
                                UserOrganization.organization_id == org_id
                            )
                        )
                        if parent_org_check.scalars().first():
                            is_parent_owner_authorized = True

            if parent_comment.owner_id != current_user_id and is_parent_owner_authorized:
                base_msg_parent = f"{current_user_name} replied to your comment on {clean_parent_title}."
                
                notification = Notification(
                    user_id=parent_comment.owner_id,
                    title="Replied to Your Comment",
                    message=base_msg_parent,
                    meta={
                        "comment_id": reply.comment_id,
                        "parent_comment_id": parent_comment.comment_id,
                        "asset_id": asset_id,
                        "context_type": parent_comment.context_type,
                        "context_module": parent_comment.context_module,
                        "context_tab": parent_comment.context_tab,
                        "context_widget": parent_comment.context_widget,
                        "context_data_point": parent_comment.context_data_point,
                        "context_year": parent_comment.context_year,
                        "context_month": parent_comment.context_month,
                    },
                    is_read=False,
                )
                db.add(notification)
                await db.flush()

                # ── Send push notification ──
                await self._send_push_notification(
                    user_id=parent_comment.owner_id,
                    notification_id=notification.notification_id,
                    notif_type="reply_to_comment",
                    actor_name=current_user_name,
                    title=parent_comment.title,
                    asset_id=asset_id,
                    module=parent_comment.context_module,
                    tab=parent_comment.context_tab,
                    year=parent_comment.context_year,
                    month=parent_comment.context_month,
                    comment_id=parent_comment.id,
                    context_type=parent_comment.context_type,
                    preview=self._get_content_preview(payload.get("content", [])),
                )

                # ── Send reply email to parent comment owner ──
                reply_to_comment_template = await template_utils.get_by_ref(user_db, 13)
                reply_preview = self._get_content_preview(payload.get("content", []))
                comment_url = self._generate_deep_link(asset_id, reply)
                asset = await db.get(Asset, asset_id)

                if parent_owner and parent_owner.email:
                    background_task.add_task(
                        self._send_reply_to_comment_email,
                        parent_owner.email,
                        parent_owner.name,
                        current_user_name,
                        parent_comment.title,
                        asset.name if asset else "",
                        parent_comment.context_module or "",
                        reply_preview,
                        comment_url,
                        reply_to_comment_template,
                    )
            
            # ── Create notifications for tagged users ──
            base_msg_tag = f"{current_user_name} mentioned you in a reply on {clean_parent_title}."
            
            for user_id in tagged_user_ids:
                if user_id != current_user_id:
                    notification = Notification(
                        user_id=user_id,
                        title="Mentioned You in Reply",
                        message=base_msg_tag,
                        meta={
                            "comment_id": reply.comment_id,
                            "parent_comment_id": parent_comment.comment_id,
                            "asset_id": asset_id,
                            "context_type": parent_comment.context_type,
                            "context_module": parent_comment.context_module,
                            "context_tab": parent_comment.context_tab,
                            "context_widget": parent_comment.context_widget,
                            "context_data_point": parent_comment.context_data_point,
                            "context_year": parent_comment.context_year,
                            "context_month": parent_comment.context_month,
                        },
                        is_read=False,
                    )
                    db.add(notification)
                    await db.flush()

                    await self._send_push_notification(
                        user_id=user_id,
                        notification_id=notification.notification_id,
                        notif_type="mention_reply",
                        actor_name=current_user_name,
                        title=parent_comment.title,
                        asset_id=asset_id,
                        module=parent_comment.context_module,
                        tab=parent_comment.context_tab,
                        year=parent_comment.context_year,
                        month=parent_comment.context_month,
                        comment_id=reply.id,
                        context_type=parent_comment.context_type,
                        preview=self._get_content_preview(payload.get("content", [])),
                    )

            # ── Send mention emails to tagged users ──
            if tagged_user_ids:
                reply_mention_template = await template_utils.get_by_ref(user_db, 12)
                reply_preview_mention = self._get_content_preview(payload.get("content", []))
                comment_url_mention = self._generate_deep_link(asset_id, reply)
                asset = await db.get(Asset, asset_id)

                for user_id in tagged_user_ids:
                    if user_id != current_user_id:
                        tagged_user = await user_db.get(User, user_id)
                        if tagged_user and tagged_user.email:
                            background_task.add_task(
                                self._send_reply_mention_email,
                                tagged_user.email,
                                tagged_user.name,
                                current_user_name,
                                parent_comment.title,
                                asset.name if asset else "",
                                parent_comment.context_module or "",
                                reply_preview_mention,
                                comment_url_mention,
                                reply_mention_template,
                            )
                    
            await db.commit()
            
            owner = await user_db.get(User, current_user_id)
            
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module_for_comment(parent_comment.context_module),
                action=AuditLogScenario.REPLIED_TO_COMMENT.value,
                before={
                    "Reply Title": "Not Available",
                    "Reply Content": "Not Available"
                },
                after={
                    "Reply Title": reply.title,
                    "Reply Content": reply.content,
                    "Parent Comment": parent_comment.title
                },
                resource_id=f"COM-{reply.id}_(Asset ID: {asset_id})",
            )
            await db.commit()
            
            return Res.success(
                "S-10103",
                data={
                    "id": reply.id,
                    "comment_id": reply.comment_id,
                    "title": reply.title,
                    "content": await self._format_content_for_response(user_db, json.loads(reply.content)),
                    "owner": {
                        "id": owner.id if owner else current_user_id,
                        "name": owner.name if owner else current_user_name
                    },
                    "created_at": reply.created_at.isoformat() if reply.created_at else None,
                    "updated_at": None,
                    "message": "Reply posted successfully."
                }
            )
            
        except Exception:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10001")


    async def mark_comment_read(
        self,
        db: AsyncSession,
        asset_id: int,
        comment_id: int,
        current_user: dict,
    ):
        try:
            query = await db.execute(
                select(Comment).where(
                    Comment.asset_id == asset_id,
                    Comment.id == comment_id,
                    Comment.is_deleted == False,
                )
            )
            comment = query.scalars().first()

            if not comment:
                return Res.error("E-10252", message="Comment not found.", http_status_code=404)

            user_id_int = self._get_user_id(current_user)
            read_by = comment.read_by or []

            if user_id_int not in read_by:
                new_read_by = list(read_by)
                new_read_by.append(user_id_int)
                comment.read_by = new_read_by
                await db.commit()

            return Res.success(
                "S-10107",
                data={
                    "comment_id": comment.id,
                    "read_by": comment.read_by,
                }
            )

        except Exception:
            traceback.print_exc()
            await db.rollback()

    async def get_taggable_users(
        self,
        db: AsyncSession,
        user_db: AsyncSession,
        asset_id: int,
        current_user: dict,
        context_module: Optional[str] = None,
        search: Optional[str] = None,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", message="Asset not found.", http_status_code=404)
                
            org_id = asset.organization_id
            user_id_int = self._get_user_id(current_user)
            user_role = current_user.get("role")
            
            # Admins have global access. Analysts and Managers must belong to the asset's organization.
            if user_role != UserRole.ADMIN.value:
                org_check = await db.execute(
                    select(UserOrganization).where(
                        UserOrganization.user_id == user_id_int,
                        UserOrganization.organization_id == org_id
                    )
                )
                if not org_check.scalars().first():
                    return Res.error("E-10013", message="Unauthorized: You do not have access to this asset's organization.", http_status_code=403)
                    
            # Fetch all user IDs in this organization
            org_users_query = await db.execute(
                select(UserOrganization.user_id).where(UserOrganization.organization_id == org_id)
            )
            org_user_ids = org_users_query.scalars().all()
            
            if not org_user_ids:
                org_user_ids = []
                
            # Query the User table for org users OR any Admin system-wide
            user_query = select(User).where(
                or_(User.id.in_(org_user_ids), User.role == UserRole.ADMIN.value), 
                User.is_deleted == False,
                User.status == True
            )
            
            if user_role == UserRole.ANALYST.value:
                user_query = user_query.where(
                    User.role.in_([UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value])
                )
                
            # Module-specific role restrictions for taggability
            if context_module == 'ExecutiveAnalysis':
                user_query = user_query.where(User.role != UserRole.ANALYST.value)
                
            if search:
                user_query = user_query.where(
                    User.name.ilike(f"%{search}%")
                )
                
            user_result = await user_db.execute(user_query)
            users = user_result.scalars().all()
            
            data = []
            for user in users:
                if not user.platform or Platform.AMD.value not in user.platform:
                    continue
                data.append({
                    "id": user.id,
                    "user_id": user.user_id,
                    "name": user.name,
                    "email": user.email,
                    "role": user.role,
                })
                
            return Res.success("S-10005", data={"users": data})
            
        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def get_comment_status(
        self,
        db: AsyncSession,
        asset_id: int,
        comment_id: int,
        current_user: dict,
    ):
        try:
            query = await db.execute(
                select(Comment).where(
                    Comment.id == comment_id,
                    Comment.asset_id == asset_id,
                )
            )
            comment = query.scalars().first()

            # Comment doesn't exist at all — treat as deleted parent
            if not comment:
                return Res.success(
                    "S-10100",
                    data={
                        "is_deleted": True,
                        "type": "parent",
                        "parent_id": None,
                        "deleted_comment_id": comment_id,
                        "deleted_at": None,
                    },
                )

            # Comment exists and is not deleted — active
            if not comment.is_deleted:
                return Res.success(
                    "S-10100",
                    data={
                        "is_deleted": False,
                        "type": None,
                        "parent_id": None,
                        "deleted_comment_id": None,
                        "deleted_at": None,
                    },
                )

            # Comment is soft-deleted — determine if it was a parent or reply
            deleted_at = comment.updated_at.isoformat() if comment.updated_at else (
                comment.created_at.isoformat() if comment.created_at else None
            )

            if comment.parent_comment_id is None:
                # Top-level comment (parent)
                return Res.success(
                    "S-10100",
                    data={
                        "is_deleted": True,
                        "type": "parent",
                        "parent_id": None,
                        "deleted_comment_id": comment.id,
                        "deleted_at": deleted_at,
                    },
                )
            else:
                # Reply to a parent comment
                return Res.success(
                    "S-10100",
                    data={
                        "is_deleted": True,
                        "type": "reply",
                        "parent_id": comment.parent_comment_id,
                        "deleted_comment_id": comment.id,
                        "deleted_at": deleted_at,
                    },
                )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")
