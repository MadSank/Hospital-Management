from datetime import date, datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.appointment import Appointment, AppointmentStatus
from app.models.encounter import Diagnosis, DiagnosisType, Encounter, EncounterStatus, Vitals
from app.models.patient import Patient
from app.models.staff import Staff
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


class EncounterService:

    @staticmethod
    def generate_encounter_uid(db: Session) -> str:
        last = db.query(Encounter).order_by(desc(Encounter.id)).first()
        if not last:
            return "ENC-0001"
        try:
            num = int(last.encounter_uid.split("-")[1]) + 1
            return f"ENC-{num:04d}"
        except Exception:
            return f"ENC-{last.id + 1:04d}"

    @classmethod
    def create_encounter(
        cls,
        db: Session,
        data: EncounterCreate,
        current_user: User,
    ) -> EncounterDetailResponse:
        # Validate patient exists
        patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with ID {data.patient_id} not found",
            )

        # Resolve doctor
        doctor_id = data.doctor_id
        if not doctor_id:
            # If current user is doctor, look up their staff profile
            staff_profile = db.query(Staff).filter(Staff.user_id == current_user.id).first()
            if staff_profile:
                doctor_id = staff_profile.id
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="doctor_id must be provided when current user is not a doctor staff member",
                )

        doctor = db.query(Staff).filter(Staff.id == doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Doctor/Staff with ID {doctor_id} not found",
            )

        # Validate appointment if provided
        appointment = None
        if data.appointment_id:
            appointment = db.query(Appointment).filter(Appointment.id == data.appointment_id).first()
            if not appointment:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Appointment with ID {data.appointment_id} not found",
                )
            if appointment.patient_id != data.patient_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Appointment does not belong to the specified patient",
                )
            # Check if appointment already has an encounter
            existing = db.query(Encounter).filter(Encounter.appointment_id == data.appointment_id).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Appointment {appointment.appointment_uid} already has an encounter ({existing.encounter_uid})",
                )
            # Transition appointment to in_progress if currently scheduled or checked_in
            if appointment.status in [AppointmentStatus.SCHEDULED.value, AppointmentStatus.CHECKED_IN.value]:
                appointment.status = AppointmentStatus.IN_PROGRESS.value

        encounter_uid = cls.generate_encounter_uid(db)
        now_utc = datetime.now(timezone.utc)

        encounter = Encounter(
            encounter_uid=encounter_uid,
            patient_id=data.patient_id,
            doctor_id=doctor_id,
            appointment_id=data.appointment_id,
            encounter_date=now_utc,
            chief_complaint=data.chief_complaint,
            history_of_present_illness=data.history_of_present_illness,
            examination_notes=data.examination_notes,
            assessment=data.assessment,
            treatment_plan=data.treatment_plan,
            follow_up_date=data.follow_up_date,
            follow_up_notes=data.follow_up_notes,
            status=EncounterStatus.IN_PROGRESS.value,
            created_at=now_utc,
            updated_at=now_utc,
        )
        db.add(encounter)
        db.flush()

        # Add initial vitals if provided
        if data.vitals:
            staff_recorder = db.query(Staff).filter(Staff.user_id == current_user.id).first()
            vitals = Vitals(
                encounter_id=encounter.id,
                recorded_by=staff_recorder.id if staff_recorder else doctor_id,
                temperature_f=data.vitals.temperature_f,
                blood_pressure_systolic=data.vitals.blood_pressure_systolic,
                blood_pressure_diastolic=data.vitals.blood_pressure_diastolic,
                heart_rate=data.vitals.heart_rate,
                respiratory_rate=data.vitals.respiratory_rate,
                oxygen_saturation=data.vitals.oxygen_saturation,
                weight_kg=data.vitals.weight_kg,
                height_cm=data.vitals.height_cm,
                notes=data.vitals.notes,
                recorded_at=now_utc,
                created_at=now_utc,
            )
            db.add(vitals)

        # Add initial diagnoses if provided
        if data.diagnoses:
            for d in data.diagnoses:
                diag = Diagnosis(
                    encounter_id=encounter.id,
                    diagnosis_code=d.diagnosis_code,
                    diagnosis_name=d.diagnosis_name,
                    diagnosis_type=d.diagnosis_type,
                    notes=d.notes,
                    created_at=now_utc,
                )
                db.add(diag)

        db.commit()
        db.refresh(encounter)
        return cls.format_encounter_detail(encounter)

    @classmethod
    def get_encounter_detail(
        cls,
        db: Session,
        encounter_id: int,
        current_user: User,
    ) -> EncounterDetailResponse:
        encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if not encounter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Encounter with ID {encounter_id} not found",
            )

        # Patient role boundary: patients can only access their own encounters
        if current_user.role.name == RoleEnum.PATIENT.value:
            if not encounter.patient or encounter.patient.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Patients are only authorized to view their own clinical encounters",
                )

        return cls.format_encounter_detail(encounter)

    @classmethod
    def list_encounters(
        cls,
        db: Session,
        patient_id: Optional[int] = None,
        doctor_id: Optional[int] = None,
        status_filter: Optional[str] = None,
        current_user: Optional[User] = None,
    ) -> List[EncounterSummaryResponse]:
        query = db.query(Encounter)

        if current_user and current_user.role.name == RoleEnum.PATIENT.value:
            # Enforce self access
            patient_profile = db.query(Patient).filter(Patient.user_id == current_user.id).first()
            if not patient_profile:
                return []
            query = query.filter(Encounter.patient_id == patient_profile.id)
        elif patient_id:
            query = query.filter(Encounter.patient_id == patient_id)

        if doctor_id:
            query = query.filter(Encounter.doctor_id == doctor_id)

        if status_filter:
            query = query.filter(Encounter.status == status_filter)

        encounters = query.order_by(desc(Encounter.encounter_date)).all()
        results = []
        for enc in encounters:
            patient_name = f"{enc.patient.first_name} {enc.patient.last_name}" if enc.patient else "Unknown"
            patient_uid = enc.patient.patient_uid if enc.patient else ""
            doctor_name = f"Dr. {enc.doctor.first_name} {enc.doctor.last_name}" if enc.doctor else "Unknown"
            results.append(
                EncounterSummaryResponse(
                    id=enc.id,
                    encounter_uid=enc.encounter_uid,
                    patient_id=enc.patient_id,
                    patient_name=patient_name,
                    patient_uid=patient_uid,
                    doctor_id=enc.doctor_id,
                    doctor_name=doctor_name,
                    appointment_id=enc.appointment_id,
                    encounter_date=enc.encounter_date,
                    chief_complaint=enc.chief_complaint,
                    assessment=enc.assessment,
                    status=enc.status,
                    created_at=enc.created_at,
                )
            )
        return results

    @classmethod
    def update_encounter(
        cls,
        db: Session,
        encounter_id: int,
        data: EncounterUpdate,
        current_user: User,
    ) -> EncounterDetailResponse:
        encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if not encounter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Encounter with ID {encounter_id} not found",
            )

        if current_user.role.name == RoleEnum.DOCTOR.value:
            doctor_staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
            if not doctor_staff or encounter.doctor_id != doctor_staff.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Doctors can only edit their own clinical encounters",
                )
        elif current_user.role.name not in [RoleEnum.ADMIN.value, RoleEnum.DOCTOR.value]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only doctors or administrators can modify clinical encounter notes",
            )

        if data.chief_complaint is not None:
            encounter.chief_complaint = data.chief_complaint
        if data.history_of_present_illness is not None:
            encounter.history_of_present_illness = data.history_of_present_illness
        if data.examination_notes is not None:
            encounter.examination_notes = data.examination_notes
        if data.assessment is not None:
            encounter.assessment = data.assessment
        if data.treatment_plan is not None:
            encounter.treatment_plan = data.treatment_plan
        if data.follow_up_date is not None:
            encounter.follow_up_date = data.follow_up_date
        if data.follow_up_notes is not None:
            encounter.follow_up_notes = data.follow_up_notes
        if data.status is not None:
            encounter.status = data.status

        encounter.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(encounter)
        return cls.format_encounter_detail(encounter)

    @classmethod
    def complete_encounter(
        cls,
        db: Session,
        encounter_id: int,
        current_user: User,
    ) -> EncounterDetailResponse:
        encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if not encounter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Encounter with ID {encounter_id} not found",
            )

        if current_user.role.name == RoleEnum.DOCTOR.value:
            doctor_staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
            if not doctor_staff or encounter.doctor_id != doctor_staff.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Doctors can only complete their own encounters",
                )
        elif current_user.role.name != RoleEnum.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only authorized doctors or administrators can complete clinical encounters",
            )

        encounter.status = EncounterStatus.COMPLETED.value
        encounter.updated_at = datetime.now(timezone.utc)

        # If linked to an appointment, also complete the appointment
        if encounter.appointment:
            encounter.appointment.status = AppointmentStatus.COMPLETED.value
            encounter.appointment.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(encounter)
        return cls.format_encounter_detail(encounter)

    @classmethod
    def add_vitals(
        cls,
        db: Session,
        encounter_id: int,
        data: VitalsCreate,
        current_user: User,
    ) -> VitalsResponse:
        encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if not encounter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Encounter with ID {encounter_id} not found",
            )

        recorder_staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
        now_utc = datetime.now(timezone.utc)

        vitals = Vitals(
            encounter_id=encounter_id,
            recorded_by=recorder_staff.id if recorder_staff else None,
            temperature_f=data.temperature_f,
            blood_pressure_systolic=data.blood_pressure_systolic,
            blood_pressure_diastolic=data.blood_pressure_diastolic,
            heart_rate=data.heart_rate,
            respiratory_rate=data.respiratory_rate,
            oxygen_saturation=data.oxygen_saturation,
            weight_kg=data.weight_kg,
            height_cm=data.height_cm,
            notes=data.notes,
            recorded_at=now_utc,
            created_at=now_utc,
        )
        db.add(vitals)
        db.commit()
        db.refresh(vitals)

        recorder_name = f"{recorder_staff.first_name} {recorder_staff.last_name}" if recorder_staff else None
        return VitalsResponse(
            id=vitals.id,
            encounter_id=vitals.encounter_id,
            recorded_by=vitals.recorded_by,
            recorded_by_name=recorder_name,
            temperature_f=float(vitals.temperature_f) if vitals.temperature_f is not None else None,
            blood_pressure_systolic=vitals.blood_pressure_systolic,
            blood_pressure_diastolic=vitals.blood_pressure_diastolic,
            heart_rate=vitals.heart_rate,
            respiratory_rate=vitals.respiratory_rate,
            oxygen_saturation=float(vitals.oxygen_saturation) if vitals.oxygen_saturation is not None else None,
            weight_kg=float(vitals.weight_kg) if vitals.weight_kg is not None else None,
            height_cm=float(vitals.height_cm) if vitals.height_cm is not None else None,
            notes=vitals.notes,
            recorded_at=vitals.recorded_at,
            created_at=vitals.created_at,
        )

    @classmethod
    def add_diagnosis(
        cls,
        db: Session,
        encounter_id: int,
        data: DiagnosisCreate,
        current_user: User,
    ) -> DiagnosisResponse:
        encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if not encounter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Encounter with ID {encounter_id} not found",
            )

        now_utc = datetime.now(timezone.utc)
        diagnosis = Diagnosis(
            encounter_id=encounter_id,
            diagnosis_code=data.diagnosis_code,
            diagnosis_name=data.diagnosis_name,
            diagnosis_type=data.diagnosis_type,
            notes=data.notes,
            created_at=now_utc,
        )
        db.add(diagnosis)
        db.commit()
        db.refresh(diagnosis)

        return DiagnosisResponse(
            id=diagnosis.id,
            encounter_id=diagnosis.encounter_id,
            diagnosis_name=diagnosis.diagnosis_name,
            diagnosis_code=diagnosis.diagnosis_code,
            diagnosis_type=diagnosis.diagnosis_type,
            notes=diagnosis.notes,
            created_at=diagnosis.created_at,
        )

    @staticmethod
    def format_encounter_detail(enc: Encounter) -> EncounterDetailResponse:
        patient = enc.patient
        doctor = enc.doctor
        appointment = enc.appointment

        vitals_list = []
        for v in enc.vitals:
            rec_name = f"{v.recorder.first_name} {v.recorder.last_name}" if v.recorder else None
            vitals_list.append(
                VitalsResponse(
                    id=v.id,
                    encounter_id=v.encounter_id,
                    recorded_by=v.recorded_by,
                    recorded_by_name=rec_name,
                    temperature_f=float(v.temperature_f) if v.temperature_f is not None else None,
                    blood_pressure_systolic=v.blood_pressure_systolic,
                    blood_pressure_diastolic=v.blood_pressure_diastolic,
                    heart_rate=v.heart_rate,
                    respiratory_rate=v.respiratory_rate,
                    oxygen_saturation=float(v.oxygen_saturation) if v.oxygen_saturation is not None else None,
                    weight_kg=float(v.weight_kg) if v.weight_kg is not None else None,
                    height_cm=float(v.height_cm) if v.height_cm is not None else None,
                    notes=v.notes,
                    recorded_at=v.recorded_at,
                    created_at=v.created_at,
                )
            )

        diagnoses_list = [
            DiagnosisResponse(
                id=d.id,
                encounter_id=d.encounter_id,
                diagnosis_name=d.diagnosis_name,
                diagnosis_code=d.diagnosis_code,
                diagnosis_type=d.diagnosis_type,
                notes=d.notes,
                created_at=d.created_at,
            )
            for d in enc.diagnoses
        ]

        return EncounterDetailResponse(
            id=enc.id,
            encounter_uid=enc.encounter_uid,
            patient_id=enc.patient_id,
            patient_name=f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
            patient_uid=patient.patient_uid if patient else "",
            patient_gender=patient.gender if patient else None,
            patient_dob=patient.date_of_birth if patient else None,
            patient_allergies=patient.allergies if patient else None,
            doctor_id=enc.doctor_id,
            doctor_name=f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else "Unknown",
            doctor_specialty=doctor.specialty if doctor else None,
            appointment_id=enc.appointment_id,
            appointment_uid=appointment.appointment_uid if appointment else None,
            encounter_date=enc.encounter_date,
            chief_complaint=enc.chief_complaint,
            history_of_present_illness=enc.history_of_present_illness,
            examination_notes=enc.examination_notes,
            assessment=enc.assessment,
            treatment_plan=enc.treatment_plan,
            follow_up_date=enc.follow_up_date,
            follow_up_notes=enc.follow_up_notes,
            status=enc.status,
            created_at=enc.created_at,
            updated_at=enc.updated_at,
            vitals=vitals_list,
            diagnoses=diagnoses_list,
        )
