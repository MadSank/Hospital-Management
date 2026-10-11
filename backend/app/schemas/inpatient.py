from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator


# --- Bed Schemas ---
class BedCreate(BaseModel):
    bed_number: str
    bed_type: str = "standard"
    daily_rate: float = 50.0

    @field_validator("bed_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        valid_types = ["standard", "electric", "icu", "crib"]
        if v.lower() not in valid_types:
            raise ValueError(f"bed_type must be one of: {', '.join(valid_types)}")
        return v.lower()


class BedUpdateStatus(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid = ["available", "occupied", "maintenance", "reserved"]
        if v.lower() not in valid:
            raise ValueError(f"status must be one of: {', '.join(valid)}")
        return v.lower()


class BedResponse(BaseModel):
    id: int
    ward_id: int
    bed_number: str
    bed_type: str
    status: str
    daily_rate: float
    is_active: bool
    current_patient_id: Optional[int] = None
    current_patient_name: Optional[str] = None
    current_admission_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Ward Schemas ---
class WardCreate(BaseModel):
    name: str
    ward_type: str = "general"
    floor: Optional[str] = None
    capacity: int = 10

    @field_validator("ward_type")
    @classmethod
    def validate_ward_type(cls, v: str) -> str:
        valid = ["general", "private", "icu", "pediatric", "maternity"]
        if v.lower() not in valid:
            raise ValueError(f"ward_type must be one of: {', '.join(valid)}")
        return v.lower()


class WardResponse(BaseModel):
    id: int
    name: str
    ward_type: str
    floor: Optional[str] = None
    capacity: int
    is_active: bool
    total_beds: int = 0
    available_beds: int = 0
    occupied_beds: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WardWithBedsResponse(WardResponse):
    beds: List[BedResponse] = []


# --- Admission Schemas ---
class AdmissionCreate(BaseModel):
    patient_id: int
    bed_id: int
    admitting_doctor_id: Optional[int] = None
    admission_date: Optional[datetime] = None
    reason: str


class AdmissionTransferRequest(BaseModel):
    new_bed_id: int
    reason: str


class AdmissionDischargeRequest(BaseModel):
    discharge_summary: Optional[str] = None
    discharge_notes: Optional[str] = None


class AdmissionResponse(BaseModel):
    id: int
    admission_uid: str
    patient_id: int
    patient_name: str
    patient_uid: str
    bed_id: int
    bed_number: str
    ward_id: int
    ward_name: str
    admitting_doctor_id: int
    admitting_doctor_name: str
    admission_date: datetime
    discharge_date: Optional[datetime] = None
    status: str
    reason: str
    discharge_summary: Optional[str] = None
    discharge_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
