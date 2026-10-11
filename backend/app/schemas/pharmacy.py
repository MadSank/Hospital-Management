from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator


# --- Medicine Schemas ---
class MedicineCreate(BaseModel):
    name: str
    generic_name: Optional[str] = None
    category: Optional[str] = None
    form: str = "tablet"  # tablet, capsule, syrup, injection, cream, drops
    strength: Optional[str] = None
    manufacturer: Optional[str] = None
    unit_price: float = 0.0
    reorder_level: int = 50

    @field_validator("form")
    @classmethod
    def validate_form(cls, v: str) -> str:
        valid_forms = ["tablet", "capsule", "syrup", "injection", "cream", "drops", "inhaler", "solution"]
        if v.lower() not in valid_forms:
            raise ValueError(f"Form must be one of: {', '.join(valid_forms)}")
        return v.lower()


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    category: Optional[str] = None
    form: Optional[str] = None
    strength: Optional[str] = None
    manufacturer: Optional[str] = None
    unit_price: Optional[float] = None
    reorder_level: Optional[int] = None
    is_active: Optional[bool] = None


class MedicineBatchCreate(BaseModel):
    batch_number: str
    quantity_received: int
    expiry_date: date
    received_date: Optional[date] = None
    supplier: Optional[str] = None
    cost_per_unit: Optional[float] = None

    @field_validator("quantity_received")
    @classmethod
    def validate_qty(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("quantity_received must be greater than 0")
        return v


class MedicineBatchResponse(BaseModel):
    id: int
    medicine_id: int
    batch_number: str
    quantity_received: int
    quantity_remaining: int
    expiry_date: date
    received_date: date
    supplier: Optional[str] = None
    cost_per_unit: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MedicineResponse(BaseModel):
    id: int
    medicine_uid: str
    name: str
    generic_name: Optional[str] = None
    category: Optional[str] = None
    form: str
    strength: Optional[str] = None
    manufacturer: Optional[str] = None
    unit_price: float
    reorder_level: int
    is_active: bool
    total_stock: int = 0
    created_at: datetime
    updated_at: datetime
    batches: List[MedicineBatchResponse] = []

    model_config = ConfigDict(from_attributes=True)


# --- Stock Movement Schemas ---
class StockMovementResponse(BaseModel):
    id: int
    medicine_id: int
    medicine_name: Optional[str] = None
    batch_id: Optional[int] = None
    batch_number: Optional[str] = None
    movement_type: str
    quantity: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    performed_by: Optional[int] = None
    performed_by_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Prescription Schemas ---
class PrescriptionItemCreate(BaseModel):
    medicine_id: int
    dosage: str  # e.g. "500mg"
    frequency: str  # e.g. "3 times daily"
    route: str = "oral"
    duration: str  # e.g. "7 days"
    quantity: int  # total units
    instructions: Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def validate_qty(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("quantity must be greater than 0")
        return v


class PrescriptionItemResponse(BaseModel):
    id: int
    prescription_id: int
    medicine_id: int
    medicine_name: str
    medicine_uid: str
    dosage: str
    frequency: str
    route: str
    duration: str
    quantity: int
    instructions: Optional[str] = None
    is_dispensed: bool
    dispensed_quantity: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PrescriptionCreate(BaseModel):
    encounter_id: int
    patient_id: int
    doctor_id: Optional[int] = None
    notes: Optional[str] = None
    items: List[PrescriptionItemCreate]


class PrescriptionResponse(BaseModel):
    id: int
    prescription_uid: str
    encounter_id: int
    patient_id: int
    patient_name: str
    patient_uid: str
    doctor_id: int
    doctor_name: str
    status: str
    notes: Optional[str] = None
    prescribed_date: datetime
    created_at: datetime
    updated_at: datetime
    items: List[PrescriptionItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


# --- Dispensing Schemas ---
class DispenseItemRequest(BaseModel):
    prescription_item_id: int
    quantity: int
    batch_id: Optional[int] = None

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("quantity must be positive")
        return v


class DispenseRequest(BaseModel):
    prescription_id: int
    items: List[DispenseItemRequest]


class StockAlertItem(BaseModel):
    medicine_id: int
    medicine_name: str
    medicine_uid: str
    current_stock: int
    reorder_level: int
    status: str  # "out_of_stock", "low_stock"


class ExpiringBatchItem(BaseModel):
    batch_id: int
    batch_number: str
    medicine_id: int
    medicine_name: str
    expiry_date: date
    days_until_expiry: int
    quantity_remaining: int


class StockAlertsResponse(BaseModel):
    low_stock: List[StockAlertItem] = []
    expiring_soon: List[ExpiringBatchItem] = []
