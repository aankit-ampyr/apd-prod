from fastapi import Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from db.dependencies import get_db,get_user_db,allowed_roles
from context.dependencies import get_redis_conn
from redis.asyncio import Redis
from services.digest_service import DigestService
from dtos.digest_dto import DigestCreateRequest, DigestUpdateRequest
from constants.enums import UserRole
from fastapi import BackgroundTasks

class DigestController:
    def __init__(self):
        self.service = DigestService()

    async def get_digests(self, 
        page: int = Query(1), 
        limit: int = Query(10),
        scope: int | None = Query(None),
        frequency: int | None = Query(None),
        status: bool | None = Query(None),
        search: str  | None = Query(None), 

        db: AsyncSession = Depends(get_db),
        user_db: AsyncSession = Depends(get_user_db),
        current_user = Depends(allowed_roles(UserRole.ADMIN.value))
    ):
        return await self.service.get_list(
            db,
            user_db,
            page,
            limit,
            current_user,
            search,
            scope,
            frequency,
            status,
        )


    async def create_digest(self, 
        body: DigestCreateRequest, 
        background_tasks: BackgroundTasks,
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        return await self.service.create(db, redis, current_user, body, background_tasks)

    async def update_digest(self, 
        digest_id: int, 
        body: DigestUpdateRequest, 
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user = Depends(allowed_roles(UserRole.ADMIN.value))
    ):
        return await self.service.update_digest(db, redis, current_user, digest_id, body)