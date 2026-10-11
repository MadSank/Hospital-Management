from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, description="Account password")


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    role_display: str
    full_name: str
    is_active: bool


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSummary


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    role_display: str
    full_name: str
    is_active: bool
    profile_id: Optional[int] = None
    staff_id: Optional[int] = None
    patient_id: Optional[int] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(
        ...,
        min_length=8,
        description="New password (minimum 8 characters, with letters and numbers)",
    )


class MessageResponse(BaseModel):
    message: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class StandardErrorResponse(BaseModel):
    detail: ErrorDetail
