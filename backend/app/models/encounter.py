from datetime import date, datetime, timezone
from enum import Enum
from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship as sa_relationship
from app.database import Base


class EncounterStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class DiagnosisType(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"


class Encounter(Base):
    __tablename__ = "encounters"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    encounter_uid = Column(String(20), unique=True, nullable=False, index=True)  # ENC-0001
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("staff.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, unique=True)
    encounter_date = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    chief_complaint = Column(Text, nullable=True)
    history_of_present_illness = Column(Text, nullable=True)
    examination_notes = Column(Text, nullable=True)
    assessment = Column(Text, nullable=True)
    treatment_plan = Column(Text, nullable=True)
    follow_up_date = Column(Date, nullable=True)
    follow_up_notes = Column(Text, nullable=True)
    status = Column(
        String(20),
        nullable=False,
        default=EncounterStatus.IN_PROGRESS.value,
        index=True,
    )
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    patient = sa_relationship("Patient", back_populates="encounters")
    doctor = sa_relationship("Staff", back_populates="encounters")
    appointment = sa_relationship("Appointment", back_populates="encounter")
    vitals = sa_relationship("Vitals", back_populates="encounter", cascade="all, delete-orphan", order_by="desc(Vitals.recorded_at)")
    diagnoses = sa_relationship("Diagnosis", back_populates="encounter", cascade="all, delete-orphan")
    prescriptions = sa_relationship("Prescription", back_populates="encounter", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_encounters_patient_date", "patient_id", "encounter_date"),
        Index("ix_encounters_doctor_date", "doctor_id", "encounter_date"),
    )


class Vitals(Base):
    __tablename__ = "vitals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id", ondelete="CASCADE"), nullable=False, index=True)
    recorded_by = Column(Integer, ForeignKey("staff.id", ondelete="SET NULL"), nullable=True)
    temperature_f = Column(Numeric(5, 2), nullable=True)
    blood_pressure_systolic = Column(Integer, nullable=True)
    blood_pressure_diastolic = Column(Integer, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    respiratory_rate = Column(Integer, nullable=True)
    oxygen_saturation = Column(Numeric(5, 2), nullable=True)
    weight_kg = Column(Numeric(5, 2), nullable=True)
    height_cm = Column(Numeric(5, 2), nullable=True)
    notes = Column(Text, nullable=True)
    recorded_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    encounter = sa_relationship("Encounter", back_populates="vitals")
    recorder = sa_relationship("Staff")


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id", ondelete="CASCADE"), nullable=False, index=True)
    diagnosis_code = Column(String(20), nullable=True)  # ICD-10 e.g. I20.0
    diagnosis_name = Column(String(255), nullable=False)
    diagnosis_type = Column(String(20), nullable=False, default=DiagnosisType.PRIMARY.value)
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    encounter = sa_relationship("Encounter", back_populates="diagnoses")
