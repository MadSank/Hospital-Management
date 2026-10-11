from datetime import date, datetime, time
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_any_role
from app.models.appointment import Appointment, AppointmentStatus
from app.models.user import RoleEnum, User
from app.schemas.appointment import (
    AppointmentCreateRequest,
    AppointmentDetailResponse,
    AppointmentRescheduleRequest,
    AppointmentStatusUpdateRequest,
    AppointmentSummaryResponse,
    DoctorBrief,
    PaginatedAppointmentResponse,
    PatientBrief,
)
from app.services.appointment_service import AppointmentService

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def serialize_summary(apt: Appointment) -> AppointmentSummaryResponse:
    doc_name = f"Dr. {apt.doctor.first_name} {apt.doctor.last_name}"
    pat_name = f"{apt.patient.first_name} {apt.patient.last_name}"
    return AppointmentSummaryResponse(
        id=apt.id,
        appointment_uid=apt.appointment_uid,
        patient_id=apt.patient_id,
        patient_name=pat_name,
        patient_uid=apt.patient.patient_uid,
        doctor_id=apt.doctor_id,
        doctor_name=doc_name,
        doctor_specialty=apt.doctor.specialty,
        scheduled_date=apt.scheduled_date,
        scheduled_time=apt.scheduled_time.strftime("%H:%M"),
        end_time=apt.end_time.strftime("%H:%M"),
        status=apt.status,
        type=apt.type,
        reason=apt.reason,
        created_at=apt.created_at,
    )


def serialize_detail(apt: Appointment) -> AppointmentDetailResponse:
    dept_name = apt.doctor.department.name if apt.doctor.department else None
    return AppointmentDetailResponse(
        id=apt.id,
        appointment_uid=apt.appointment_uid,
        patient_id=apt.patient_id,
        doctor_id=apt.doctor_id,
        scheduled_date=apt.scheduled_date,
        scheduled_time=apt.scheduled_time.strftime("%H:%M"),
        end_time=apt.end_time.strftime("%H:%M"),
        status=apt.status,
        type=apt.type,
        reason=apt.reason,
        cancellation_reason=apt.cancellation_reason,
        notes=apt.notes,
        patient=PatientBrief(
            id=apt.patient.id,
            patient_uid=apt.patient.patient_uid,
            first_name=apt.patient.first_name,
            last_name=apt.patient.last_name,
            gender=apt.patient.gender,
            date_of_birth=apt.patient.date_of_birth,
            phone=apt.patient.phone,
            blood_group=apt.patient.blood_group,
            allergies=apt.patient.allergies,
        ),
        doctor=DoctorBrief(
            id=apt.doctor.id,
            staff_uid=apt.doctor.staff_uid,
            first_name=apt.doctor.first_name,
            last_name=apt.doctor.last_name,
            specialty=apt.doctor.specialty,
            qualification=apt.doctor.qualification,
            phone=apt.doctor.phone,
            department_name=dept_name,
        ),
        created_at=apt.created_at,
        updated_at=apt.updated_at,
    )


@router.get("", response_model=PaginatedAppointmentResponse, status_code=status.HTTP_200_OK)
def list_appointments(
    date: Optional[date] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    doctor_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists appointments with filtering, pagination, and role-based access control."""
    items, total, pages = AppointmentService.list_appointments(
        db=db,
        current_user=current_user,
        date_val=date,
        date_from=date_from,
        date_to=date_to,
        doctor_id=doctor_id,
        patient_id=patient_id,
        status_val=status,
        type_val=type,
        search=search,
        page=page,
        per_page=per_page,
    )
    return PaginatedAppointmentResponse(
        items=[serialize_summary(a) for a in items],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.post("", response_model=AppointmentDetailResponse, status_code=status.HTTP_201_CREATED)
def book_appointment(
    req: AppointmentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Books an appointment with strict doctor schedule checking and conflict prevention."""
    appointment = AppointmentService.create_appointment(
        db=db,
        req=req,
        current_user=current_user,
    )
    return serialize_detail(appointment)


@router.get("/today", response_model=List[AppointmentSummaryResponse], status_code=status.HTTP_200_OK)
def get_today_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves all appointments for today, sorted by scheduled time."""
    items, _, _ = AppointmentService.list_appointments(
        db=db,
        current_user=current_user,
        date_val=date.today(),
        per_page=200,
    )
    return [serialize_summary(a) for a in items]


@router.get("/queue", response_model=List[AppointmentSummaryResponse], status_code=status.HTTP_200_OK)
def get_appointment_queue(
    current_user: User = Depends(
        require_any_role([RoleEnum.ADMIN, RoleEnum.RECEPTIONIST, RoleEnum.NURSE, RoleEnum.DOCTOR])
    ),
    db: Session = Depends(get_db),
):
    """Retrieves checked-in patients currently queued for clinical consultation."""
    items, _, _ = AppointmentService.list_appointments(
        db=db,
        current_user=current_user,
        date_val=date.today(),
        status_val=AppointmentStatus.CHECKED_IN.value,
        per_page=100,
    )
    return [serialize_summary(a) for a in items]


@router.get("/{appointment_id}", response_model=AppointmentDetailResponse, status_code=status.HTTP_200_OK)
def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves appointment details by ID."""
    appointment = AppointmentService.get_appointment(
        db=db,
        appointment_id=appointment_id,
        current_user=current_user,
    )
    return serialize_detail(appointment)


@router.put("/{appointment_id}", response_model=AppointmentDetailResponse, status_code=status.HTTP_200_OK)
def reschedule_appointment(
    appointment_id: int,
    req: AppointmentRescheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reschedules an existing appointment to a new date/time with self-excluding conflict validation."""
    appointment = AppointmentService.reschedule_appointment(
        db=db,
        appointment_id=appointment_id,
        req=req,
        current_user=current_user,
    )
    return serialize_detail(appointment)


@router.patch("/{appointment_id}/status", response_model=AppointmentDetailResponse, status_code=status.HTTP_200_OK)
def update_appointment_status(
    appointment_id: int,
    req: AppointmentStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates appointment status following the strict state transition machine."""
    appointment = AppointmentService.update_status(
        db=db,
        appointment_id=appointment_id,
        req=req,
        current_user=current_user,
    )
    return serialize_detail(appointment)
