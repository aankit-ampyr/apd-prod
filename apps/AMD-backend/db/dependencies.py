import logging
from .db_config import SessionLocal, UserSessionLocal
from exceptions import UserNotAuthorized
from redis.asyncio import Redis, from_url
from config import REDIS_URL
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends, HTTPException, Request
from models.asset import Asset
from models.organization_model import UserOrganization
from models.user_model import User
from constants.enums import UserRole


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

redis_client = from_url(REDIS_URL, decode_responses=True)

async def get_redis() -> Redis:
    try:
        yield redis_client
    except Exception as e:
        logger.error(f"Redis connection error: {e}")
        raise


async def get_db():
    logger.info("fetching Async database session..")
    async with SessionLocal() as db:
        try:
            logger.info("Async database session fetched")
            yield db
        except Exception as e:
            logger.error(f"Async database session error: {e}")
            await db.rollback()
            raise
        finally:
            logger.info("Async database session closed")

async def get_user_db():
    logger.info("fetching User Management database session..")
    async with UserSessionLocal() as db:
        try:
            logger.info("User Management database session fetched")
            yield db
        except Exception as e:
            logger.error(f"User Management database session error: {e}")
            await db.rollback()
            raise
        finally:
            logger.info("User Management database session closed")


def allowed_roles(*allowed_roles: int):

    def dependency(request: Request):

            

        user = request.state.user
        if not user:
            raise UserNotAuthorized("User not authenticated")
        
        # by default allow all
        if len(allowed_roles) == 0:
            return user

        user_role = int(user.get("role"))
        if not user_role:
            raise UserNotAuthorized("User role not found")
        
        if allowed_roles and user_role not in allowed_roles:
            raise UserNotAuthorized("Unauthorized access")

        return user
    

    return dependency

async def verify_asset_access(
    asset_id: int,
    db: AsyncSession = Depends(get_db),
    user_db: AsyncSession = Depends(get_user_db),
    current_user: dict = Depends(allowed_roles()),
) -> Asset:
    """
    Dependency to verify that the current user has access to the asset.
    Raises 403 if access is denied.
    Returns the Asset object if access is granted.
    """
    user_id = current_user.get("id")
    user_role = current_user.get("role")
    
    # Fetch asset
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Admin has global access
    if user_role == UserRole.ADMIN.value:
        return asset
    
    # Check if user belongs to the asset's organization
    org_check = await db.execute(
        select(UserOrganization).where(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == asset.organization_id
        )
    )
    if not org_check.scalars().first():
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this asset's organization"
        )
    
    # Check if user is active
    user = await user_db.get(User, user_id)
    if user and user.is_deleted:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive"
        )
    
    return asset