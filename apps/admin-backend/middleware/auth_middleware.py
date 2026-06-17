from python_common.middleware.auth_middleware import BaseAuthMiddleware
# Reuse the common AuthMiddleware with our specific User model and session factory
from db.db_config import SessionUser
from models import User

class AuthMiddleware(BaseAuthMiddleware):
    def __init__(self, app, public_endpoints=None):
        super().__init__(
            app,
            session_factory=SessionUser,
            user_model=User,
            public_endpoints=public_endpoints
        )