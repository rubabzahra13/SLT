import hashlib
import os
import secrets
from typing import Optional

# Simple, secure password hashing using PBKDF2 HMAC SHA256 (standard library)
SALT_SIZE = 16
ITERATIONS = 100000

def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2 with SHA256 and a random salt."""
    salt = secrets.token_bytes(SALT_SIZE)
    hash_bytes = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS)
    return f"{salt.hex()}:{hash_bytes.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored salt:hash string."""
    try:
        if ":" not in hashed_password:
            return False
        salt_hex, hash_hex = hashed_password.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
        actual_hash = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, ITERATIONS)
        return secrets.compare_digest(actual_hash, expected_hash)
    except Exception:
        return False
