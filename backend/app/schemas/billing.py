from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


class InvoiceItemBase(BaseModel):
    item_type: str = Field(default="other", description="consultation, lab_test, medicine, bed_charge, procedure, other")
    description: str = Field(..., min_length=1, max_length=255)
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(..., ge=0)


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemResponse(InvoiceItemBase):
    id: int
    invoice_id: int
    total_price: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PaymentCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Payment amount must be greater than zero")
    payment_method: str = Field(default="cash", description="cash, card, bank_transfer, insurance, other")
    reference_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    payment_uid: str
    invoice_id: int
    amount: float
    payment_method: str
    payment_date: datetime
    reference_number: Optional[str] = None
    received_by: Optional[int] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InvoiceCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    encounter_id: Optional[int] = None
    prescription_id: Optional[int] = None
    admission_id: Optional[int] = None
    discount_amount: float = Field(default=0.0, ge=0)
    tax_amount: float = Field(default=0.0, ge=0)
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    items: List[InvoiceItemCreate] = Field(default_factory=list)
    auto_issue: bool = False

    @model_validator(mode="after")
    def validate_items(self):
        if not self.items and not self.encounter_id and not self.prescription_id and not self.admission_id:
            raise ValueError("Invoice must contain at least one line item or be auto-generated from a billable entity.")
        return self


class InvoiceUpdate(BaseModel):
    discount_amount: Optional[float] = Field(None, ge=0)
    tax_amount: Optional[float] = Field(None, ge=0)
    due_date: Optional[datetime] = None
    notes: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: int
    invoice_uid: str
    patient_id: int
    patient_name: Optional[str] = None
    patient_mrn: Optional[str] = None
    appointment_id: Optional[int] = None
    encounter_id: Optional[int] = None
    prescription_id: Optional[int] = None
    admission_id: Optional[int] = None
    subtotal: float
    discount_amount: float
    tax_amount: float
    total_amount: float
    paid_amount: float
    balance_due: float
    status: str
    notes: Optional[str] = None
    issued_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItemResponse] = []
    payments: List[PaymentResponse] = []
    model_config = ConfigDict(from_attributes=True)
