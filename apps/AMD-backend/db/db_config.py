from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from config import (
    DB_POOL_SIZE, DB_MAX_OVERFLOW, DB_POOL_PRE_PING,
    DB_POOL_RECYCLE, DB_POOL_TIMEOUT,
    DATABASE_URL, USER_MGMT_DATABASE_URL
)

def create_engine_pooling(database_url):
    connect_args = {
        "server_settings": {
            # "connect_timeout": 10,
            "tcp_keepalives_idle": '60',  # Send keepalive after 1 minute of inactivity
            "tcp_keepalives_interval": '30',  # Send keepalive every 30 seconds
            "tcp_keepalives_count": '3'  # Allow 3 failed keepalives before considering connection dead
        }
    }

    return create_async_engine(
        database_url,
        pool_size=DB_POOL_SIZE,
        max_overflow=DB_MAX_OVERFLOW,
        pool_pre_ping=DB_POOL_PRE_PING,
        pool_recycle=DB_POOL_RECYCLE,
        pool_timeout=DB_POOL_TIMEOUT,
        pool_reset_on_return='commit',  # Reset connections on return to prevent stale state
        echo=False,
        connect_args=connect_args
    )

engine = create_engine_pooling(DATABASE_URL)
user_engine = create_engine_pooling(USER_MGMT_DATABASE_URL)

SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
UserSessionLocal = async_sessionmaker(bind=user_engine, expire_on_commit=False)

UserBase = declarative_base()
AMDBase = declarative_base()