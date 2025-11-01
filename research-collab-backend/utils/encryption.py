# Encryption and Key Generation Utilities
import secrets
import hashlib
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import os

def generate_private_key() -> str:
    """
    Generate a secure random private key (32 bytes = 256 bits)
    Returns a base64-encoded string that users can save
    """
    # Generate 32 random bytes
    random_bytes = secrets.token_bytes(32)
    # Encode to base64 for easy copy-paste
    key = base64.urlsafe_b64encode(random_bytes).decode('utf-8')
    return key

def generate_encryption_key_from_private_key(private_key: str) -> bytes:
    """
    Derive a Fernet encryption key from the private key
    This ensures the document can only be decrypted with the correct private key
    """
    # Use PBKDF2HMAC to derive a key from the private key
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'open_science_nexus_salt',  # Fixed salt for consistency
        iterations=100000,
        backend=default_backend()
    )
    key = base64.urlsafe_b64encode(kdf.derive(private_key.encode()))
    return key

def encrypt_file_content(file_content: bytes, private_key: str) -> bytes:
    """
    Encrypt file content using the private key
    Returns encrypted bytes that can be uploaded to IPFS
    """
    encryption_key = generate_encryption_key_from_private_key(private_key)
    fernet = Fernet(encryption_key)
    encrypted_content = fernet.encrypt(file_content)
    return encrypted_content

def decrypt_file_content(encrypted_content: bytes, private_key: str) -> bytes:
    """
    Decrypt file content using the private key
    Returns original file bytes
    """
    try:
        encryption_key = generate_encryption_key_from_private_key(private_key)
        fernet = Fernet(encryption_key)
        decrypted_content = fernet.decrypt(encrypted_content)
        return decrypted_content
    except Exception as e:
        raise ValueError("Invalid private key or corrupted file")

def hash_private_key(private_key: str) -> str:
    """
    Create a hash of the private key for verification without storing the actual key
    """
    key_hash = hashlib.sha256(private_key.encode()).hexdigest()
    return key_hash

def verify_private_key(private_key: str, stored_hash: str) -> bool:
    """
    Verify if a private key matches the stored hash
    """
    return hash_private_key(private_key) == stored_hash

def generate_document_id() -> str:
    """
    Generate a unique document ID
    """
    return secrets.token_urlsafe(16)
