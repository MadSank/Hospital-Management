from datetime import date, datetime, timezone
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship as sa_relationship
from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), unique=True, nullable=True, index=True)
    patient_uid = Column(String(20), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(20), nullable=False)  # male, female, other
    blood_group = Column(String(5), nullable=True)  # A+, A-, B+, B-, O+, O-, AB+, AB-
    phone = Column(String(20), nullable=False, index=True)
    email = Column(String(255), nullable=True, index=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    zip_code = Column(String(20), nullable=True)
    allergies = Column(Text, nullable=True)
    medical_history = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
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
    user = sa_relationship("User", backref="patient_profile")
    emergency_contacts = sa_relationship(
        "EmergencyContact",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    appointments = sa_relationship(
        "Appointment",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    encounters = sa_relationship(
        "Encounter",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    prescriptions = sa_relationship(
        "Prescription",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    admissions = sa_relationship(
        "Admission",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    invoices = sa_relationship(
        "Invoice",
        back_populates="patient",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_patients_name", "last_name", "first_name"),
    )


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    relationship = Column(String(50), nullable=False)
    phone = Column(String(20), nullable=False)
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    patient = sa_relationship("Patient", back_populates="emergency_contacts")
