from python_common.exceptions.auth_exception import InvalidPlatformAccess
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from utils.response_utils import Res
import traceback
import logging
from config import DEBUG
from exceptions import (
    UserSessionExpired,
    UserNotAuthorized,
    UserNotFound,
    UserDeleted,
    UserNotAuthenticated,
    UserTokenExpired,
    UserAccountBlocked,
    PayloadValidation,
    ExceptionWithErrorCode
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ExceptionHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)

        except UserNotAuthenticated as e:
            logger.info(
                f"User authentication failed",
                extra={"error_code": "E-10011", "path": request.url.path},
            )
            return Res.error("E-10011", http_status_code=401)

        
        except InvalidPlatformAccess:
            return Res.error("E-10273", message="You are not authorized to access this platform.", http_status_code=403)
        
        except PayloadValidation as e:
            return Res.error(e.status_code, http_status_code=400)
        
        except UserTokenExpired as e:
            logger.info("User token expired",
            extra={"error_code": "E-10012", "path": request.url.path},
            )
            return Res.error("E-10012", http_status_code=401)
        except UserSessionExpired as e:
            logger.info(
                f"User session expired",
                extra={"error_code": "E-10012", "path": request.url.path},
            )
            return Res.error("E-10012", http_status_code=401)

        except UserNotAuthorized as e:
            logger.info(
                f"User not authorized",
                extra={"error_code": "E-10013", "path": request.url.path},
            )
            return Res.error("E-10013", http_status_code=403)

        except UserNotFound as e:
            logger.info(
                f"User not found",
                extra={"error_code": "E-10027", "path": request.url.path},
            )
            return Res.error("E-10027", http_status_code=404)
        except UserDeleted as e:
            logger.info(
                f"User account deleted",
                extra={"error_code": "E-10027", "path": request.url.path},
            )
            return Res.error("E-10027", http_status_code=404)
        
        except UserAccountBlocked as e:
            logger.info(
                f"User account blocked",
                extra={"error_code": "E-10110", "path": request.url.path},
            )
            return Res.error('E-10110', http_status_code=403)
    
        except ExceptionWithErrorCode as e:
            logger.info(
                e.message,
                extra={"error_code": e.error_code, "path": request.url.path},
            )
            return Res.error(status_code=e.error_code, message=e.message, http_status_code=400)

        except Exception as e:
            # for test environment, we want to see the full traceback in the logs, but in production, we only log the error message and a generic error code
            if DEBUG:
                traceback.print_exc()
            else:
                logger.error(
                    f"Unhandled exception in request handling: {str(e)}",
                    extra={"error_code": "E-10001", "path": request.url.path},
                )
            return Res.error(message=str(e), http_status_code=500)
