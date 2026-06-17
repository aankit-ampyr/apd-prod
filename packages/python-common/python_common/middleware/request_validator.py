from fastapi import Request
from fastapi.exceptions import RequestValidationError
from datetime import datetime, timezone
from python_common.utils.response_utils import Res

async def ValidationExceptionHandler(request: Request, exc: RequestValidationError):
    """
    More detailed error response with additional context
    """
    errors = []
    
    for error in exc.errors():
        field_path = ".".join(str(loc) for loc in error["loc"][1:])  # Skip 'body'
        
        errors.append({
            "field": field_path or error["loc"][0],
            "location": error["loc"][0],  # 'body', 'query', 'path'
            "message": error["msg"],
            "error_type": error["type"],
        })
    return Res.error(
        'E-10061',
        http_status_code=422,
        content={
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "Validation Failed",
            "errors": errors,
            "total_errors": len(errors)
        }
    
    )