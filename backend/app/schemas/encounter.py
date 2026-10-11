from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator


# --- Vitals Schemas ---
class VitalsCreate(BaseModel):
    temperature_f: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    oxygen_saturation: Optional[float] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    notes: Optional[str] = None


class VitalsResponse(BaseModel):
    id: int
    encounter_id: int
    recorded_by: Optional[int] = None
    recorded_by_name: Optional[str] = None
    temperature_f: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    oxygen_saturation: Optional[float] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    notes: Optional[str] = None
    recorded_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Diagnosis Schemas ---
class DiagnosisCreate(BaseModel):
    diagnosis_name: str
    diagnosis_code: Optional[str] = None
    diagnosis_type: str = "primary"
    notes: Optional[str] = None

    @field_validator("diagnosis_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v.lower() not in ["primary", "secondary"]:
            raise ValueError("diagnosis_type must be either 'primary' or 'secondary'")
        return v.lower()


class DiagnosisResponse(BaseModel):
    id: int
    encounter_id: int
    diagnosis_name: str
    diagnosis_code: Optional[str] = None
    diagnosis_type: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Encounter Schemas ---
class EncounterCreate(BaseModel):
    patient_id: int
    doctor_id: Optional[int] = None  # Auto-inferred if current user is doctor or specified
    appointment_id: Optional[int] = None
    chief_complaint: Optional[str] = None
    history_of_present_illness: Optional[str] = None
    examination_notes: Optional[str] = None
    assessment: Optional[str] = None
    treatment_plan: Optional[str] = None
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None
    vitals: Optional[VitalsCreate] = None
    diagnoses: Optional[List[DiagnosisCreate]] = None


class EncounterUpdate(BaseModel):
    chief_complaint: Optional[str] = None
    history_of_present_illness: Optional[str] = None
    examination_notes: Optional[str] = None
    assessment: Optional[str] = None
    treatment_plan: Optional[str] = None
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None
    status: Optional[str] = None


class EncounterSummaryResponse(BaseModel):
    id: int
    encounter_uid: str
    patient_id: int
    patient_name: str
    patient_uid: str
    doctor_id: int
    doctor_name: str
    appointment_id: Optional[int] = None
    encounter_date: datetime
    chief_complaint: Optional[str] = None
    assessment: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EncounterDetailResponse(BaseModel):
    id: int
    encounter_uid: str
    patient_id: int
    patient_name: str
    patient_uid: str
    patient_gender: Optional[str] = None
    patient_dob: Optional[date] = None
    patient_allergies: Optional[str] = None
    doctor_id: int
    doctor_name: str
    doctor_specialty: Optional[str] = None
    appointment_id: Optional[int] = None
    appointment_uid: Optional[str] = None
    encounter_date: datetime
    chief_complaint: Optional[str] = None
    history_of_present_illness: Optional[str] = None
    examination_notes: Optional[str] = None
    assessment: Optional[str] = None
    treatment_plan: Optional[str] = None
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    vitals: List[VitalsResponse] = []
    diagnoses: List[DiagnosisResponse] = []

    model_config = ConfigDict(from_attributes=True)
