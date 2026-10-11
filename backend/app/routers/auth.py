from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import RoleEnum, User
from app.schemas.auth import (
    ChangePasswordRequest,
    CurrentUserResponse,
    LoginRequest,
    LoginResponse,
    MessageResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
def login(
    req: LoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate user with email and password, returning JWT access token."""
    return AuthService.login(db=db, req=req)


@router.get("/me", response_model=CurrentUserResponse, status_code=status.HTTP_200_OK)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Retrieve authenticated user's profile and active role."""
    return AuthService.get_user_profile(current_user)


@router.post("/change-password", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change current user's password."""
    return AuthService.change_password(db=db, user=current_user, req=req)


@router.post("/logout", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def logout(
    current_user: User = Depends(get_current_user),
):
    """Stateless logout confirmation."""
    return MessageResponse(message="Successfully logged out")


@router.get("/admin-only", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def admin_only_check(
    current_admin: User = Depends(require_role(RoleEnum.ADMIN)),
):
    """Protected endpoint strictly for testing administrative role authorization."""
    return MessageResponse(message=f"Welcome Admin: {current_admin.email}")
