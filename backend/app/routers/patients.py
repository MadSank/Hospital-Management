from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_any_role
from app.models.user import RoleEnum, User
from app.schemas.auth import MessageResponse
from app.schemas.patient import (
    PaginatedPatientResponse,
    PatientCreateRequest,
    PatientDetailResponse,
    PatientUpdateRequest,
)
from app.services.patient_service import PatientService

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("", response_model=PaginatedPatientResponse, status_code=status.HTTP_200_OK)
def list_patients(
    search: Optional[str] = Query(None, description="Search by name, MRN, phone, or email"),
    gender: Optional[str] = Query(None, description="Filter by gender (male, female, other)"),
    blood_group: Optional[str] = Query(None, description="Filter by blood group"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    current_user: User = Depends(
        require_any_role([
            RoleEnum.ADMIN,
            RoleEnum.DOCTOR,
            RoleEnum.RECEPTIONIST,
            RoleEnum.NURSE,
        ])
    ),
    db: Session = Depends(get_db),
):
    """Retrieve a paginated, searchable list of hospital patients."""
    return PatientService.list_patients(
        db=db,
        current_user=current_user,
        search=search,
        gender=gender,
        blood_group=blood_group,
        is_active=is_active,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post("", response_model=PatientDetailResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    req: PatientCreateRequest,
    current_user: User = Depends(
        require_any_role([RoleEnum.ADMIN, RoleEnum.RECEPTIONIST])
    ),
    db: Session = Depends(get_db),
):
    """Register a new patient record with demographic and emergency contact details."""
    return PatientService.create_patient(db=db, req=req, current_user=current_user)


@router.get("/{patient_id}", response_model=PatientDetailResponse, status_code=status.HTTP_200_OK)
def get_patient(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full patient demographic, clinical tags, and emergency contact details."""
    return PatientService.get_patient(db=db, patient_id=patient_id, current_user=current_user)


@router.put("/{patient_id}", response_model=PatientDetailResponse, status_code=status.HTTP_200_OK)
def update_patient(
    patient_id: int,
    req: PatientUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update patient information with role-based field restrictions."""
    return PatientService.update_patient(
        db=db,
        patient_id=patient_id,
        req=req,
        current_user=current_user,
    )


@router.delete("/{patient_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
@router.patch("/{patient_id}/archive", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def archive_patient(
    patient_id: int,
    current_user: User = Depends(
        require_any_role([RoleEnum.ADMIN, RoleEnum.RECEPTIONIST])
    ),
    db: Session = Depends(get_db),
):
    """Soft-delete / archive a patient by deactivating their record."""
    patient = PatientService.archive_patient(db=db, patient_id=patient_id, current_user=current_user)
    return MessageResponse(message=f"Patient {patient.patient_uid} has been archived successfully")


@router.get("/{patient_id}/encounters", status_code=status.HTTP_200_OK)
def get_patient_encounters(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Future encounter history hook (Milestone 4)."""
    # Verify patient access authorization
    PatientService.get_patient(db=db, patient_id=patient_id, current_user=current_user)
    return {"items": [], "total": 0, "page": 1, "per_page": 20, "pages": 1}


@router.get("/{patient_id}/appointments", status_code=status.HTTP_200_OK)
def get_patient_appointments(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve real appointments history for the patient (Milestone 3)."""
    PatientService.get_patient(db=db, patient_id=patient_id, current_user=current_user)
    from app.services.appointment_service import AppointmentService
    from app.routers.appointments import serialize_summary
    items, total, pages = AppointmentService.list_appointments(
        db=db,
        current_user=current_user,
        patient_id=patient_id,
        per_page=100,
    )
    return {
        "items": [serialize_summary(a) for a in items],
        "total": total,
        "page": 1,
        "per_page": 100,
        "pages": pages,
    }


@router.get("/{patient_id}/invoices", status_code=status.HTTP_200_OK)
def get_patient_invoices(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Future invoice history hook (Milestone 7)."""
    PatientService.get_patient(db=db, patient_id=patient_id, current_user=current_user)
    return {"items": [], "total": 0, "page": 1, "per_page": 20, "pages": 1}
