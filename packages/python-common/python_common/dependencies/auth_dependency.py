from typing import Optional
from fastapi import Request
from python_common.constants.defaults import REFRESH_TOKEN_NAME


async def get_refresh_token(request: Request) -> Optional[str]:
    return request.cookies.get(REFRESH_TOKEN_NAME)
