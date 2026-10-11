from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class EmergencyContactBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    relationship: str = Field(..., min_length=1, max_length=50)
    phone: str = Field(..., min_length=3, max_length=20)


class EmergencyContactResponse(EmergencyContactBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class PatientCreateRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    gender: str = Field(..., description="male, female, or other")
    blood_group: Optional[str] = Field(None, description="A+, A-, B+, B-, O+, O-, AB+, AB-")
    phone: str = Field(..., min_length=5, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    allergies: Optional[str] = None
    medical_history: Optional[str] = None
    notes: Optional[str] = None
    emergency_contacts: Optional[List[EmergencyContactBase]] = []
    create_login: Optional[bool] = False

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean not in {"male", "female", "other"}:
            raise ValueError("Gender must be one of: male, female, other")
        return clean

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        clean = v.strip().upper()
        allowed = {"A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"}
        if clean not in allowed:
            raise ValueError(f"Blood group must be one of: {', '.join(sorted(allowed))}")
        return clean

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: date) -> date:
        if v >= date.today():
            raise ValueError("Date of birth must be in the past")
        return v


class PatientUpdateRequest(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = Field(None, min_length=5, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    allergies: Optional[str] = None
    medical_history: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    emergency_contacts: Optional[List[EmergencyContactBase]] = None

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip().lower()
        if clean not in {"male", "female", "other"}:
            raise ValueError("Gender must be one of: male, female, other")
        return clean

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        clean = v.strip().upper()
        allowed = {"A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"}
        if clean not in allowed:
            raise ValueError(f"Blood group must be one of: {', '.join(sorted(allowed))}")
        return clean

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v >= date.today():
            raise ValueError("Date of birth must be in the past")
        return v


class PatientSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_uid: str
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    blood_group: Optional[str] = None
    phone: str
    email: Optional[str] = None
    city: Optional[str] = None
    is_active: bool
    created_at: datetime


class PatientDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_uid: str
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    blood_group: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    allergies: Optional[str] = None
    medical_history: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    emergency_contacts: List[EmergencyContactResponse] = []


class PaginatedPatientResponse(BaseModel):
    items: List[PatientSummaryResponse]
    total: int
    page: int
    per_page: int
    pages: int
