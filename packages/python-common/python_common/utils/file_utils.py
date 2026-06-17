from azure.storage.blob import BlobServiceClient, ContentSettings
import boto3
from boto3 import Session
from botocore.client import Config
from typing import Dict
from urllib.parse import quote
from io import BytesIO
from fastapi import UploadFile
from .encryption_utils import FileEncryptionUtils
import os
from python_common.config import (
    STORAGE_TYPE,
    AZURE_CONNECTION_STRING,
    AZURE_CONTAINER_NAME,
    AWS_ACCESS_KEY,
    AWS_SECRET_KEY,
    AWS_REGION,
    S3_BUCKET_NAME,
    CONTABO_ACCESS_KEY,
    CONTABO_SECRET_KEY,
    CONTABO_REGION,
    CONTABO_BUCKET_NAME,
    CONTABO_BUCKET_ID,
    SERVER_STORAGE_PATH,
    SERVER_PUBLIC_BASE_URL,
)


# BlobStorageManager for Azure Blob operations
class BlobStorageManager:

    @staticmethod
    def get_container_client():
        return BlobServiceClient.from_connection_string(
            AZURE_CONNECTION_STRING
        ).get_container_client(AZURE_CONTAINER_NAME)

    @staticmethod
    def upload_file(
        file_data: bytes, file_name: str, path: str, content_type: str
    ) -> str:
        container_client = BlobStorageManager.get_container_client()
        blob_name = f"{path}/{file_name}"
        blob_client = container_client.get_blob_client(blob_name)

        # Use ContentSettings for content type

        content_settings = ContentSettings(
            content_type=content_type,
            content_disposition=f'attachment; filename="{file_name}"',
        )
        blob_client.upload_blob(
            file_data, overwrite=True, content_settings=content_settings
        )
        return blob_client.url

    @staticmethod
    def delete_file(path: str, file_name: str) -> None:
        container_client = BlobStorageManager.get_container_client()
        blob_name = f"{path}/{file_name}"
        blob_client = container_client.get_blob_client(blob_name)
        blob_client.delete_blob()

    @staticmethod
    def download_file(path: str, file_name: str) -> str:
        account_name = BlobServiceClient.from_connection_string(
            AZURE_CONNECTION_STRING
        ).account_name
        blob_url = f"https://{account_name}.blob.core.windows.net/{AZURE_CONTAINER_NAME}/{path}/{file_name}"
        return blob_url

    @staticmethod
    def get_file_object(path: str, file_name: str) -> bytes:
        """
        Download a blob from Azure Storage and return its raw bytes.
        """
        container_client = BlobStorageManager.get_container_client()
        blob_name = f"{path}/{file_name}"
        blob_client = container_client.get_blob_client(blob_name)
        stream = blob_client.download_blob()
        return stream.readall()
    
    @staticmethod
    def get_file_object(file_key: str) -> bytes:
        return None, None

# S3StorageManager for AWS S3 operations
class S3StorageManager:

    @staticmethod
    def get_s3_client():
        session = Session(
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
            region_name=AWS_REGION,
        )
        return session.client("s3", config=Config(signature_version="s3v4"))

    @staticmethod
    def upload_file(
        file_data: bytes, file_name: str, path: str, content_type: str
    ) -> str:
        s3_client = S3StorageManager.get_s3_client()
        key = f"{path}{file_name}"
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME, Key=key, Body=file_data, ContentType=content_type
        )
        return f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{quote(key)}"

    @staticmethod
    def delete_file(path: str, file_name: str) -> None:
        s3_client = S3StorageManager.get_s3_client()
        key = f"{path}/{file_name}"
        s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=key)

    @staticmethod
    def download_file(path: str, file_name: str) -> str:
        key = f"{path.strip('/')}/{file_name}" if path else file_name
        return (
            f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"
        )
    
    @staticmethod
    def get_file_object(file_key: str) -> bytes:
        """
        Download an object from Contabo (S3-compatible) and return its raw bytes.
        """
        s3_client = S3StorageManager.get_s3_client()
        response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=file_key)

        content = response["Body"].read()
        content_type = response.get("ContentType", "application/octet-stream")
        return content, content_type

