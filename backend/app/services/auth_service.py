from datetime import datetime, timezone
from fastapi import status
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    CurrentUserResponse,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    UserSummary,
)
from app.utils.permissions import create_api_error
from app.utils.security import (
    create_access_token,
    hash_password,
    verify_password,
)


class AuthService:
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> User:
        """Verify user credentials and active status."""
        user = db.query(User).filter(User.email == email.strip().lower()).first()
        if not user:
            raise create_api_error(
                status_code=status.HTTP_401_UNAUTHORIZED,
                code="INVALID_CREDENTIALS",
                message="Invalid email or password",
            )

        if not verify_password(password, user.password_hash):
            raise create_api_error(
                status_code=status.HTTP_401_UNAUTHORIZED,
                code="INVALID_CREDENTIALS",
                message="Invalid email or password",
            )

        if not user.is_active:
            raise create_api_error(
                status_code=status.HTTP_403_FORBIDDEN,
                code="ACCOUNT_DISABLED",
                message="This account has been deactivated. Please contact administration.",
            )

        # Update last login timestamp
        user.last_login_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)

        return user

    @classmethod
    def login(cls, db: Session, req: LoginRequest) -> LoginResponse:
        """Authenticate user and generate JWT access token."""
        user = cls.authenticate_user(db, req.email, req.password)
        role_name = user.role.name if user.role else "patient"
        role_display = user.role.display_name if user.role else "Patient"

        token_payload = {
            "sub": str(user.id),
            "role": role_name,
            "email": user.email,
        }
        access_token = create_access_token(token_payload)

        user_summary = UserSummary(
            id=user.id,
            email=user.email,
            role=role_name,
            role_display=role_display,
            full_name=user.full_name or role_display,
            is_active=user.is_active,
        )

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_summary,
        )

    @staticmethod
    def get_user_profile(user: User) -> CurrentUserResponse:
        """Construct current user profile response."""
        role_name = user.role.name if user.role else "patient"
        role_display = user.role.display_name if user.role else "Patient"

        return CurrentUserResponse(
            id=user.id,
            email=user.email,
            role=role_name,
            role_display=role_display,
            full_name=user.full_name or role_display,
            is_active=user.is_active,
            profile_id=None,
            staff_id=None,
            patient_id=None,
        )

    @staticmethod
    def change_password(db: Session, user: User, req: ChangePasswordRequest) -> MessageResponse:
        """Change current user's password with verification."""
        if not verify_password(req.current_password, user.password_hash):
            raise create_api_error(
                status_code=status.HTTP_400_BAD_REQUEST,
                code="CURRENT_PASSWORD_INCORRECT",
                message="Current password is incorrect",
                field="current_password",
            )

        if len(req.new_password) < 8:
            raise create_api_error(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="WEAK_PASSWORD",
                message="New password must be at least 8 characters long",
                field="new_password",
            )

        user.password_hash = hash_password(req.new_password)
        user.updated_at = datetime.now(timezone.utc)
        db.commit()

        return MessageResponse(message="Password changed successfully")
