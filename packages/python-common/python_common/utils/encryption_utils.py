from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad, pad
from Crypto.Random import get_random_bytes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import json
from cryptography.fernet import Fernet
import base64
from python_common.config import AES_SECRET_KEY, PEPPER, FILE_ENCRYPTION_KEY
import os
import hashlib
import hmac

class EncryptionUtils:

    @staticmethod
    def encrypt(data: dict, inline: bool = False):
        # if not ENCRYPT: return data
        """
        Encrypt a Python dictionary using AES-CBC and return Base64 IV + payload
        
        Args:
            data: Dictionary to encrypt
            
        Returns:
            {
                "iv": "<Base64 IV>",
                "payload": "<Base64 encrypted data>"
            }
        """
        try:
            # Convert AES key from Base64
            aes_key_bytes = base64.b64decode(AES_SECRET_KEY.strip())
            
            # Generate a random 16-byte IV (128-bit)
            iv = get_random_bytes(16)
            
            # Convert dict to JSON string and then to bytes
            json_data = json.dumps(data).encode('utf-8')
            
            # Create AES cipher in CBC mode
            cipher = AES.new(aes_key_bytes, AES.MODE_CBC, iv)
            
            # Encrypt and pad the data (PKCS7)
            encrypted_bytes = cipher.encrypt(pad(json_data, AES.block_size))
            
            # Encode IV and encrypted data in Base64
            iv_base64 = base64.b64encode(iv).decode('utf-8')
            payload_base64 = base64.b64encode(encrypted_bytes).decode('utf-8')
            
            if inline:
                return f"encrypted_{iv_base64}:{payload_base64}"

            return {
                "iv": iv_base64,
                "payload": payload_base64
            }
            
        except Exception as e:
            raise ValueError(f"Encryption failed: {str(e)}")
    
    @staticmethod
    def decrypt(iv_base64: str, encrypted_payload_base64: str, is_json=True) -> dict: 
        """
        Decrypt AES-CBC encrypted payload
        
        Args:
            iv_base64: Base64 encoded Initialization Vector
            encrypted_payload_base64: Base64 encoded encrypted data
            
        Returns:
            Decrypted JSON data as dictionary
        """
        try:
            # Decode base64 strings
            iv = base64.b64decode(iv_base64)
            encrypted_data = base64.b64decode(encrypted_payload_base64)
            
            # Create AES cipher in CBC mode
            aes_key_bytes = base64.b64decode(AES_SECRET_KEY.strip())
            cipher = AES.new(aes_key_bytes, AES.MODE_CBC, iv)
            
            # Decrypt and remove padding
            decrypted_bytes = unpad(cipher.decrypt(encrypted_data), AES.block_size)
            
            # Convert to JSON
            if not is_json:
                return decrypted_bytes.decode('utf-8')

            decrypted_json = json.loads(decrypted_bytes.decode('utf-8'))
            
            return decrypted_json
            
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)}")

    @staticmethod
    def generate_dek() -> bytes:
        """
        Generates a 256-bit (32-byte) key for AES-256-GCM
        (Advanced Encryption Standard 256-bit Galois Counter Mode)
        """
        return os.urandom(32)
    
    @staticmethod
    def encrypt_dek(dek: bytes, kek: bytes) -> tuple[bytes, bytes]:
        """
        Encrypts the DEK (Data Encryption Key)
        using the KEK (Key Encryption Key)
        with AES-256-GCM (Advanced Encryption Standard 256-bit Galois Counter Mode)

        Returns:
            encrypted_dek, nonce
        """
        aesgcm = AESGCM(kek)
        nonce = os.urandom(12)  # 96-bit nonce for GCM
        encrypted_dek = aesgcm.encrypt(nonce, dek, None)
        return encrypted_dek, nonce

    @staticmethod 
    def decrypt_dek(encrypted_dek: bytes, nonce: bytes, kek: bytes) -> bytes:
        """
        Decrypts the DEK (Data Encryption Key)
        using the KEK (Key Encryption Key)
        with AES-256-GCM (Advanced Encryption Standard 256-bit Galois Counter Mode)
        """
        aesgcm = AESGCM(kek)
        return aesgcm.decrypt(nonce, encrypted_dek, None)
    
    @staticmethod
    def decrypt_data(ciphertext: bytes, nonce: bytes, dek: bytes) -> bytes:
        """
        Decrypts encrypted column data using the DEK (Data Encryption Key)
        with AES-256-GCM (Advanced Encryption Standard 256-bit Galois Counter Mode)

        Returns:
            plaintext bytes
        """
        aesgcm = AESGCM(dek)
        return aesgcm.decrypt(nonce, ciphertext, None)
    
    def encrypt_data(plaintext: bytes, dek: bytes) -> tuple[bytes, bytes]:
        """
        Encrypts data using the DEK (Data Encryption Key)
        with AES-256-GCM (Advanced Encryption Standard 256-bit Galois Counter Mode)

        Returns:
            ciphertext, nonce
        """
        aesgcm = AESGCM(dek)
        nonce = os.urandom(12)  # 96-bit nonce required for GCM
        ciphertext = aesgcm.encrypt(nonce, plaintext, None)
        return ciphertext, nonce

    @staticmethod
    def encrypt_inline(value: str) -> str:
        key = base64.b64decode(AES_SECRET_KEY.strip())
        iv = get_random_bytes(16)
        cipher = AES.new(key, AES.MODE_CBC, iv)

        encrypted = cipher.encrypt(
            pad(value.encode("utf-8"), AES.block_size)
        )

        mac = hmac.new(key, iv + encrypted, hashlib.sha256).digest()

        token = base64.b64encode(iv + encrypted + mac).decode()
        return token

    @staticmethod
    def decrypt_inline(token: str) -> str:
        key = base64.b64decode(AES_SECRET_KEY.strip())
        decoded = base64.b64decode(token)

        iv = decoded[:16]
        mac = decoded[-32:]
        ciphertext = decoded[16:-32]

        expected_mac = hmac.new(key, iv + ciphertext, hashlib.sha256).digest()

        if not hmac.compare_digest(mac, expected_mac):
            raise ValueError("Invalid MAC")

        cipher = AES.new(key, AES.MODE_CBC, iv)

        plaintext = unpad(
            cipher.decrypt(ciphertext),
            AES.block_size
        )

        return plaintext.decode("utf-8")

class HashUtils:
    def compare_hash(value: str, stored_hash: str, pepper: str) -> bool:
        """
        Compares a plaintext value against a stored SHA-256 hash
        using a secret pepper.
        """

        data = (value + pepper).encode()
        computed_hash = hashlib.sha256(data).hexdigest()

        return hmac.compare_digest(computed_hash, stored_hash)
    
    def generate_hash(value: str) -> str:
        """
        Generates SHA-256 (Secure Hash Algorithm 256-bit)
        hash for email using a secret pepper.
        """
        normalized_value = str(value).strip().lower()
        data = (normalized_value + PEPPER).encode("utf-8")
        return hashlib.sha256(data).hexdigest()


class FileEncryptionUtils:

    def encrypt_bytes(data: bytes) -> bytes:
        fernet = Fernet(FILE_ENCRYPTION_KEY.encode())
        return fernet.encrypt(data)

    def decrypt_bytes(data: bytes) -> bytes:
        fernet = Fernet(FILE_ENCRYPTION_KEY.encode())
        return fernet.decrypt(data)