# ContaboStorageManager for Contabo operations
class ContaboStorageManager:
    endpoint_url = f"https://{CONTABO_REGION}.contabostorage.com"

    @staticmethod
    def get_contabo_client():
        return boto3.client(
            "s3",
            aws_access_key_id=CONTABO_ACCESS_KEY,
            aws_secret_access_key=CONTABO_SECRET_KEY,
            endpoint_url=ContaboStorageManager.endpoint_url,
            region_name=CONTABO_REGION,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
                retries={"max_attempts": 3},
                connect_timeout=15,
                read_timeout=300,
            )
        )

    @staticmethod
    def upload_file(
        file_data: bytes, file_name: str, path: str, content_type: str
    ) -> str:
        contabo_client = ContaboStorageManager.get_contabo_client()

        key = f"{path.strip('/')}/{file_name}" if path else file_name

        contabo_client.put_object(
            Bucket=CONTABO_BUCKET_NAME,
            Key=key,
            Body=file_data,
            ContentType=content_type,
            ContentLength=len(file_data),
            ACL="public-read",  # Make the file publicly readable
        )

        return f"{ContaboStorageManager.endpoint_url}/{CONTABO_BUCKET_ID}:{CONTABO_BUCKET_NAME}/{quote(key)}"

    @staticmethod
    def delete_file(path: str, file_name: str) -> None:
        contabo_client = ContaboStorageManager.get_contabo_client()
        key = f"{path.strip('/')}/{file_name}" if path else file_name
        contabo_client.delete_object(Bucket=CONTABO_BUCKET_NAME, Key=key)

    @staticmethod
    def download_file(path: str, file_name: str) -> str:
        key = f"{path.strip('/')}/{file_name}" if path else file_name
        return f"{ContaboStorageManager.endpoint_url}/{CONTABO_BUCKET_ID}:{CONTABO_BUCKET_NAME}/{key}"

    @staticmethod
    def get_file_object(file_key: str) -> bytes:
        """
        Download an object from Contabo (S3-compatible) and return its raw bytes.
        """
        contabo_client = ContaboStorageManager.get_contabo_client()
        response = contabo_client.get_object(Bucket=CONTABO_BUCKET_NAME, Key=file_key)

        content = response["Body"].read()
        content_type = response.get("ContentType", "application/octet-stream")
        return content, content_type

class ServerStorageManager:

    @staticmethod
    def get_full_path(file_key: str) -> str:
        return os.path.join(SERVER_STORAGE_PATH, file_key)

    @staticmethod
    def upload_file(
        file_data: bytes, file_name: str, path: str, content_type: str
    ) -> str:

        # Normalize path
        key = f"{path.strip('/')}/{file_name}" if path else file_name
        full_path = os.path.join(SERVER_STORAGE_PATH, key)

        # Create directories if not exist
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        # Write file to disk
        with open(full_path, "wb") as f:
            f.write(file_data)

        # Return public URL (served via Nginx)
        return f"{SERVER_PUBLIC_BASE_URL}/{quote(key)}"

    @staticmethod
    def delete_file(path: str, file_name: str) -> None:

        key = f"{path.strip('/')}/{file_name}" if path else file_name
        full_path = os.path.join(SERVER_STORAGE_PATH, key)

        if os.path.exists(full_path):
            os.remove(full_path)

    @staticmethod
    def download_file(path: str, file_name: str) -> str:
        key = f"{path.strip('/')}/{file_name}" if path else file_name
        return f"{SERVER_PUBLIC_BASE_URL}/{quote(key)}"

    @staticmethod
    def get_file_object(file_key: str):

        full_path = os.path.join(SERVER_STORAGE_PATH, file_key)

        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File not found: {file_key}")

        with open(full_path, "rb") as f:
            content = f.read()

        # Guess content type
        import mimetypes
        content_type = mimetypes.guess_type(full_path)[0] or "application/octet-stream"

        return content, content_type

