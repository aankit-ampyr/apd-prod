# ── services/notification_service.py ──

import traceback
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.comment_model import Comment, Notification
from python_common.utils.response_utils import Res
from models.asset import Asset
from models import UserOrganization
from constants.enums import UserRole

class NotificationService:
    def _get_user_id(self, current_user: dict):
        return current_user.get("id") or current_user.get("user_id")

    async def get_active_notifications(
        self,
        db: AsyncSession,
        current_user: dict,
    ):
        try:
            query = select(Notification).where(
                Notification.user_id == self._get_user_id(current_user),
                Notification.is_read.is_(False),
            ).order_by(Notification.created_at.desc()).limit(5)

            result = await db.execute(query)
            notifs = result.scalars().all()

            if notifs:
                notif_ids = [n.id for n in notifs]
                from sqlalchemy import update
                update_query = update(Notification).where(
                    Notification.user_id == self._get_user_id(current_user),
                    Notification.is_read.is_(False),
                    Notification.id.notin_(notif_ids)
                ).values(is_read=True, updated_at=datetime.now(timezone.utc))
                await db.execute(update_query)
                await db.commit()

            if not notifs:
                return Res.success("S-10104", data=[])
                
            data = []
            unauthorized_notif_ids = []
            for notif in notifs:
                # Fetch the linked comment to get context fields
                comment_id = notif.meta.get("comment_id") if notif.meta else None
                linked_comment = None
                if comment_id:
                    if isinstance(comment_id, str) and comment_id.startswith("COM"):
                        comment_query = await db.execute(
                            select(Comment).where(
                                Comment.comment_id == comment_id,
                                Comment.is_deleted == False,
                            )
                        )
                    else:
                        comment_query = await db.execute(
                            select(Comment).where(
                                Comment.id == int(comment_id),
                                Comment.is_deleted == False,
                            )
                        )
                    linked_comment = comment_query.scalars().first()

                # Build meta with all required fields
                meta_data = {
                    "comment_id": notif.meta.get("comment_id") if notif.meta else None,
                }

                # Add context fields from linked comment if available
                if linked_comment:
                    meta_data.update({
                        "comment_id": linked_comment.id,
                        "asset_id": linked_comment.asset_id,
                        "context_module": linked_comment.context_module,
                        "context_tab": linked_comment.context_tab,
                        "context_type": linked_comment.context_type,
                        "context_widget": linked_comment.context_widget,
                        "context_data_point": linked_comment.context_data_point,
                        "context_year": linked_comment.context_year,
                        "context_month": linked_comment.context_month,
                    })
                else:
                    # Fallback to meta if comment not found
                    if notif.meta:
                        meta_data.update({
                            "asset_id": notif.meta.get("asset_id"),
                            "context_module": notif.meta.get("context_module"),
                            "context_tab": notif.meta.get("context_tab"),
                            "context_type": notif.meta.get("context_type"),
                            "context_widget": notif.meta.get("context_widget"),
                            "context_data_point": notif.meta.get("context_data_point"),
                            "context_year": notif.meta.get("context_year"),
                            "context_month": notif.meta.get("context_month"),
                        })

                # Check organization access
                asset_id = meta_data.get("asset_id")
                has_access = True
                
                if asset_id and current_user.get("role") != UserRole.ADMIN.value:
                    asset = await db.get(Asset, int(asset_id))
                    if asset:
                        org_check = await db.execute(
                            select(UserOrganization).where(
                                UserOrganization.user_id == self._get_user_id(current_user),
                                UserOrganization.organization_id == asset.organization_id
                            )
                        )
                        if not org_check.scalars().first():
                            has_access = False
                            
                if not has_access:
                    unauthorized_notif_ids.append(notif.id)
                    continue

                data.append({
                    "id": notif.id,
                    "notification_id": notif.notification_id,
                    "owner": {
                        "id": self._get_user_id(current_user),
                        "name": current_user.get("name", "Unknown")
                    },
                    "title": notif.title,
                    "message": notif.message,
                    "is_read": notif.is_read,
                    "created_at": notif.created_at.isoformat() if notif.created_at else None,
                    "meta": meta_data
                })

            if unauthorized_notif_ids:
                from sqlalchemy import update
                update_query = update(Notification).where(
                    Notification.id.in_(unauthorized_notif_ids)
                ).values(is_read=True, updated_at=datetime.now(timezone.utc))
                await db.execute(update_query)
                await db.commit()

            return Res.success("S-10104", data=data)

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def mark_notification_read(
        self,
        db: AsyncSession,
        notification_id: str,
        current_user: dict,
    ):
        try:
            if isinstance(notification_id, str) and notification_id.startswith("NOT"):
                query = await db.execute(
                    select(Notification).where(
                        Notification.notification_id == notification_id,
                        Notification.user_id == self._get_user_id(current_user),
                    )
                )
            else:
                query = await db.execute(
                    select(Notification).where(
                        Notification.id == int(notification_id),
                        Notification.user_id == self._get_user_id(current_user),
                    )
                )
            notification = query.scalars().first()
            
            if not notification:
                return Res.error("E-10272", message="Notification not found.", http_status_code=404)
            
            notification.is_read = True
            notification.updated_at = datetime.now(timezone.utc)
            await db.commit()
            
            return Res.success(
                "S-10105",
                data={
                    "notification_id": notification.id,
                    "is_read": True,
                }
            )
            
        except Exception:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10001")
