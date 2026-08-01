from python_common.exceptions.auth_exception import InvalidPlatformAccess
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from utils.response_utils import Res
import traceback
import logging

from exceptions import (
    PermissionDenied,
    UserSessionExpired,
    UserNotAuthorized,
    UserNotFound,
    UserDeleted,
    UserTokenExpired,
    UserNotAuthenticated,
    UserAccountBlocked,
    ProjectDeleted,
    SimulationNotFound,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ExceptionHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)

        except InvalidPlatformAccess:
            return Res.error("E-10011", message="You are not authorized to access this platform.", http_status_code=403)
        
        except UserNotAuthenticated:
            return Res.error("E-20064", http_status_code=401)
        except UserTokenExpired:
            logger.info(
                "User token expired",
                extra={"error_code": "E-20002", "path": request.url.path},
            )
            return Res.error("E-20002", message="User token expired", http_status_code=401)
        except UserSessionExpired:
            return Res.error("E-20002", http_status_code=401)
        except UserNotAuthorized:
            return Res.error("E-20003", http_status_code=403)
        except UserNotFound:
            return Res.error("E-20000", http_status_code=404)
        except UserDeleted:
            return Res.error("E-20000", http_status_code=404)
        except UserAccountBlocked as e:
            return Res.error("E-20037")
        except ProjectDeleted as e:
            return Res.error("E-20015", message=str(e), http_status_code=404)
        except SimulationNotFound as e:
            return Res.error("E-20043", message=str(e), http_status_code=404)
        except PermissionDenied as e:
            return Res.error(
                status_code="E-20004", message=str(e), http_status_code=403
            )
        except Exception as e:
            traceback.print_exc()
            return Res.error(message=str(e))
