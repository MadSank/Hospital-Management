from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_any_role
from app.models.user import RoleEnum, User
from app.schemas.pharmacy import (
    DispenseRequest,
    MedicineBatchCreate,
    MedicineBatchResponse,
    MedicineCreate,
    MedicineResponse,
    MedicineUpdate,
    PrescriptionCreate,
    PrescriptionResponse,
    StockAlertsResponse,
    StockMovementResponse,
)
from app.services.pharmacy_service import PharmacyService

router = APIRouter(prefix="/pharmacy", tags=["Pharmacy & Inventory"])


# --- Medicines ---
@router.get(
    "/medicines",
    response_model=List[MedicineResponse],
    dependencies=[
        Depends(
            require_any_role(
                RoleEnum.ADMIN.value,
                RoleEnum.PHARMACIST.value,
                RoleEnum.DOCTOR.value,
                RoleEnum.NURSE.value,
            )
        )
    ],
)
def list_medicines(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    form: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    low_stock: bool = Query(False),
    db: Session = Depends(get_db),
):
    return PharmacyService.list_medicines(
        db,
        search=search,
        category=category,
        form=form,
        is_active=is_active,
        low_stock_only=low_stock,
    )


@router.post(
    "/medicines",
    response_model=MedicineResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_any_role(RoleEnum.ADMIN.value, RoleEnum.PHARMACIST.value))],
)
def create_medicine(
    data: MedicineCreate,
    db: Session = Depends(get_db),
):
    return PharmacyService.create_medicine(db, data)


@router.post(
    "/medicines/{id}/batches",
    response_model=MedicineBatchResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_any_role(RoleEnum.ADMIN.value, RoleEnum.PHARMACIST.value))],
)
def add_batch(
    id: int,
    data: MedicineBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PharmacyService.add_medicine_batch(db, id, data, current_user)


# --- Alerts & Movements ---
@router.get(
    "/stock-alerts",
    response_model=StockAlertsResponse,
    dependencies=[Depends(require_any_role(RoleEnum.ADMIN.value, RoleEnum.PHARMACIST.value))],
)
def get_stock_alerts(
    db: Session = Depends(get_db),
):
    return PharmacyService.get_stock_alerts(db)


@router.get(
    "/stock-movements",
    response_model=List[StockMovementResponse],
    dependencies=[Depends(require_any_role(RoleEnum.ADMIN.value, RoleEnum.PHARMACIST.value))],
)
def list_stock_movements(
    medicine_id: Optional[int] = Query(None),
    movement_type: Optional[str] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db),
):
    return PharmacyService.list_stock_movements(
        db,
        medicine_id=medicine_id,
        movement_type=movement_type,
        limit=limit,
    )


# --- Dispensing ---
@router.post(
    "/dispense",
    response_model=PrescriptionResponse,
    dependencies=[Depends(require_any_role(RoleEnum.ADMIN.value, RoleEnum.PHARMACIST.value))],
)
def dispense_prescription(
    data: DispenseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PharmacyService.dispense_prescription(db, data, current_user)


# --- Prescriptions Sub-routes under /prescriptions (also aliased in main) ---
prescriptions_router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])


@prescriptions_router.post(
    "",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_any_role(RoleEnum.ADMIN.value, RoleEnum.DOCTOR.value))],
)
def create_prescription(
    data: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PharmacyService.create_prescription(db, data, current_user)


@prescriptions_router.get(
    "",
    response_model=List[PrescriptionResponse],
    dependencies=[
        Depends(
            require_any_role(
                RoleEnum.ADMIN.value,
                RoleEnum.DOCTOR.value,
                RoleEnum.PHARMACIST.value,
                RoleEnum.NURSE.value,
                RoleEnum.PATIENT.value,
            )
        )
    ],
)
def list_prescriptions(
    patient_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PharmacyService.list_prescriptions(
        db,
        patient_id=patient_id,
        status_filter=status_filter,
        current_user=current_user,
    )


@prescriptions_router.get(
    "/{id}",
    response_model=PrescriptionResponse,
    dependencies=[
        Depends(
            require_any_role(
                RoleEnum.ADMIN.value,
                RoleEnum.DOCTOR.value,
                RoleEnum.PHARMACIST.value,
                RoleEnum.NURSE.value,
                RoleEnum.PATIENT.value,
            )
        )
    ],
)
def get_prescription(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PharmacyService.get_prescription(db, id, current_user)
