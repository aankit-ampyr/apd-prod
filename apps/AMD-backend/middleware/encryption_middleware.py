from typing import Optional
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from utils.response_utils import Res
from utils.encryption_utils import EncryptionUtils
from starlette.datastructures import UploadFile
from io import BytesIO
import json
import uuid

class DecryptionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to decrypt AES-encrypted payloads before they reach route handlers
    """
    
    def __init__(self, app, skip_routes: Optional[list] = None):
        super().__init__(app)
        # Get AES key from environment or parameter
        self.skip_routes = skip_routes or []
    
    async def dispatch(self, request: Request, call_next):
        # Skip decryption for specified routes
        if any(request.url.path.startswith(route) for route in self.skip_routes):
            return await call_next(request)
        
        # Skip decryption for GET requests (usually no body)
        if request.method == "GET":
            return await call_next(request)
        
        try:
            # Get content type BEFORE reading body (form-data needs stream for request.form())
            content_type = request.headers.get("content-type", "").lower()
            
            if "multipart/form-data" in content_type:
                # For form-data: do NOT read body first - _handle_formdata uses request.form()
                # which reads from the stream. Reading body first would consume the stream.
                await self._handle_formdata(request)


            elif "application/json" in content_type:
                body = await request.body()
                if body:  # only attempt decryption if there's actually a body
                    try:
                        await self._handle_json(request, body)
                    except Exception as e:
                        return Res.error('E-10061', message="Failed to decrypt payload", http_status_code=400)
                else:
                    # Empty body: set to {} so endpoints with optional body params (e.g. mark-all-as-read) parse correctly
                    request._body = b'{}'
                    self._update_content_length(request)
                
            # Continue with the request
            return await call_next(request)
            
        except Exception as e:
            # If decryption fails, return error
            return Res.error('E-10061', message="Failed to decrypt payload" ,http_status_code=400)
    
    async def _handle_json(self, request: Request, body: bytes):
        """Handle JSON payloads"""
        encrypted_data = json.loads(body)
        
        # Check if payload is encrypted (has 'iv' and 'payload' keys)
        if isinstance(encrypted_data, dict) and "iv" in encrypted_data and "payload" in encrypted_data:
            # Decrypt the payload
            decrypted_data = EncryptionUtils.decrypt(
                iv_base64=encrypted_data["iv"],
                encrypted_payload_base64=encrypted_data["payload"]
            )
            
            # Replace request body with decrypted data
            request._body = json.dumps(decrypted_data).encode()
            
            # Update content-length header
            self._update_content_length(request)
    
    async def _handle_formdata(self, request: Request) -> Request:
        form = await request.form()

        iv = form.get("iv")
        is_encrypted = iv and isinstance(iv, str) and iv.strip()

        boundary = f"----FastAPIBoundary{uuid.uuid4().hex}"
        new_body = BytesIO()

        for key, value in form.multi_items():
            new_body.write(f"--{boundary}\r\n".encode())

            if isinstance(value, UploadFile):
                file_content = await value.read()
                new_body.write(
                    f'Content-Disposition: form-data; name="{key}"; filename="{value.filename}"\r\n'.encode()
                )
                new_body.write(
                    f"Content-Type: {value.content_type or 'application/octet-stream'}\r\n\r\n".encode()
                )
                new_body.write(file_content)
                new_body.write(b"\r\n")
                continue

            # Skip iv BEFORE writing boundary
            if key == "iv":
                continue

            # Skip None or empty non-file values
            if value is None:
                continue

            # Skip UploadFile with no filename (empty file input)
            if isinstance(value, UploadFile) and not value.filename:
                continue

            if is_encrypted and value and isinstance(value, str) and value.strip():
                try:
                    decrypted_value = EncryptionUtils.decrypt(
                        iv_base64=iv,
                        encrypted_payload_base64=value,
                        is_json=False
                    )
                except Exception:
                    decrypted_value = value
            else:
                decrypted_value = value
            

            # Skip empty string fields
            str_value = str(decrypted_value) if decrypted_value is not None else ""
            if not str_value:
                continue

            str_value = str(decrypted_value) if decrypted_value is not None else ""
            new_body.write(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode("utf-8"))
            new_body.write(str_value.encode("utf-8"))
            new_body.write(b"\r\n")

        await form.close()

        new_body_bytes = new_body.getvalue()

        # Mutate the SCOPE headers in-place (this is what FastAPI actually reads)
        new_headers = [
            (k, v) for k, v in request.scope["headers"]
            if k.lower() not in (b"content-type", b"content-length")
        ]
        new_headers.append((b"content-type", f"multipart/form-data; boundary={boundary}".encode()))
        new_headers.append((b"content-length", str(len(new_body_bytes)).encode()))
        request.scope["headers"] = new_headers  # mutate scope directly

        # Replace the receive callable on the request itself
        async def receive():
            return {"type": "http.request", "body": new_body_bytes, "more_body": False}

        request._receive = receive  # Starlette uses this internally

        # Clear ALL caches so FastAPI re-parses from the new body
        request._form = None
        if hasattr(request, '_body'):
            del request._body
        if hasattr(request, '_stream_consumed'):
            request._stream_consumed = False
        if hasattr(request, '_is_disconnected'):
            request._is_disconnected = False

        return request  # same object, mutated

    def _update_content_length(self, request: Request):
        """Update content-length header"""
        request.headers.__dict__["_list"] = [
            (k, v) for k, v in request.headers.items() 
            if k.lower() != "content-length"
        ]
        request.headers.__dict__["_list"].append(
            (b"content-length", str(len(request._body)).encode())
        )

    def _update_formdata_headers(self, request: Request, boundary: str, content_length: int):
        """Update content-type and content-length for form-data, preserve other headers"""
        new_content_type = f"multipart/form-data; boundary={boundary}".encode()
        new_content_length = str(content_length).encode()
        request.headers.__dict__["_list"] = [
            (k, v) for k, v in request.headers.items()
            if k.lower() not in ("content-type", "content-length")
        ]
        request.headers.__dict__["_list"].append((b"content-type", new_content_type))
        request.headers.__dict__["_list"].append((b"content-length", new_content_length))