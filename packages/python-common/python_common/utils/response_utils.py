from fastapi.responses import JSONResponse
from .encryption_utils import EncryptionUtils
from python_common.config import ENCRYPT


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
        **kwargs,
    ):
        res_data = {"status": "success", "status_code": status_code, **kwargs}

        if message:
            res_data["message"] = message
        if data is not None:
            res_data["data"] = data

        if ENCRYPT:
            res_data = EncryptionUtils.encrypt(res_data)
        return JSONResponse(content=res_data, status_code=http_status_code)
