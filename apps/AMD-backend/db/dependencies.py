import logging
from .db_config import SessionLocal, UserSessionLocal
from fastapi import Request
from exceptions import UserNotAuthorized

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        
        # be default allow all
        if len(allowed_roles) == 0:
            return user

        user_role = int(user.get("role"))
        if not user_role:
            raise UserNotAuthorized("User role not found")
        
        if allowed_roles and user_role not in allowed_roles:
            raise UserNotAuthorized("Unauthorized access")

        return user
    

    return dependency