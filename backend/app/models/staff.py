from datetime import date, datetime, time, timezone
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Index, Integer, String, Text, Time
from sqlalchemy.orm import relationship as sa_relationship
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
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
    staff_members = sa_relationship("Staff", back_populates="department")


class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    staff_uid = Column(String(20), unique=True, nullable=False, index=True)  # STF-0001
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    specialty = Column(String(100), nullable=True)
    qualification = Column(String(200), nullable=True)
    phone = Column(String(20), nullable=False)
    hire_date = Column(Date, nullable=True)
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
    user = sa_relationship("User", backref="staff_profile")
    department = sa_relationship("Department", back_populates="staff_members")
    availabilities = sa_relationship("DoctorAvailability", back_populates="doctor", cascade="all, delete-orphan")
    appointments = sa_relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")
    encounters = sa_relationship("Encounter", back_populates="doctor", cascade="all, delete-orphan")
    prescriptions = sa_relationship("Prescription", back_populates="doctor", cascade="all, delete-orphan")
    admissions = sa_relationship("Admission", back_populates="admitting_doctor", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_staff_name", "last_name", "first_name"),
    )


class DoctorAvailability(Base):
    __tablename__ = "doctor_availability"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    doctor_id = Column(Integer, ForeignKey("staff.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    slot_duration_minutes = Column(Integer, nullable=False, default=30)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    doctor = sa_relationship("Staff", back_populates="availabilities")

    __table_args__ = (
        Index("ix_doctor_avail_schedule", "doctor_id", "day_of_week"),
    )
