from fastapi.responses import JSONResponse
from .encryption_utils import EncryptionUtils
from python_common.config import ENCRYPT
import json


class Res:
    # HTTP Responses
    @staticmethod
    def error(
        status_code: str = "E-10001",
        message: str = "",
        data=None,
        http_status_code: int = 500,
        **kwargs,
    ):
        res_data = {"status": "error", "status_code": status_code, **kwargs}
        if message:
            res_data["message"] = message
        if data is not None:
            res_data["data"] = data

        if ENCRYPT:
            res_data = EncryptionUtils.encrypt(res_data)
        return JSONResponse(content=res_data, status_code=http_status_code)

    @staticmethod
    def success(
        status_code: str = "S-10001",
        message: str = "",
        data: any = None,
        http_status_code: int = 200,
        http_response_header: dict = {
            "Content-Type": "application/json"
        },
        **kwargs,
    ):
        res_data = {"status": "success", "status_code": status_code, **kwargs}

        if message:
            res_data["message"] = message
        if data is not None:
            res_data["data"] = data

        if ENCRYPT:
            res_data = EncryptionUtils.encrypt(res_data)
        return JSONResponse(content=res_data, status_code=http_status_code, headers=http_response_header)
    
    # Server-Sent Events
    @staticmethod
    def streaming_error(status_code: str = 'E-10001', message: str = "", data=None, **kwargs):
        """
        Send an error message as Server-Sent Event
        
        Args:
            status_code: Error code
            message: Error message
            data: Additional data
            event_type: SSE event type (default: "error")
            **kwargs: Additional fields
            
        Returns:
            Formatted SSE string
        """
        res_data = {
            'status': 'error',
            'status_code': status_code,
            **kwargs
        }
        if message: res_data['message'] = message
        if data is not None: res_data['data'] = data
        
        if ENCRYPT:
            res_data = EncryptionUtils.encrypt(res_data)
        
        return f"event: error\ndata: {json.dumps(res_data)}\n\n"
    
    @staticmethod
    def streaming_success(status_code: str = 'S-10001', message: str = "", data: any = None, **kwargs):
        """
        Send a success message as Server-Sent Event
        
        Args:
            status_code: Success code
            message: Success message
            data: Response data
            event_type: SSE event type (default: "complete")
            **kwargs: Additional fields
            
        Returns:
            Formatted SSE string
        """
        res_data = {
            'status': 'success',
            'status_code': status_code,
            **kwargs
        }

        if message: res_data['message'] = message
        if data is not None: res_data['data'] = data

        if ENCRYPT:
            res_data = EncryptionUtils.encrypt(res_data)
        
        return f"event: success\ndata: {json.dumps(res_data)}\n\n"
    
    @staticmethod
    def streaming_progress(message: str="", data: any = None, **kwargs):
        """
        Send a progress update as Server-Sent Event
        
        Args:
            step: Current step identifier
            message: Progress message
            data: Additional progress data
            event_type: SSE event type (default: "progress")
            **kwargs: Additional fields
            
        Returns:
            Formatted SSE string
        """
        res_data = {
            'status': 'progress',
            **kwargs
        }
        
        if data is not None: res_data['data'] = data
        if message: res_data['message'] = message
        
        if ENCRYPT:
            res_data = EncryptionUtils.encrypt(res_data)
        
        return f"event: progress\ndata: {json.dumps(res_data)}\n\n"