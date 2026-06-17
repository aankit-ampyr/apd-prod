from datetime import datetime, time, timedelta, timezone
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from constants.defaults import JWT_ALGORITHM, JWT_EXPIRY, EPHEMERAL_WS_TOKEN_EXPIRY
from config import JWT_SECRET

def _build_user_payload(
    email: str,
    user_id: int,
    name: str,
    role: str,
    platform: int,
    expiry_seconds: int,
) -> Dict[str, Any]:

    now = datetime.now(timezone.utc)

    return {
        "sub": email,
        "id": user_id,
        "name": name,
        "role": role,
        "platform": platform,
        "iat": now,
        "platform": platform,
        "exp": now + timedelta(seconds=expiry_seconds),
    }


def create_access_token(
    email: str,
    user_id: int,
    name: str,
    role: str,
    platform: int,
    expires_delta: Optional[timedelta] = None,
) -> str:

    expiry_seconds = (
        int(expires_delta.total_seconds())
        if expires_delta
        else JWT_EXPIRY
    )

    payload = _build_user_payload(
        email=email,
        user_id=user_id,
        name=name,
        role=role,
        platform=platform,
        expiry_seconds=expiry_seconds,
    )

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return token


def create_refresh_token(
    email: str,
    user_id: int,
    name: str,
    role: str,
    platform: int,
    expires_delta: Optional[timedelta] = None,
) -> str:

    expiry_seconds = (
        int(expires_delta.total_seconds())
        if expires_delta
        else JWT_EXPIRY
    )

    payload = _build_user_payload(
        email=email,
        user_id=user_id,
        name=name,
        role=role,
        platform=platform,
        expiry_seconds=expiry_seconds,
    )

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return token


def decode_token(token: str) -> Dict[str, Any]:

    payload = jwt.decode(
        token,
        JWT_SECRET,
        algorithms=[JWT_ALGORITHM],
    )

    return payload


def verify_token(token: str) -> Dict[str, Any]:

    try:

        payload = decode_token(token)

        return payload

    except JWTError as e:
        raise e


def create_ephemeral_ws_token(current_user: Dict[str, Any]) -> str:

    now = datetime.now(timezone.utc)

    payload = {
        "sub": current_user.get("email"),
        "id": current_user.get("id"),
        "name": current_user.get("name"),
        "role": current_user.get("role"),
        "platform": current_user.get("platform"),
        "iat": now,
        "exp": now + timedelta(seconds=EPHEMERAL_WS_TOKEN_EXPIRY),
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return token


def verify_ephemeral_ws_token(token: str) -> Optional[Dict[str, Any]]:
    try:

        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"require_exp": True},
            leeway=10,
        )
        return payload

    except JWTError:
        return None