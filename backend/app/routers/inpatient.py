from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_any_role
from app.models.user import RoleEnum, User
from app.schemas.inpatient import (
    AdmissionCreate,
    AdmissionDischargeRequest,
    AdmissionResponse,
    AdmissionTransferRequest,
    BedCreate,
    BedResponse,
    BedUpdateStatus,
    WardCreate,
    WardResponse,
    WardWithBedsResponse,
)
from app.services.inpatient_service import InpatientService

router = APIRouter(prefix="/inpatient", tags=["Inpatient Care & Bed Management"])
wards_router = APIRouter(prefix="/wards", tags=["Wards & Beds"])
admissions_router = APIRouter(prefix="/admissions", tags=["Admissions"])


# --- Wards ---
@wards_router.get(
    "",
    response_model=List[WardResponse],
    dependencies=[
        Depends(
            require_any_role(
                RoleEnum.ADMIN.value,
                RoleEnum.DOCTOR.value,
                RoleEnum.NURSE.value,
                RoleEnum.RECEPTIONIST.value,
            )
        )
    ],
)
def list_wards(db: Session = Depends(get_db)):
    return InpatientService.list_wards(db)


@wards_router.post(
    "",
    response_model=WardResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_any_role(RoleEnum.ADMIN.value))],
)
def create_ward(
    data: WardCreate,
    db: Session = Depends(get_db),
):
    return InpatientService.create_ward(db, data)


@wards_router.get(
    "/{id}",
    response_model=WardWithBedsResponse,
    dependencies=[
        Depends(
            require_any_role(
                RoleEnum.ADMIN.value,
                RoleEnum.DOCTOR.value,
                RoleEnum.NURSE.value,
                RoleEnum.RECEPTIONIST.value,
            )
        )
    ],
)
def get_ward_with_beds(
    id: int,
    db: Session = Depends(get_db),
):
    return InpatientService.get_ward_with_beds(db, id)


@wards_router.post(
    "/{id}/beds",
    response_model=BedResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_any_role(RoleEnum.ADMIN.value, RoleEnum.NURSE.value))],
)
def add_bed_to_ward(
    id: int,
    data: BedCreate,
    db: Session = Depends(get_db),
):
    return InpatientService.add_bed_to_ward(db, id, data)


# --- Bed status update ---
@wards_router.patch(
    "/beds/{bed_id}/status",
    response_model=BedResponse,
    dependencies=[Depends(require_any_role(RoleEnum.ADMIN.value, RoleEnum.NURSE.value))],
)
def update_bed_status(
    bed_id: int,
    data: BedUpdateStatus,
    db: Session = Depends(get_db),
):
    return InpatientService.update_bed_status(db, bed_id, data)


# --- Admissions ---
@admissions_router.post(
    "",
    response_model=AdmissionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            require_any_role(
                RoleEnum.ADMIN.value,
                RoleEnum.DOCTOR.value,
                RoleEnum.NURSE.value,
                RoleEnum.RECEPTIONIST.value,
            )
        )
    ],
)
def admit_patient(
    data: AdmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return InpatientService.admit_patient(db, data, current_user)


@admissions_router.get(
    "",
    response_model=List[AdmissionResponse],
    dependencies=[
        Depends(
            require_any_role(
                RoleEnum.ADMIN.value,
                RoleEnum.DOCTOR.value,
                RoleEnum.NURSE.value,
                RoleEnum.RECEPTIONIST.value,
                RoleEnum.PATIENT.value,
            )
        )
    ],
)
def list_admissions(
    patient_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    ward_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return InpatientService.list_admissions(
        db,
        patient_id=patient_id,
        status_filter=status_filter,
        ward_id=ward_id,
        current_user=current_user,
    )


@admissions_router.get(
    "/{id}",
    response_model=AdmissionResponse,
    dependencies=[
        Depends(
            require_any_role(
                RoleEnum.ADMIN.value,
                RoleEnum.DOCTOR.value,
                RoleEnum.NURSE.value,
                RoleEnum.RECEPTIONIST.value,
                RoleEnum.PATIENT.value,
            )
        )
    ],
)
def get_admission(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return InpatientService.get_admission(db, id, current_user)


@admissions_router.post(
    "/{id}/transfer",
    response_model=AdmissionResponse,
    dependencies=[
        Depends(
            require_any_role(
                RoleEnum.ADMIN.value,
                RoleEnum.DOCTOR.value,
                RoleEnum.NURSE.value,
            )
        )
    ],
)
def transfer_patient(
    id: int,
    data: AdmissionTransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return InpatientService.transfer_patient(db, id, data, current_user)


@admissions_router.post(
    "/{id}/discharge",
    response_model=AdmissionResponse,
    dependencies=[
        Depends(
            require_any_role(
                RoleEnum.ADMIN.value,
                RoleEnum.DOCTOR.value,
            )
        )
    ],
)
def discharge_patient(
    id: int,
    data: AdmissionDischargeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return InpatientService.discharge_patient(db, id, data, current_user)
