from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship as sa_relationship
from app.database import Base


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    CANCELLED = "cancelled"


class InvoiceItemType(str, Enum):
    CONSULTATION = "consultation"
    LAB_TEST = "lab_test"
    MEDICINE = "medicine"
    BED_CHARGE = "bed_charge"
    PROCEDURE = "procedure"
    OTHER = "other"


class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    INSURANCE = "insurance"
    OTHER = "other"


class PaymentStatus(str, Enum):
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    invoice_uid = Column(String(20), unique=True, nullable=False, index=True)  # e.g. INV-0001
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id", ondelete="SET NULL"), nullable=True, index=True)
    admission_id = Column(Integer, ForeignKey("admissions.id", ondelete="SET NULL"), nullable=True, index=True)

    subtotal = Column(Numeric(10, 2), nullable=False, default=0.0)
    discount_amount = Column(Numeric(10, 2), nullable=False, default=0.0)
    tax_amount = Column(Numeric(10, 2), nullable=False, default=0.0)
    total_amount = Column(Numeric(10, 2), nullable=False, default=0.0)
    paid_amount = Column(Numeric(10, 2), nullable=False, default=0.0)

    status = Column(String(20), nullable=False, default=InvoiceStatus.DRAFT.value)
    notes = Column(Text, nullable=True)
    issued_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)

    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
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
    patient = sa_relationship("Patient", back_populates="invoices")
    appointment = sa_relationship("Appointment")
    encounter = sa_relationship("Encounter")
    prescription = sa_relationship("Prescription")
    admission = sa_relationship("Admission")
    creator = sa_relationship("User")
    items = sa_relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan", order_by="InvoiceItem.id")
    payments = sa_relationship("Payment", back_populates="invoice", cascade="all, delete-orphan", order_by="Payment.id")

    __table_args__ = (
        Index("ix_invoices_patient_status", "patient_id", "status"),
        Index("ix_invoices_created_at", "created_at"),
    )


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    item_type = Column(String(50), nullable=False, default=InvoiceItemType.OTHER.value)
    description = Column(String(255), nullable=False)
    reference_type = Column(String(50), nullable=True)  # 'encounter', 'prescription', 'admission', 'medicine'
    reference_id = Column(Integer, nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False, default=0.0)
    total_price = Column(Numeric(10, 2), nullable=False, default=0.0)

    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    invoice = sa_relationship("Invoice", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    payment_uid = Column(String(20), unique=True, nullable=False, index=True)  # e.g. PAY-0001
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(50), nullable=False, default=PaymentMethod.CASH.value)
    payment_date = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    reference_number = Column(String(100), nullable=True)
    received_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default=PaymentStatus.COMPLETED.value)

    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    invoice = sa_relationship("Invoice", back_populates="payments")
    receiver = sa_relationship("User")

    __table_args__ = (
        Index("ix_payments_invoice_status", "invoice_id", "status"),
        Index("ix_payments_created_at", "created_at"),
    )
