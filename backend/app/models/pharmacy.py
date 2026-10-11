from datetime import date, datetime, timezone
from enum import Enum
from sqlalchemy import (
    Boolean,
    Column,
    Date,
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


class PrescriptionStatus(str, Enum):
    PENDING = "pending"
    DISPENSED = "dispensed"
    PARTIALLY_DISPENSED = "partially_dispensed"
    CANCELLED = "cancelled"


class StockMovementType(str, Enum):
    RECEIPT = "receipt"
    DISPENSED = "dispensed"
    ADJUSTMENT = "adjustment"
    EXPIRED = "expired"
    RETURNED = "returned"


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    medicine_uid = Column(String(20), unique=True, nullable=False, index=True)  # MED-0001
    name = Column(String(200), nullable=False, index=True)
    generic_name = Column(String(200), nullable=True)
    category = Column(String(100), nullable=True, index=True)
    form = Column(String(50), nullable=False)  # tablet, capsule, syrup, injection, cream, drops
    strength = Column(String(50), nullable=True)  # 500mg, 250mg/5ml
    manufacturer = Column(String(200), nullable=True)
    unit_price = Column(Numeric(10, 2), nullable=False, default=0.0)
    reorder_level = Column(Integer, nullable=False, default=50)
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

    batches = sa_relationship("MedicineBatch", back_populates="medicine", cascade="all, delete-orphan")
    stock_movements = sa_relationship("StockMovement", back_populates="medicine", cascade="all, delete-orphan")
    prescription_items = sa_relationship("PrescriptionItem", back_populates="medicine")


class MedicineBatch(Base):
    __tablename__ = "medicine_batches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_number = Column(String(50), nullable=False)
    quantity_received = Column(Integer, nullable=False)
    quantity_remaining = Column(Integer, nullable=False)
    expiry_date = Column(Date, nullable=False, index=True)
    received_date = Column(Date, nullable=False)
    supplier = Column(String(200), nullable=True)
    cost_per_unit = Column(Numeric(10, 2), nullable=True)
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

    medicine = sa_relationship("Medicine", back_populates="batches")
    stock_movements = sa_relationship("StockMovement", back_populates="batch")

    __table_args__ = (
        UniqueConstraint("medicine_id", "batch_number", name="uq_medicine_batch_number"),
    )


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("medicine_batches.id", ondelete="SET NULL"), nullable=True, index=True)
    movement_type = Column(String(20), nullable=False)  # receipt, dispensed, adjustment, expired, returned
    quantity = Column(Integer, nullable=False)  # positive for addition, negative for deduction
    reference_type = Column(String(50), nullable=True)  # prescription, manual_adjustment
    reference_id = Column(Integer, nullable=True)
    performed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    medicine = sa_relationship("Medicine", back_populates="stock_movements")
    batch = sa_relationship("MedicineBatch", back_populates="stock_movements")
    user = sa_relationship("User")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    prescription_uid = Column(String(20), unique=True, nullable=False, index=True)  # PRE-0001
    encounter_id = Column(Integer, ForeignKey("encounters.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("staff.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(
        String(20),
        nullable=False,
        default=PrescriptionStatus.PENDING.value,
        index=True,
    )
    notes = Column(Text, nullable=True)
    prescribed_date = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
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

    encounter = sa_relationship("Encounter", back_populates="prescriptions")
    patient = sa_relationship("Patient", back_populates="prescriptions")
    doctor = sa_relationship("Staff", back_populates="prescriptions")
    items = sa_relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id", ondelete="RESTRICT"), nullable=False, index=True)
    dosage = Column(String(50), nullable=False)  # 500mg
    frequency = Column(String(50), nullable=False)  # 3 times daily
    route = Column(String(50), nullable=False, default="oral")
    duration = Column(String(50), nullable=False)  # 7 days
    quantity = Column(Integer, nullable=False)  # total units
    instructions = Column(Text, nullable=True)
    is_dispensed = Column(Boolean, nullable=False, default=False)
    dispensed_quantity = Column(Integer, nullable=False, default=0)
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    prescription = sa_relationship("Prescription", back_populates="items")
    medicine = sa_relationship("Medicine", back_populates="prescription_items")
