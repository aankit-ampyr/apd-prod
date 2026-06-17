from zoneinfo import ZoneInfo

# JWT
JWT_ALGORITHM = "HS256"
JWT_EXPIRY = 60 * 60 * 8760  # 1 hour

# Ephemeral WebSocket token expiry in seconds
EPHEMERAL_WS_TOKEN_EXPIRY = 60 * 60 * 8760 # 1 minute

CONSTRAINT_NAMES = {
    "UNIQUE_USER_EMAIL_CONSTRAINT": "uq_users_email",
}

LOCAL_TZ = ZoneInfo("Asia/Kolkata")  # ya dynamic later
DUMMY_OTP = "000000"

