from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from config import (
    DB_POOL_SIZE, DB_MAX_OVERFLOW, DB_POOL_PRE_PING,
    DB_POOL_RECYCLE, DB_POOL_TIMEOUT,
    USER_DATABASE_URL, BESS_DATABASE_URL, AMD_DATABASE_URL
)

def create_engine_with_pooling(db_url):
    connect_args = {
        "server_settings": {
            "tcp_keepalives_idle": '60',  # Send keepalive after 1 minute of inactivity
            "tcp_keepalives_interval": '30',  # Send keepalive every 30 seconds
            "tcp_keepalives_count": '3'  # Allow 3 failed keepalives before considering connection dead
        }
    }
    return create_async_engine(
        db_url,
        pool_size=DB_POOL_SIZE,
        max_overflow=DB_MAX_OVERFLOW,
        pool_pre_ping=DB_POOL_PRE_PING,
        pool_recycle=DB_POOL_RECYCLE,
        pool_timeout=DB_POOL_TIMEOUT,
        pool_reset_on_return='commit',  # Reset connections on return to prevent stale state
        echo=False,  # Set to True for SQL query logging
        connect_args=connect_args
    )


engine_user = create_engine_with_pooling(USER_DATABASE_URL)
SessionUser = async_sessionmaker(autocommit=False, autoflush=False, bind=engine_user)


engine_bess = create_engine_with_pooling(BESS_DATABASE_URL)
SessionBESS = async_sessionmaker(autocommit=False, autoflush=False, bind=engine_bess)


engine_amd = create_engine_with_pooling(AMD_DATABASE_URL)
SessionAMD = async_sessionmaker(autocommit=False, autoflush=False, bind=engine_amd)

BaseUser = declarative_base()
BaseBESS = declarative_base()
BaseAMD = declarative_base()