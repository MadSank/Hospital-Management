from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship as sa_relationship
from app.database import Base


class WardType(str, Enum):
    GENERAL = "general"
    PRIVATE = "private"
    ICU = "icu"
    PEDIATRIC = "pediatric"
    MATERNITY = "maternity"


class BedStatus(str, Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"
    RESERVED = "reserved"


class BedType(str, Enum):
    STANDARD = "standard"
    ELECTRIC = "electric"
    ICU = "icu"
    CRIB = "crib"


class AdmissionStatus(str, Enum):
    ADMITTED = "admitted"
    TRANSFERRED = "transferred"
    DISCHARGED = "discharged"


class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    ward_type = Column(String(50), nullable=False, default=WardType.GENERAL.value)
    floor = Column(String(20), nullable=True)
    capacity = Column(Integer, nullable=False, default=10)
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

    beds = sa_relationship("Bed", back_populates="ward", cascade="all, delete-orphan")


class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ward_id = Column(Integer, ForeignKey("wards.id", ondelete="CASCADE"), nullable=False, index=True)
    bed_number = Column(String(20), nullable=False)
    bed_type = Column(String(50), nullable=False, default=BedType.STANDARD.value)
    status = Column(
        String(20),
        nullable=False,
        default=BedStatus.AVAILABLE.value,
        index=True,
    )
    daily_rate = Column(Numeric(10, 2), nullable=False, default=50.0)
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

    ward = sa_relationship("Ward", back_populates="beds")
    admissions = sa_relationship("Admission", back_populates="bed")

    __table_args__ = (
        UniqueConstraint("ward_id", "bed_number", name="uq_ward_bed_number"),
    )


class Admission(Base):
    __tablename__ = "admissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    admission_uid = Column(String(20), unique=True, nullable=False, index=True)  # ADM-0001
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    bed_id = Column(Integer, ForeignKey("beds.id", ondelete="RESTRICT"), nullable=False, index=True)
    admitting_doctor_id = Column(Integer, ForeignKey("staff.id", ondelete="CASCADE"), nullable=False, index=True)
    admission_date = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    discharge_date = Column(DateTime, nullable=True)
    status = Column(
        String(20),
        nullable=False,
        default=AdmissionStatus.ADMITTED.value,
        index=True,
    )
    reason = Column(Text, nullable=False)
    discharge_summary = Column(Text, nullable=True)
    discharge_notes = Column(Text, nullable=True)
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

    patient = sa_relationship("Patient", back_populates="admissions")
    bed = sa_relationship("Bed", back_populates="admissions")
    admitting_doctor = sa_relationship("Staff", back_populates="admissions")

    __table_args__ = (
        Index("ix_admissions_patient_status", "patient_id", "status"),
        Index("ix_admissions_bed_status", "bed_id", "status"),
    )
