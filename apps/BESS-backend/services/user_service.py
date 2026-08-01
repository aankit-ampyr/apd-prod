from datetime import datetime, time
from math import ceil
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from constants.enums import Order, Platform, UserRole
from dtos.user_dto import UserSearch
from utils.response_utils import Res
from models import User
from dtos import UserResponse
from python_common.utils import paginate
from fastapi import status


class UserService:
    async def get_users(self, db: AsyncSession, params: UserSearch, current_user: dict):
        conditions = []

        filter_applied = False
        if params.search:
            # Search in both name and email ignoring case
            conditions.append(
                or_(
                    User.name.ilike(f"%{params.search}%"),
                    User.email.ilike(f"%{params.search}%"),
                    User.user_id.ilike(f"%{params.search}%"),
                )
            )
            filter_applied = True

        if params.role is not None:
            conditions.append(User.role == params.role)
            filter_applied = True

        if params.status is not None:
            conditions.append(User.status == params.status)
            filter_applied = True

        if params.start_date:
            try:
                conditions.append(User.last_activity >= params.start_date)
                filter_applied = True
            except ValueError:
                # TODO: The error code need's to be changed.
                return Res.error(status_code="E-20006", message="Invalid date format", http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT)

        if params.end_date:
            try:
                # Include the entire final day (up to 23:59:59)
                end_of_day = datetime.combine(params.end_date, time(23, 59, 59))
                conditions.append(User.last_activity <= end_of_day)
                filter_applied = True
            except ValueError:
                # TODO: The error code need's to be changed.
                return Res.error(status_code="E-20006", message="Invalid date format", http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT)

        
        data_query = select(User).where(
            User.is_deleted.is_(False),
            User.platform.overlap([Platform.BESS]),
            User.role != UserRole.SUPER_ADMIN,
            User.id != int(current_user.get("id")),
        )

        # apply additional filters if any
        if conditions:
            filter_applied = True
            data_query = data_query.where(*conditions)


        # sorting is not counted as a filter, so it should not trigger the "Invalid filter criteria" error when no other filters are applied. It should only affect the order of results when filters are applied.
        if params.sort == Order.ASCENDING:
            data_query = data_query.order_by(User.last_activity.asc(), User.id.desc())
        elif params.sort == Order.DESCENDING:
            data_query = data_query.order_by(User.last_activity.desc(), User.id.desc())
        else:
            data_query = data_query.order_by(User.id.desc())

        #  calculate data with pagination metadata structure
        pagination_result = await paginate(
            db=db,
            base_query=data_query,
            page=params.page,
            limit=params.limit,
        )
        total_results = pagination_result.total_results
        total_pages = pagination_result.total_pages
        page = pagination_result.current_page
        next_page = pagination_result.next_page
        users = pagination_result.records

        if total_results == 0:
            if filter_applied:
                return Res.error('E-20006', message="No data found", http_status_code=status.HTTP_404_NOT_FOUND)
            return Res.error('E-20005', message="No records match applied filters", http_status_code=status.HTTP_404_NOT_FOUND)

        data = {
            "users": [
                UserResponse(
                    id=user.id,
                    user_id=user.user_id,
                    name=user.name,
                    email=user.email,
                    last_activity=user.last_activity,
                    role=user.role,
                    platform=user.platform,
                    status=user.is_active,
                ).model_dump(mode="json")
                for user in users
            ],
            "total_pages": total_pages,
            "current_page": page,
            "next_page": next_page,
            "total_results": total_results,
        }

        return Res.success("S-20001", data=data)
