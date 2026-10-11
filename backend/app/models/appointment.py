from datetime import date, datetime, time, timezone
from enum import Enum
from sqlalchemy import Column, Date, DateTime, ForeignKey, Index, Integer, String, Text, Time
from sqlalchemy.orm import relationship as sa_relationship
from app.database import Base


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CHECKED_IN = "checked_in"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class AppointmentType(str, Enum):
    CONSULTATION = "consultation"
    FOLLOW_UP = "follow_up"
    EMERGENCY = "emergency"


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    appointment_uid = Column(String(20), unique=True, nullable=False, index=True)  # APT-0001
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("staff.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_date = Column(Date, nullable=False, index=True)
    scheduled_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    status = Column(
        String(20),
        nullable=False,
        default=AppointmentStatus.SCHEDULED.value,
        index=True,
    )
    type = Column(
        String(50),
        nullable=False,
        default=AppointmentType.CONSULTATION.value,
    )
    reason = Column(Text, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
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
    patient = sa_relationship("Patient", back_populates="appointments")
    doctor = sa_relationship("Staff", back_populates="appointments")
    created_by = sa_relationship("User")
    encounter = sa_relationship("Encounter", back_populates="appointment", uselist=False)

    __table_args__ = (
        Index("ix_appointments_doctor_slot", "doctor_id", "scheduled_date", "scheduled_time"),
        Index("ix_appointments_patient_date", "patient_id", "scheduled_date"),
        Index("ix_appointments_status_date", "status", "scheduled_date"),
    )
