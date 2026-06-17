from enum import IntEnum
from enum import Enum

class BaseEnum(IntEnum):
    @classmethod
    def choices(cls):
        return [(e.value, e.name.replace('_', ' ').title()) for e in cls]
    
class UserRole(BaseEnum):
    ANALYST = 1
    ADMIN = 2
    MANAGER = 3
    SUPER_ADMIN = 4
    VIEWER=5

class Platform(BaseEnum):
    AMD = 1
    BESS = 2

class AuditLogScenario(Enum):
    # 1. Authentication & Session
    OTP_SENT = 1
    OTP_VERIFY_FAILED = 2
    OTP_VERIFY_SUCCESS = 3
    LOGIN_SUCCESS = 4
    LOGIN_FAILED = 5
    UNAUTHORIZED_ATTEMPT = 6
    SESSION_STARTED = 7
    SESSION_IDLE_TIMEOUT = 8
    SESSION_ABS_TIMEOUT = 9
    LOGOUT = 10

    # 2. User Management
    ORG_ASSIGNED = 11
    ORG_REASSIGNED = 12

    # 3. Organization Management
    ORG_CREATED = 13
    ORG_EDITED = 14
    ORG_INACTIVATED = 15
    ORG_ENABLED = 16
    ORG_UPDATED = 17

    # 4. Asset Management
    ASSET_REASSIGNED = 18

    # 5. Digest Management
    DIGEST_CREATED = 19
    DIGEST_UPDATED = 20
    DIGEST_ACTIVATED = 21
    DIGEST_DEACTIVATED = 22
    RECIPIENTS_UPDATED = 23

    # 6. Project Management
    PROJECT_REASSIGNED = 24
    PROJECT_VIEWED = 25
