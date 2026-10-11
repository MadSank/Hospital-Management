from datetime import date, datetime, time
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator


class AppointmentCreateRequest(BaseModel):
    patient_id: int
    doctor_id: int
    scheduled_date: date
    scheduled_time: str  # "HH:MM" or "HH:MM:SS"
    end_time: Optional[str] = None
    type: str = "consultation"
    reason: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("scheduled_date")
    @classmethod
    def validate_future_or_today(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("Appointment date cannot be in the past")
        return v

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        valid_types = ["consultation", "follow_up", "emergency"]
        if v.lower() not in valid_types:
            raise ValueError(f"Invalid appointment type. Allowed: {', '.join(valid_types)}")
        return v.lower()


class AppointmentRescheduleRequest(BaseModel):
    scheduled_date: date
    scheduled_time: str
    end_time: Optional[str] = None
    doctor_id: Optional[int] = None
    reason: Optional[str] = None

    @field_validator("scheduled_date")
    @classmethod
    def validate_future_or_today(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("Rescheduled date cannot be in the past")
        return v


class AppointmentStatusUpdateRequest(BaseModel):
    status: str
    cancellation_reason: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = [
            "scheduled",
            "checked_in",
            "in_progress",
            "completed",
            "cancelled",
            "no_show",
        ]
        if v.lower() not in valid_statuses:
            raise ValueError(f"Invalid appointment status. Allowed: {', '.join(valid_statuses)}")
        return v.lower()


class PatientBrief(BaseModel):
    id: int
    patient_uid: str
    first_name: str
    last_name: str
    gender: str
    date_of_birth: date
    phone: str
    blood_group: Optional[str] = None
    allergies: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DoctorBrief(BaseModel):
    id: int
    staff_uid: str
    first_name: str
    last_name: str
    specialty: Optional[str] = None
    qualification: Optional[str] = None
    phone: str
    department_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AppointmentSummaryResponse(BaseModel):
    id: int
    appointment_uid: str
    patient_id: int
    patient_name: str
    patient_uid: str
    doctor_id: int
    doctor_name: str
    doctor_specialty: Optional[str] = None
    scheduled_date: date
    scheduled_time: str
    end_time: str
    status: str
    type: str
    reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AppointmentDetailResponse(BaseModel):
    id: int
    appointment_uid: str
    patient_id: int
    doctor_id: int
    scheduled_date: date
    scheduled_time: str
    end_time: str
    status: str
    type: str
    reason: Optional[str] = None
    cancellation_reason: Optional[str] = None
    notes: Optional[str] = None
    patient: PatientBrief
    doctor: DoctorBrief
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedAppointmentResponse(BaseModel):
    items: List[AppointmentSummaryResponse]
    total: int
    page: int
    per_page: int
    pages: int
