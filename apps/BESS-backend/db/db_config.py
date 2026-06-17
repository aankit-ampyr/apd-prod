from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from config import (
    DB_POOL_SIZE,
    DB_MAX_OVERFLOW,
    DB_POOL_PRE_PING,
    DB_POOL_RECYCLE,
    DB_POOL_TIMEOUT,
    USER_DATABASE_URL,
    BESS_DATABASE_URL,
)


def create_engine(url: str):
    connect_args = {
        "server_settings": {
            # asyncpg requires Dict[str, str] - all values must be strings
            "tcp_keepalives_idle": "60",  # Send keepalive after 1 minute of inactivity
            "tcp_keepalives_interval": "30",  # Send keepalive every 30 seconds
            "tcp_keepalives_count": "3",  # Allow 3 failed keepalives before considering connection dead
        }
    }
    return create_async_engine(
        url,
        pool_size=DB_POOL_SIZE,
        max_overflow=DB_MAX_OVERFLOW,
        pool_pre_ping=DB_POOL_PRE_PING,
        pool_recycle=DB_POOL_RECYCLE,
        pool_timeout=DB_POOL_TIMEOUT,
        pool_reset_on_return="commit",
        echo=False,
        connect_args=connect_args,
    )


user_engine = create_engine(USER_DATABASE_URL)
bess_engine = create_engine(BESS_DATABASE_URL)

UserSessionLocal = async_sessionmaker(user_engine, expire_on_commit=False)

BessSessionLocal = async_sessionmaker(bess_engine, expire_on_commit=False)

UserBase = declarative_base()
BessBase = declarative_base()
