from datetime import date, datetime, time, timedelta, timezone
import threading
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import and_, or_, text
from sqlalchemy.orm import Session

from app.models.appointment import Appointment, AppointmentStatus, AppointmentType
from app.models.patient import Patient
from app.models.staff import Department, DoctorAvailability, Staff
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
from app.schemas.staff import DoctorAvailableSlotsResponse, TimeSlot

_booking_mutex = threading.Lock()


def parse_time_string(time_str: str) -> time:
    """Parses 'HH:MM' or 'HH:MM:SS' string into a datetime.time object."""
    parts = [int(p) for p in time_str.strip().split(":")]
    if len(parts) == 2:
        return time(hour=parts[0], minute=parts[1], second=0)
    elif len(parts) == 3:
        return time(hour=parts[0], minute=parts[1], second=parts[2])
    raise ValueError(f"Invalid time format: {time_str}")


def time_to_seconds(t: time) -> int:
    return t.hour * 3600 + t.minute * 60 + t.second


def seconds_to_time(sec: int) -> time:
    hours = (sec // 3600) % 24
    rem = sec % 3600
    minutes = rem // 60
    seconds = rem % 60
    return time(hour=hours, minute=minutes, second=seconds)


def add_minutes_to_time(t: time, minutes: int) -> time:
    total_sec = time_to_seconds(t) + (minutes * 60)
    return seconds_to_time(total_sec)


class AppointmentService:

    @staticmethod
    def generate_appointment_uid(db: Session) -> str:
        """Generates a sequential human-readable appointment UID (APT-0001)."""
        last_appointment = (
            db.query(Appointment)
            .filter(Appointment.appointment_uid.like("APT-%"))
            .order_by(Appointment.id.desc())
            .first()
        )
        if not last_appointment or not last_appointment.appointment_uid:
            return "APT-0001"

        try:
            current_num = int(last_appointment.appointment_uid.split("-")[1])
            return f"APT-{current_num + 1:04d}"
        except (IndexError, ValueError):
            count = db.query(Appointment).count()
            return f"APT-{count + 1:04d}"

    @staticmethod
    def validate_doctor_availability(
        db: Session,
        doctor: Staff,
        scheduled_date: date,
        start_t: time,
        end_t: time,
    ) -> DoctorAvailability:
        """Verifies that the requested slot falls inside doctor's working schedule."""
        dow = scheduled_date.weekday()  # 0=Monday, 6=Sunday
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        day_name = day_names[dow]

        availabilities = (
            db.query(DoctorAvailability)
            .filter(
                DoctorAvailability.doctor_id == doctor.id,
                DoctorAvailability.day_of_week == dow,
                DoctorAvailability.is_active == True,
            )
            .all()
        )

        if not availabilities:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "OUTSIDE_AVAILABILITY",
                    "message": f"Dr. {doctor.first_name} {doctor.last_name} has no available schedule on {day_name}s.",
                },
            )

        # Check if the requested interval is within at least one working block
        within_block = False
        matching_block = None
        for block in availabilities:
            if block.start_time <= start_t and block.end_time >= end_t:
                within_block = True
                matching_block = block
                break

        if not within_block:
            blocks_str = ", ".join(
                f"{b.start_time.strftime('%H:%M')}–{b.end_time.strftime('%H:%M')}" for b in availabilities
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "OUTSIDE_WORKING_HOURS",
                    "message": (
                        f"Requested time {start_t.strftime('%H:%M')}–{end_t.strftime('%H:%M')} falls outside "
                        f"Dr. {doctor.first_name} {doctor.last_name}'s working hours on {day_name} ({blocks_str})."
                    ),
                },
            )

        return matching_block

    @staticmethod
    def check_conflicts(
        db: Session,
        doctor_id: int,
        patient_id: int,
        scheduled_date: date,
        start_t: time,
        end_t: time,
        exclude_appointment_id: Optional[int] = None,
    ) -> None:
        """
        Detects interval overlaps: [new_start, new_end) vs [existing_start, existing_end).
        Overlap condition: existing.scheduled_time < new_end AND existing.end_time > new_start.
        """
        # 1. Doctor conflict check
        doc_query = db.query(Appointment).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.scheduled_date == scheduled_date,
            Appointment.status != AppointmentStatus.CANCELLED.value,
            Appointment.scheduled_time < end_t,
            Appointment.end_time > start_t,
        )
        if exclude_appointment_id:
            doc_query = doc_query.filter(Appointment.id != exclude_appointment_id)

        conflicting_doc_apt = doc_query.first()
        if conflicting_doc_apt:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "DOCTOR_SLOT_OCCUPIED",
                    "message": (
                        f"Dr. has an existing active appointment ({conflicting_doc_apt.appointment_uid}) "
                        f"from {conflicting_doc_apt.scheduled_time.strftime('%H:%M')} to "
                        f"{conflicting_doc_apt.end_time.strftime('%H:%M')} on {scheduled_date}."
                    ),
                    "conflicting_appointment_uid": conflicting_doc_apt.appointment_uid,
                },
            )

        # 2. Patient double-booking check
        pat_query = db.query(Appointment).filter(
            Appointment.patient_id == patient_id,
            Appointment.scheduled_date == scheduled_date,
            Appointment.status != AppointmentStatus.CANCELLED.value,
            Appointment.scheduled_time < end_t,
            Appointment.end_time > start_t,
        )
        if exclude_appointment_id:
            pat_query = pat_query.filter(Appointment.id != exclude_appointment_id)

        conflicting_pat_apt = pat_query.first()
        if conflicting_pat_apt:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "PATIENT_ALREADY_BOOKED",
                    "message": (
                        f"Patient already has an active appointment ({conflicting_pat_apt.appointment_uid}) "
                        f"at {conflicting_pat_apt.scheduled_time.strftime('%H:%M')} on {scheduled_date}."
                    ),
                    "conflicting_appointment_uid": conflicting_pat_apt.appointment_uid,
                },
            )

    @staticmethod
    def create_appointment(
        db: Session,
        req: AppointmentCreateRequest,
        current_user: User,
    ) -> Appointment:
        """Books an appointment with concurrency protection, availability check, and conflict prevention."""
        # 1. Verify Patient exists and is active
        patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "PATIENT_NOT_FOUND", "message": f"Patient with ID {req.patient_id} does not exist."},
            )
        if not patient.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "PATIENT_INACTIVE", "message": "Cannot book appointment for an archived/inactive patient."},
            )

        # RBAC: Patient role can only book for themselves
        if current_user.role.name == RoleEnum.PATIENT.value:
            if patient.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"code": "FORBIDDEN", "message": "Patients can only book appointments for themselves."},
                )

        # 2. Verify Doctor exists and is active
        doctor = db.query(Staff).filter(Staff.id == req.doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "DOCTOR_NOT_FOUND", "message": f"Doctor staff with ID {req.doctor_id} does not exist."},
            )
        if not doctor.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "DOCTOR_INACTIVE", "message": "Selected doctor is currently inactive."},
            )

        # 3. Parse and validate times
        try:
            start_t = parse_time_string(req.scheduled_time)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_TIME", "message": str(e)},
            )

        if req.end_time:
            try:
                end_t = parse_time_string(req.end_time)
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "INVALID_TIME", "message": str(e)},
                )
        else:
            # Look up doctor's slot duration default or 30 mins
            dow = req.scheduled_date.weekday()
            avail = db.query(DoctorAvailability).filter(
                DoctorAvailability.doctor_id == doctor.id,
                DoctorAvailability.day_of_week == dow,
                DoctorAvailability.is_active == True,
            ).first()
            duration = avail.slot_duration_minutes if avail else 30
            end_t = add_minutes_to_time(start_t, duration)

        if end_t <= start_t:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_INTERVAL", "message": "Appointment end time must be strictly after start time."},
            )

        # 4. Check doctor availability
        AppointmentService.validate_doctor_availability(
            db=db,
            doctor=doctor,
            scheduled_date=req.scheduled_date,
            start_t=start_t,
            end_t=end_t,
        )

        # 5. Acquire concurrency lock and create appointment atomically
        with _booking_mutex:
            AppointmentService.check_conflicts(
                db=db,
                doctor_id=doctor.id,
                patient_id=patient.id,
                scheduled_date=req.scheduled_date,
                start_t=start_t,
                end_t=end_t,
            )

            uid = AppointmentService.generate_appointment_uid(db)
            appointment = Appointment(
                appointment_uid=uid,
                patient_id=patient.id,
                doctor_id=doctor.id,
                scheduled_date=req.scheduled_date,
                scheduled_time=start_t,
                end_time=end_t,
                status=AppointmentStatus.SCHEDULED.value,
                type=req.type,
                reason=req.reason,
                notes=req.notes,
                created_by_id=current_user.id,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(appointment)
            db.commit()
            db.refresh(appointment)

        return appointment

    @staticmethod
    def get_appointment(db: Session, appointment_id: int, current_user: User) -> Appointment:
        """Retrieves an appointment by ID with role-based authorization check."""
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "APPOINTMENT_NOT_FOUND", "message": f"Appointment with ID {appointment_id} does not exist."},
            )

        user_role = current_user.role.name
        if user_role == RoleEnum.PATIENT.value:
            if appointment.patient.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"code": "FORBIDDEN", "message": "You can only view your own appointments."},
                )
        elif user_role == RoleEnum.DOCTOR.value:
            # Doctors can view their own appointments
            if appointment.doctor.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"code": "FORBIDDEN", "message": "Doctors can only view appointments assigned to them."},
                )

        return appointment

    @staticmethod
    def list_appointments(
        db: Session,
        current_user: User,
        date_val: Optional[date] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        doctor_id: Optional[int] = None,
        patient_id: Optional[int] = None,
        status_val: Optional[str] = None,
        type_val: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> Tuple[List[Appointment], int, int]:
        """Lists appointments with filtering, pagination, and RBAC enforcement."""
        query = db.query(Appointment).join(Patient).join(Staff)

        user_role = current_user.role.name
        if user_role == RoleEnum.PATIENT.value:
            # Patient can only list their own appointments
            query = query.filter(Patient.user_id == current_user.id)
        elif user_role == RoleEnum.DOCTOR.value:
            # Doctor can only list appointments assigned to them
            query = query.filter(Staff.user_id == current_user.id)

        # Filters
        if date_val:
            query = query.filter(Appointment.scheduled_date == date_val)
        if date_from:
            query = query.filter(Appointment.scheduled_date >= date_from)
        if date_to:
            query = query.filter(Appointment.scheduled_date <= date_to)
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)
        if patient_id:
            query = query.filter(Appointment.patient_id == patient_id)
        if status_val:
            query = query.filter(Appointment.status == status_val.lower())
        if type_val:
            query = query.filter(Appointment.type == type_val.lower())

        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Appointment.appointment_uid.ilike(s),
                    Patient.first_name.ilike(s),
                    Patient.last_name.ilike(s),
                    Patient.patient_uid.ilike(s),
                    Staff.first_name.ilike(s),
                    Staff.last_name.ilike(s),
                )
            )

        total = query.count()
        pages = max(1, (total + per_page - 1) // per_page)
        offset = (page - 1) * per_page

        items = (
            query.order_by(Appointment.scheduled_date.asc(), Appointment.scheduled_time.asc())
            .offset(offset)
            .limit(per_page)
            .all()
        )

        return items, total, pages

    @staticmethod
    def reschedule_appointment(
        db: Session,
        appointment_id: int,
        req: AppointmentRescheduleRequest,
        current_user: User,
    ) -> Appointment:
        """Reschedules an appointment with conflict checking (self-excluded)."""
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "APPOINTMENT_NOT_FOUND", "message": "Appointment not found."},
            )

        # Check permission to reschedule
        user_role = current_user.role.name
        if user_role == RoleEnum.PATIENT.value:
            if appointment.patient.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        elif user_role == RoleEnum.DOCTOR.value:
            if appointment.doctor.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        elif user_role not in [RoleEnum.ADMIN.value, RoleEnum.RECEPTIONIST.value]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role cannot reschedule appointments.")

        if appointment.status in [AppointmentStatus.CANCELLED.value, AppointmentStatus.COMPLETED.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "CANNOT_RESCHEDULE", "message": f"Cannot reschedule a {appointment.status} appointment."},
            )

        doctor_id = req.doctor_id if req.doctor_id else appointment.doctor_id
        doctor = db.query(Staff).filter(Staff.id == doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found.")

        start_t = parse_time_string(req.scheduled_time)
        if req.end_time:
            end_t = parse_time_string(req.end_time)
        else:
            # calculate from duration of original appointment
            orig_duration = (time_to_seconds(appointment.end_time) - time_to_seconds(appointment.scheduled_time)) // 60
            end_t = add_minutes_to_time(start_t, max(15, orig_duration))

        if end_t <= start_t:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_INTERVAL", "message": "End time must be after start time."},
            )

        # Check doctor availability
        AppointmentService.validate_doctor_availability(
            db=db,
            doctor=doctor,
            scheduled_date=req.scheduled_date,
            start_t=start_t,
            end_t=end_t,
        )

        with _booking_mutex:
            AppointmentService.check_conflicts(
                db=db,
                doctor_id=doctor.id,
                patient_id=appointment.patient_id,
                scheduled_date=req.scheduled_date,
                start_t=start_t,
                end_t=end_t,
                exclude_appointment_id=appointment.id,
            )

            appointment.doctor_id = doctor.id
            appointment.scheduled_date = req.scheduled_date
            appointment.scheduled_time = start_t
            appointment.end_time = end_t
            if req.reason:
                appointment.reason = req.reason
            appointment.status = AppointmentStatus.SCHEDULED.value
            appointment.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(appointment)

        return appointment

    @staticmethod
    def update_status(
        db: Session,
        appointment_id: int,
        req: AppointmentStatusUpdateRequest,
        current_user: User,
    ) -> Appointment:
        """Applies status lifecycle rules and verifies transition permissions."""
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "APPOINTMENT_NOT_FOUND", "message": "Appointment not found."},
            )

        current_status = appointment.status
        target_status = req.status.lower()
        user_role = current_user.role.name

        # If already in target status, idempotent return
        if current_status == target_status:
            return appointment

        # Lifecycle Matrix Definition
        # { current_status: { target_status: [allowed_roles] } }
        ALLOWED_TRANSITIONS = {
            AppointmentStatus.SCHEDULED.value: {
                AppointmentStatus.CHECKED_IN.value: [RoleEnum.ADMIN.value, RoleEnum.RECEPTIONIST.value, RoleEnum.NURSE.value],
                AppointmentStatus.CANCELLED.value: [RoleEnum.ADMIN.value, RoleEnum.RECEPTIONIST.value, RoleEnum.DOCTOR.value, RoleEnum.PATIENT.value],
                AppointmentStatus.NO_SHOW.value: [RoleEnum.ADMIN.value, RoleEnum.RECEPTIONIST.value],
            },
            AppointmentStatus.CHECKED_IN.value: {
                AppointmentStatus.IN_PROGRESS.value: [RoleEnum.ADMIN.value, RoleEnum.DOCTOR.value],
                AppointmentStatus.CANCELLED.value: [RoleEnum.ADMIN.value, RoleEnum.RECEPTIONIST.value, RoleEnum.DOCTOR.value],
                AppointmentStatus.NO_SHOW.value: [RoleEnum.ADMIN.value, RoleEnum.RECEPTIONIST.value],
            },
            AppointmentStatus.IN_PROGRESS.value: {
                AppointmentStatus.COMPLETED.value: [RoleEnum.ADMIN.value, RoleEnum.DOCTOR.value],
                AppointmentStatus.CANCELLED.value: [RoleEnum.ADMIN.value, RoleEnum.DOCTOR.value],
            },
            AppointmentStatus.COMPLETED.value: {},
            AppointmentStatus.CANCELLED.value: {},
            AppointmentStatus.NO_SHOW.value: {},
        }

        valid_targets = ALLOWED_TRANSITIONS.get(current_status, {})
        if target_status not in valid_targets:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_STATUS_TRANSITION",
                    "message": f"Cannot transition appointment status from '{current_status}' to '{target_status}'.",
                },
            )

        allowed_roles = valid_targets[target_status]
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FORBIDDEN",
                    "message": f"Role '{user_role}' is not authorized to transition appointment to '{target_status}'.",
                },
            )

        # Contextual ownership check:
        if user_role == RoleEnum.PATIENT.value and appointment.patient.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": "Patients can only cancel their own appointments."},
            )
        if user_role == RoleEnum.DOCTOR.value and appointment.doctor.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": "Doctors can only modify appointments assigned to them."},
            )

        # Cancellation reason requirement
        if target_status == AppointmentStatus.CANCELLED.value:
            if not req.cancellation_reason or not req.cancellation_reason.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "CANCELLATION_REASON_REQUIRED", "message": "A cancellation reason is required."},
                )
            appointment.cancellation_reason = req.cancellation_reason.strip()

        appointment.status = target_status
        appointment.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(appointment)
        return appointment

    @staticmethod
    def get_doctor_available_slots(
        db: Session,
        doctor_id: int,
        target_date: date,
    ) -> DoctorAvailableSlotsResponse:
        """Returns calculated time slots with live availability status."""
        doctor = db.query(Staff).filter(Staff.id == doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "DOCTOR_NOT_FOUND", "message": "Doctor not found."},
            )

        dow = target_date.weekday()
        availabilities = (
            db.query(DoctorAvailability)
            .filter(
                DoctorAvailability.doctor_id == doctor.id,
                DoctorAvailability.day_of_week == dow,
                DoctorAvailability.is_active == True,
            )
            .order_by(DoctorAvailability.start_time.asc())
            .all()
        )

        # Fetch active appointments for this doctor on target_date
        booked_appointments = (
            db.query(Appointment)
            .filter(
                Appointment.doctor_id == doctor.id,
                Appointment.scheduled_date == target_date,
                Appointment.status != AppointmentStatus.CANCELLED.value,
            )
            .all()
        )

        slots: List[TimeSlot] = []

        for block in availabilities:
            start_sec = time_to_seconds(block.start_time)
            end_sec = time_to_seconds(block.end_time)
            step_sec = block.slot_duration_minutes * 60

            cur_sec = start_sec
            while cur_sec + step_sec <= end_sec:
                slot_start = seconds_to_time(cur_sec)
                slot_end = seconds_to_time(cur_sec + step_sec)

                # Check if occupied
                is_occupied = any(
                    apt.scheduled_time < slot_end and apt.end_time > slot_start
                    for apt in booked_appointments
                )

                slots.append(
                    TimeSlot(
                        start_time=slot_start.strftime("%H:%M"),
                        end_time=slot_end.strftime("%H:%M"),
                        available=not is_occupied,
                    )
                )

                cur_sec += step_sec

        return DoctorAvailableSlotsResponse(
            doctor_id=doctor.id,
            doctor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
            date=target_date,
            slots=slots,
        )
