from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.staff import Department, DoctorAvailability, Staff
from app.models.user import RoleEnum, User
from app.dependencies import get_current_user
from app.schemas.staff import (
    DepartmentResponse,
    DoctorAvailabilityResponse,
    DoctorAvailableSlotsResponse,
    DoctorSummaryResponse,
)
from app.services.appointment_service import AppointmentService

router = APIRouter(prefix="/staff", tags=["Staff"])


@router.get("/doctors", response_model=List[DoctorSummaryResponse], status_code=status.HTTP_200_OK)
def list_doctors(
    department_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists doctors for appointment scheduling and filtering."""
    query = db.query(Staff).join(User).filter(Staff.is_active == True)
    if department_id:
        query = query.filter(Staff.department_id == department_id)

    doctors = query.all()
    results = []
    for d in doctors:
        dept_name = d.department.name if d.department else None
        results.append(
            DoctorSummaryResponse(
                id=d.id,
                user_id=d.user_id,
                staff_uid=d.staff_uid,
                full_name=f"Dr. {d.first_name} {d.last_name}",
                first_name=d.first_name,
                last_name=d.last_name,
                specialty=d.specialty,
                qualification=d.qualification,
                phone=d.phone,
                department_id=d.department_id,
                department_name=dept_name,
            )
        )
    return results


@router.get("/departments", response_model=List[DepartmentResponse], status_code=status.HTTP_200_OK)
def list_departments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists clinical departments."""
    depts = db.query(Department).filter(Department.is_active == True).all()
    return depts


@router.get("/doctors/{doctor_id}/available-slots", response_model=DoctorAvailableSlotsResponse, status_code=status.HTTP_200_OK)
def get_doctor_available_slots(
    doctor_id: int,
    date: date = Query(..., description="Target date in YYYY-MM-DD format"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves available appointment slots for a doctor on a specific date."""
    return AppointmentService.get_doctor_available_slots(
        db=db,
        doctor_id=doctor_id,
        target_date=date,
    )


@router.get("/doctors/{doctor_id}/availability", response_model=List[DoctorAvailabilityResponse], status_code=status.HTTP_200_OK)
def get_doctor_availability(
    doctor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves recurring weekly availability blocks for a doctor."""
    avails = (
        db.query(DoctorAvailability)
        .filter(DoctorAvailability.doctor_id == doctor_id, DoctorAvailability.is_active == True)
        .order_by(DoctorAvailability.day_of_week.asc(), DoctorAvailability.start_time.asc())
        .all()
    )
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    results = []
    for a in avails:
        results.append(
            DoctorAvailabilityResponse(
                id=a.id,
                doctor_id=a.doctor_id,
                day_of_week=a.day_of_week,
                day_name=day_names[a.day_of_week] if 0 <= a.day_of_week <= 6 else "Unknown",
                start_time=a.start_time.strftime("%H:%M"),
                end_time=a.end_time.strftime("%H:%M"),
                slot_duration_minutes=a.slot_duration_minutes,
                is_active=a.is_active,
            )
        )
    return results
