from datetime import date, time
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class DoctorAvailabilityResponse(BaseModel):
    id: int
    doctor_id: int
    day_of_week: int
    day_name: str
    start_time: str
    end_time: str
    slot_duration_minutes: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class DoctorSummaryResponse(BaseModel):
    id: int
    user_id: int
    staff_uid: str
    full_name: str
    first_name: str
    last_name: str
    specialty: Optional[str] = None
    qualification: Optional[str] = None
    phone: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TimeSlot(BaseModel):
    start_time: str
    end_time: str
    available: bool


class DoctorAvailableSlotsResponse(BaseModel):
    doctor_id: int
    doctor_name: str
    date: date
    slots: List[TimeSlot]
