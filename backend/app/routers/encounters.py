from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_any_role
from app.models.user import RoleEnum, User
from app.schemas.encounter import (
    DiagnosisCreate,
    DiagnosisResponse,
    EncounterCreate,
    EncounterDetailResponse,
    EncounterSummaryResponse,
    EncounterUpdate,
    VitalsCreate,
    VitalsResponse,
)
from app.services.encounter_service import EncounterService

router = APIRouter(prefix="/encounters", tags=["Encounters"])


@router.post(
    "",
    response_model=EncounterDetailResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_any_role(RoleEnum.ADMIN.value, RoleEnum.DOCTOR.value))],
)
def create_encounter(
    data: EncounterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return EncounterService.create_encounter(db, data, current_user)


@router.get(
    "",
    response_model=List[EncounterSummaryResponse],
    dependencies=[
        Depends(
            require_any_role(
                RoleEnum.ADMIN.value,
                RoleEnum.DOCTOR.value,
                RoleEnum.NURSE.value,
                RoleEnum.PATIENT.value,
            )
        )
    ],
)
def list_encounters(
    patient_id: Optional[int] = Query(None),
    doctor_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return EncounterService.list_encounters(
        db,
        patient_id=patient_id,
        doctor_id=doctor_id,
        status_filter=status_filter,
        current_user=current_user,
    )


@router.get(
    "/{id}",
    response_model=EncounterDetailResponse,
    dependencies=[
        Depends(
            require_any_role(
                RoleEnum.ADMIN.value,
                RoleEnum.DOCTOR.value,
                RoleEnum.NURSE.value,
                RoleEnum.PATIENT.value,
            )
        )
    ],
)
def get_encounter(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return EncounterService.get_encounter_detail(db, id, current_user)


@router.put(
    "/{id}",
    response_model=EncounterDetailResponse,
    dependencies=[Depends(require_any_role(RoleEnum.ADMIN.value, RoleEnum.DOCTOR.value))],
)
def update_encounter(
    id: int,
    data: EncounterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return EncounterService.update_encounter(db, id, data, current_user)


@router.patch(
    "/{id}/complete",
    response_model=EncounterDetailResponse,
    dependencies=[Depends(require_any_role(RoleEnum.ADMIN.value, RoleEnum.DOCTOR.value))],
)
def complete_encounter(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return EncounterService.complete_encounter(db, id, current_user)


@router.post(
    "/{id}/vitals",
    response_model=VitalsResponse,
    status_code=status.HTTP_201_CREATED,
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
def record_vitals(
    id: int,
    data: VitalsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return EncounterService.add_vitals(db, id, data, current_user)


@router.post(
    "/{id}/diagnoses",
    response_model=DiagnosisResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_any_role(RoleEnum.ADMIN.value, RoleEnum.DOCTOR.value))],
)
def record_diagnosis(
    id: int,
    data: DiagnosisCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return EncounterService.add_diagnosis(db, id, data, current_user)