# Parent class for common logic
class FileStorageManager:
    STORAGE_TYPE: str = STORAGE_TYPE
    CONTENT_TYPE_MAPPING: Dict[str, str] = {
        "pdf": "application/pdf",
        "doc": "application/msword",
        "zip": "application/zip",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        "bmp": "image/bmp",
        "svg": "image/svg+xml",
        "webp": "image/webp",
        "mp4": "video/mp4",
        "avi": "video/x-msvideo",
        "mkv": "video/x-matroska",
        "mov": "video/quicktime",
        "wmv": "video/x-ms-wmv",
        "flv": "video/x-flv",
        "webm": "video/webm",
        "mpeg": "video/mpeg",
        "ogg": "video/ogg",
    }

    @staticmethod
    def get_content_type(file_extension: str) -> str:
        return FileStorageManager.CONTENT_TYPE_MAPPING.get(
            file_extension, "application/octet-stream"
        )

    @staticmethod
    def upload_file(file_data: bytes, file_name: str, path: str, is_encrypted: bool = False) -> str:
            
        file_extension = file_name.split(".")[-1]
        content_type = FileStorageManager.get_content_type(file_extension)
        if is_encrypted:
            file_data = FileEncryptionUtils.encrypt_bytes(file_data)

        if FileStorageManager.STORAGE_TYPE == "blob":
            return BlobStorageManager.upload_file(
                file_data, file_name, path, content_type
            )
        elif FileStorageManager.STORAGE_TYPE == "s3":
            return S3StorageManager.upload_file(
                file_data, file_name, path, content_type
            )
        elif FileStorageManager.STORAGE_TYPE == "contabo":
            return ContaboStorageManager.upload_file(
                file_data, file_name, path, content_type
            )
        elif FileStorageManager.STORAGE_TYPE == "server":
            return ServerStorageManager.upload_file(
                file_data, file_name, path, content_type
            )
        else:
            raise ValueError("Unsupported storage type")

    @staticmethod
    def delete_file(path: str, file_name: str) -> None:
        if FileStorageManager.STORAGE_TYPE == "blob":
            BlobStorageManager.delete_file(path, file_name)
        elif FileStorageManager.STORAGE_TYPE == "s3":
            S3StorageManager.delete_file(path, file_name)
        elif FileStorageManager.STORAGE_TYPE == "contabo":
            ContaboStorageManager.delete_file(path, file_name)
        elif FileStorageManager.STORAGE_TYPE == "server":
            ServerStorageManager.delete_file(path, file_name)
        else:
            raise ValueError("Unsupported storage type")

    @staticmethod
    def download_file(path: str, file_name: str) -> str:
        if FileStorageManager.STORAGE_TYPE == "blob":
            return BlobStorageManager.download_file(path, file_name)
        elif FileStorageManager.STORAGE_TYPE == "s3":
            return S3StorageManager.download_file(path, file_name)
        elif FileStorageManager.STORAGE_TYPE == "contabo":
            return ContaboStorageManager.download_file(path, file_name)
        elif FileStorageManager.STORAGE_TYPE == "server":
            return ServerStorageManager.download_file(path, file_name)
        else:
            raise ValueError("Unsupported storage type")

    @staticmethod
    def get_file_object(file_key: str, return_bytes: bool = False, is_encrypted: bool = False, storage_type: str = None) -> bytes:
        """
        Return the binary content of a stored file from the configured object storage.

        :param path: Logical folder/path within the bucket/container.
        :param file_name: Name of the file to fetch.
        :return: Raw bytes of the stored file.
        """
        content = None
        content_type = None

        storage_type = storage_type or FileStorageManager.STORAGE_TYPE
        if storage_type == "blob":
            content, content_type = BlobStorageManager.get_file_object(file_key)
        elif storage_type == "s3":
            content, content_type = S3StorageManager.get_file_object(file_key)
        elif storage_type == "contabo":
            content, content_type = ContaboStorageManager.get_file_object(file_key)
        elif storage_type == "server":
            content, content_type = ServerStorageManager.get_file_object(file_key)
        else:
            raise ValueError("Unsupported storage type")
        
        # 🔓 Centralized decryption
        if is_encrypted:
            content = FileEncryptionUtils.decrypt_bytes(content)

        if return_bytes:
            file_like = BytesIO(content)
            filename = file_key.split("/")[-1]

            return UploadFile(
                file=file_like,
                filename=filename,
                headers={"content-type": content_type},
            )

        return content, content_type
