from datetime import timedelta
import pytest
from app.utils.security import create_access_token
from tests.conftest import make_auth_headers


@pytest.mark.asyncio
async def test_health_check(client):
    """Test health check endpoints."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"

    api_resp = await client.get("/api/health")
    assert api_resp.status_code == 200
    assert api_resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_login_success(client):
    """Test login with valid administrator credentials."""
    resp = await client.post(
        "/api/auth/login",
        json={"email": "admin@medflow.com", "password": "Admin@123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@medflow.com"
    assert data["user"]["role"] == "admin"
    assert data["user"]["role_display"] == "Administrator"
    assert data["user"]["is_active"] is True


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    """Test login rejection when password does not match."""
    resp = await client.post(
        "/api/auth/login",
        json={"email": "admin@medflow.com", "password": "WrongPassword999"},
    )
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_login_nonexistent_email(client):
    """Test login rejection when user email is not in system."""
    resp = await client.post(
        "/api/auth/login",
        json={"email": "nobody@medflow.com", "password": "Password123"},
    )
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_login_disabled_account(client):
    """Test login rejection when account has been deactivated."""
    resp = await client.post(
        "/api/auth/login",
        json={"email": "disabled@medflow.com", "password": "Disabled@123"},
    )
    assert resp.status_code == 403
    detail = resp.json()["detail"]
    assert detail["code"] == "ACCOUNT_DISABLED"


@pytest.mark.asyncio
async def test_get_current_user_me_success(client):
    """Test retrieving user profile with valid Bearer token."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    resp = await client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == 1
    assert data["email"] == "admin@medflow.com"
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_get_current_user_me_unauthenticated(client):
    """Test rejection when no Authorization header is provided."""
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "UNAUTHENTICATED"


@pytest.mark.asyncio
async def test_get_current_user_me_malformed_token(client):
    """Test rejection with an invalid/garbage token."""
    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer this-is-not-a-valid-jwt-token"},
    )
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "INVALID_TOKEN"


@pytest.mark.asyncio
async def test_get_current_user_me_expired_token(client):
    """Test rejection with an expired JWT."""
    expired_token = create_access_token(
        {"sub": "1", "role": "admin"},
        expires_delta=timedelta(minutes=-10),
    )
    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "INVALID_TOKEN"


@pytest.mark.asyncio
async def test_change_password_success(client):
    """Test changing user password and logging in with new credentials."""
    headers = make_auth_headers(user_id=3, role="patient", email="patient@medflow.com")
    resp = await client.post(
        "/api/auth/change-password",
        headers=headers,
        json={"current_password": "Patient@123", "new_password": "BrandNewPassword2026!"},
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "Password changed successfully"

    # Now verify login with new password
    login_resp = await client.post(
        "/api/auth/login",
        json={"email": "patient@medflow.com", "password": "BrandNewPassword2026!"},
    )
    assert login_resp.status_code == 200


@pytest.mark.asyncio
async def test_change_password_wrong_current(client):
    """Test changing password with incorrect current password."""
    headers = make_auth_headers(user_id=3, role="patient", email="patient@medflow.com")
    resp = await client.post(
        "/api/auth/change-password",
        headers=headers,
        json={"current_password": "WrongPassword999", "new_password": "BrandNewPassword2026!"},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "CURRENT_PASSWORD_INCORRECT"


@pytest.mark.asyncio
async def test_role_authorization_admin_allowed(client):
    """Admin role accesses admin-only protected endpoint."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    resp = await client.get("/api/auth/admin-only", headers=headers)
    assert resp.status_code == 200
    assert "Welcome Admin" in resp.json()["message"]


@pytest.mark.asyncio
async def test_role_authorization_non_admin_forbidden(client):
    """Doctor role attempting to access admin-only protected endpoint is rejected with 403."""
    headers = make_auth_headers(user_id=2, role="doctor", email="doctor@medflow.com")
    resp = await client.get("/api/auth/admin-only", headers=headers)
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "FORBIDDEN_ROLE"


@pytest.mark.asyncio
async def test_logout_endpoint(client):
    """Test logout endpoint returns confirmation message."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    resp = await client.post("/api/auth/logout", headers=headers)
    assert resp.status_code == 200
    assert "logged out" in resp.json()["message"].lower()
