import pytest
from app.models.user import User
from app.utils.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_never_plaintext(db_session):
    """Verify that stored password in database is a bcrypt hash and never plaintext."""
    admin = db_session.query(User).filter(User.email == "admin@medflow.com").first()
    assert admin is not None
    assert admin.password_hash != "Admin@123"
    assert admin.password_hash.startswith("$2b$") or admin.password_hash.startswith("$2a$")


def test_password_hashing_and_verification():
    """Verify bcrypt hash generation and validation."""
    raw_pass = "ComplexP@ssw0rd99"
    hashed = hash_password(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("IncorrectPassword", hashed) is False


def test_jwt_token_payload_claims():
    """Verify token encoding and decoding integrity."""
    data = {"sub": "42", "role": "doctor", "email": "doctor@medflow.com"}
    token = create_access_token(data)
    assert isinstance(token, str)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "42"
    assert decoded["role"] == "doctor"
    assert decoded["email"] == "doctor@medflow.com"
    assert "exp" in decoded
    assert "iat" in decoded
