# middleware/client_info.py

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from user_agents import parse
import logging
import traceback
from python_common.utils.response_utils import Res
logger = logging.getLogger(__name__)

class ClientInfoMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request.state.client_info = {}
        try:
            # =================== IP Address ==========================================
            x_forwarded_for = request.headers.get("X-Forwarded-For")
            ip = x_forwarded_for.split(",")[-1].strip() if x_forwarded_for else request.headers.get("X-Real-IP", request.client.host)
            request.state.client_info["ip_address"] = ip

            # =================== User Agent ==========================================
            user_agent = request.headers.get("User-Agent", "")
            request.state.client_info["user_agent"] = user_agent

            # ==================== Metadata ==========================================
            ua = parse(user_agent)
            request.state.client_info["user_metadata"] = {
                "browser": ua.browser.family,
                "browser_version": ua.browser.version_string,
                "os": ua.os.family,
                "os_version": ua.os.version_string,
                "device": ua.device.family,
                "is_mobile": ua.is_mobile,
                "is_tablet": ua.is_tablet,
                "is_pc": ua.is_pc,
            }

            logger.info(f"Request from IP: {ip}, User-Agent: {user_agent}")

            return await call_next(request)
        except Exception as e:
            traceback.print_exc()
            logger.error("Error capturing client info", exc_info=True)
            return Res.error("E-20001")
