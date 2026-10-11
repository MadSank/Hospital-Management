from datetime import datetime, timezone
import threading
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.inpatient import (
    Admission,
    AdmissionStatus,
    Bed,
    BedStatus,
    Ward,
    WardType,
)
from app.models.patient import Patient
from app.models.staff import Staff
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

_admission_mutex = threading.Lock()


class InpatientService:

    @staticmethod
    def generate_admission_uid(db: Session) -> str:
        last = db.query(Admission).order_by(desc(Admission.id)).first()
        if not last:
            return "ADM-0001"
        try:
            num = int(last.admission_uid.split("-")[1]) + 1
            return f"ADM-{num:04d}"
        except Exception:
            return f"ADM-{last.id + 1:04d}"

    # --- Wards & Beds ---
    @classmethod
    def list_wards(cls, db: Session) -> List[WardResponse]:
        wards = db.query(Ward).filter(Ward.is_active == True).order_by(Ward.name).all()
        results = []
        for w in wards:
            total_beds = len(w.beds)
            avail_beds = sum(1 for b in w.beds if b.status == BedStatus.AVAILABLE.value and b.is_active)
            occ_beds = sum(1 for b in w.beds if b.status == BedStatus.OCCUPIED.value and b.is_active)
            results.append(
                WardResponse(
                    id=w.id,
                    name=w.name,
                    ward_type=w.ward_type,
                    floor=w.floor,
                    capacity=w.capacity,
                    is_active=w.is_active,
                    total_beds=total_beds,
                    available_beds=avail_beds,
                    occupied_beds=occ_beds,
                    created_at=w.created_at,
                )
            )
        return results

    @classmethod
    def get_ward_with_beds(cls, db: Session, ward_id: int) -> WardWithBedsResponse:
        ward = db.query(Ward).filter(Ward.id == ward_id).first()
        if not ward:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ward with ID {ward_id} not found",
            )

        beds_list = []
        for b in ward.beds:
            # Find active admission if occupied
            curr_adm = (
                db.query(Admission)
                .filter(
                    Admission.bed_id == b.id,
                    Admission.status == AdmissionStatus.ADMITTED.value,
                )
                .first()
            )
            patient_id = curr_adm.patient_id if curr_adm else None
            patient_name = f"{curr_adm.patient.first_name} {curr_adm.patient.last_name}" if curr_adm and curr_adm.patient else None
            adm_id = curr_adm.id if curr_adm else None

            beds_list.append(
                BedResponse(
                    id=b.id,
                    ward_id=b.ward_id,
                    bed_number=b.bed_number,
                    bed_type=b.bed_type,
                    status=b.status,
                    daily_rate=float(b.daily_rate),
                    is_active=b.is_active,
                    current_patient_id=patient_id,
                    current_patient_name=patient_name,
                    current_admission_id=adm_id,
                    created_at=b.created_at,
                )
            )

        total_beds = len(ward.beds)
        avail_beds = sum(1 for b in ward.beds if b.status == BedStatus.AVAILABLE.value and b.is_active)
        occ_beds = sum(1 for b in ward.beds if b.status == BedStatus.OCCUPIED.value and b.is_active)

        return WardWithBedsResponse(
            id=ward.id,
            name=ward.name,
            ward_type=ward.ward_type,
            floor=ward.floor,
            capacity=ward.capacity,
            is_active=ward.is_active,
            total_beds=total_beds,
            available_beds=avail_beds,
            occupied_beds=occ_beds,
            created_at=ward.created_at,
            beds=beds_list,
        )

    @classmethod
    def create_ward(cls, db: Session, data: WardCreate) -> WardResponse:
        existing = db.query(Ward).filter(Ward.name.ilike(data.name.strip())).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ward with name '{data.name}' already exists",
            )

        now_utc = datetime.now(timezone.utc)
        ward = Ward(
            name=data.name.strip(),
            ward_type=data.ward_type,
            floor=data.floor,
            capacity=data.capacity,
            is_active=True,
            created_at=now_utc,
            updated_at=now_utc,
        )
        db.add(ward)
        db.commit()
        db.refresh(ward)

        return WardResponse(
            id=ward.id,
            name=ward.name,
            ward_type=ward.ward_type,
            floor=ward.floor,
            capacity=ward.capacity,
            is_active=ward.is_active,
            total_beds=0,
            available_beds=0,
            occupied_beds=0,
            created_at=ward.created_at,
        )

    @classmethod
    def add_bed_to_ward(cls, db: Session, ward_id: int, data: BedCreate) -> BedResponse:
        ward = db.query(Ward).filter(Ward.id == ward_id).first()
        if not ward:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ward with ID {ward_id} not found",
            )

        # Check unique bed number in this ward
        existing = (
            db.query(Bed)
            .filter(
                Bed.ward_id == ward_id,
                Bed.bed_number == data.bed_number.strip(),
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Bed '{data.bed_number}' already exists in ward '{ward.name}'",
            )

        now_utc = datetime.now(timezone.utc)
        bed = Bed(
            ward_id=ward_id,
            bed_number=data.bed_number.strip(),
            bed_type=data.bed_type,
            status=BedStatus.AVAILABLE.value,
            daily_rate=data.daily_rate,
            is_active=True,
            created_at=now_utc,
            updated_at=now_utc,
        )
        db.add(bed)
        db.commit()
        db.refresh(bed)

        return BedResponse(
            id=bed.id,
            ward_id=bed.ward_id,
            bed_number=bed.bed_number,
            bed_type=bed.bed_type,
            status=bed.status,
            daily_rate=float(bed.daily_rate),
            is_active=bed.is_active,
            current_patient_id=None,
            current_patient_name=None,
            current_admission_id=None,
            created_at=bed.created_at,
        )

    @classmethod
    def update_bed_status(
        cls,
        db: Session,
        bed_id: int,
        data: BedUpdateStatus,
    ) -> BedResponse:
        bed = db.query(Bed).filter(Bed.id == bed_id).first()
        if not bed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bed with ID {bed_id} not found",
            )

        # Validation: cannot set to 'available' if there is an active admission in this bed
        active_adm = (
            db.query(Admission)
            .filter(
                Admission.bed_id == bed_id,
                Admission.status == AdmissionStatus.ADMITTED.value,
            )
            .first()
        )
        if active_adm and data.status != BedStatus.OCCUPIED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bed cannot be changed to '{data.status}' while patient {active_adm.patient.first_name} is actively admitted",
            )

        bed.status = data.status
        bed.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(bed)

        return BedResponse(
            id=bed.id,
            ward_id=bed.ward_id,
            bed_number=bed.bed_number,
            bed_type=bed.bed_type,
            status=bed.status,
            daily_rate=float(bed.daily_rate),
            is_active=bed.is_active,
            current_patient_id=active_adm.patient_id if active_adm else None,
            current_patient_name=f"{active_adm.patient.first_name} {active_adm.patient.last_name}" if active_adm else None,
            current_admission_id=active_adm.id if active_adm else None,
            created_at=bed.created_at,
        )

    # --- Admissions ---
    @classmethod
    def admit_patient(
        cls,
        db: Session,
        data: AdmissionCreate,
        current_user: User,
    ) -> AdmissionResponse:
        with _admission_mutex:
            # Validate patient
            patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
            if not patient:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Patient with ID {data.patient_id} not found",
                )

            # Check if patient already has an active admission
            existing_active_patient = (
                db.query(Admission)
                .filter(
                    Admission.patient_id == data.patient_id,
                    Admission.status == AdmissionStatus.ADMITTED.value,
                )
                .first()
            )
            if existing_active_patient:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Patient {patient.patient_uid} already has an active admission ({existing_active_patient.admission_uid}) in bed #{existing_active_patient.bed.bed_number}",
                )

            # Validate bed
            bed = db.query(Bed).filter(Bed.id == data.bed_id).first()
            if not bed:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Bed with ID {data.bed_id} not found",
                )
            if not bed.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Bed {bed.bed_number} is inactive",
                )
            if bed.status != BedStatus.AVAILABLE.value:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Bed {bed.bed_number} is not available (current status: '{bed.status}')",
                )

            # Double check no active admission holds this bed
            existing_active_bed = (
                db.query(Admission)
                .filter(
                    Admission.bed_id == data.bed_id,
                    Admission.status == AdmissionStatus.ADMITTED.value,
                )
                .first()
            )
            if existing_active_bed:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Bed {bed.bed_number} is already occupied by admission {existing_active_bed.admission_uid}",
                )

            # Resolve doctor
            doctor_id = data.admitting_doctor_id
            if not doctor_id:
                staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
                if staff:
                    doctor_id = staff.id
                else:
                    first_doc = db.query(Staff).first()
                    if first_doc:
                        doctor_id = first_doc.id
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="admitting_doctor_id is required",
                        )

            doc = db.query(Staff).filter(Staff.id == doctor_id).first()
            if not doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Doctor with ID {doctor_id} not found",
                )

            adm_uid = cls.generate_admission_uid(db)
            now_utc = data.admission_date or datetime.now(timezone.utc)

            admission = Admission(
                admission_uid=adm_uid,
                patient_id=data.patient_id,
                bed_id=data.bed_id,
                admitting_doctor_id=doctor_id,
                admission_date=now_utc,
                status=AdmissionStatus.ADMITTED.value,
                reason=data.reason.strip(),
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(admission)

            # Update bed to occupied
            bed.status = BedStatus.OCCUPIED.value
            bed.updated_at = datetime.now(timezone.utc)

            db.commit()
            db.refresh(admission)
            return cls.format_admission_response(admission)

    @classmethod
    def transfer_patient(
        cls,
        db: Session,
        admission_id: int,
        data: AdmissionTransferRequest,
        current_user: User,
    ) -> AdmissionResponse:
        with _admission_mutex:
            admission = db.query(Admission).filter(Admission.id == admission_id).first()
            if not admission:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Admission with ID {admission_id} not found",
                )

            if admission.status != AdmissionStatus.ADMITTED.value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot transfer patient in '{admission.status}' status. Only active admissions can be transferred.",
                )

            if admission.bed_id == data.new_bed_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Target bed must be different from the currently assigned bed",
                )

            # Check new bed
            new_bed = db.query(Bed).filter(Bed.id == data.new_bed_id).first()
            if not new_bed:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Target bed with ID {data.new_bed_id} not found",
                )
            if not new_bed.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Target bed {new_bed.bed_number} is inactive",
                )
            if new_bed.status != BedStatus.AVAILABLE.value:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Target bed {new_bed.bed_number} is not available (current status: '{new_bed.status}')",
                )

            now_utc = datetime.now(timezone.utc)

            # Free old bed
            old_bed = admission.bed
            if old_bed:
                old_bed.status = BedStatus.AVAILABLE.value
                old_bed.updated_at = now_utc

            # Occupy new bed
            new_bed.status = BedStatus.OCCUPIED.value
            new_bed.updated_at = now_utc

            # Mark old admission as transferred
            admission.status = AdmissionStatus.TRANSFERRED.value
            admission.discharge_date = now_utc
            admission.discharge_summary = f"Transferred to Bed {new_bed.bed_number} ({new_bed.ward.name}). Reason: {data.reason}"
            admission.updated_at = now_utc

            # Create new admission record
            new_adm_uid = cls.generate_admission_uid(db)
            new_admission = Admission(
                admission_uid=new_adm_uid,
                patient_id=admission.patient_id,
                bed_id=new_bed.id,
                admitting_doctor_id=admission.admitting_doctor_id,
                admission_date=now_utc,
                status=AdmissionStatus.ADMITTED.value,
                reason=f"Transferred: {data.reason}",
                created_at=now_utc,
                updated_at=now_utc,
            )
            db.add(new_admission)

            db.commit()
            db.refresh(new_admission)
            return cls.format_admission_response(new_admission)

    @classmethod
    def discharge_patient(
        cls,
        db: Session,
        admission_id: int,
        data: AdmissionDischargeRequest,
        current_user: User,
    ) -> AdmissionResponse:
        with _admission_mutex:
            admission = db.query(Admission).filter(Admission.id == admission_id).first()
            if not admission:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Admission with ID {admission_id} not found",
                )

            if admission.status != AdmissionStatus.ADMITTED.value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot discharge patient in '{admission.status}' status. Only active admissions can be discharged.",
                )

            now_utc = datetime.now(timezone.utc)

            # Release bed
            bed = admission.bed
            if bed:
                bed.status = BedStatus.AVAILABLE.value
                bed.updated_at = now_utc

            admission.status = AdmissionStatus.DISCHARGED.value
            admission.discharge_date = now_utc
            if data.discharge_summary:
                admission.discharge_summary = data.discharge_summary
            if data.discharge_notes:
                admission.discharge_notes = data.discharge_notes
            admission.updated_at = now_utc

            db.commit()
            db.refresh(admission)
            return cls.format_admission_response(admission)

    @classmethod
    def list_admissions(
        cls,
        db: Session,
        patient_id: Optional[int] = None,
        status_filter: Optional[str] = None,
        ward_id: Optional[int] = None,
        current_user: Optional[User] = None,
    ) -> List[AdmissionResponse]:
        query = db.query(Admission)

        if current_user and current_user.role.name == RoleEnum.PATIENT.value:
            patient_profile = db.query(Patient).filter(Patient.user_id == current_user.id).first()
            if not patient_profile:
                return []
            query = query.filter(Admission.patient_id == patient_profile.id)
        elif patient_id:
            query = query.filter(Admission.patient_id == patient_id)

        if status_filter:
            query = query.filter(Admission.status == status_filter)

        if ward_id:
            query = query.join(Bed).filter(Bed.ward_id == ward_id)

        admissions = query.order_by(desc(Admission.admission_date)).all()
        return [cls.format_admission_response(a) for a in admissions]

    @classmethod
    def get_admission(
        cls,
        db: Session,
        admission_id: int,
        current_user: User,
    ) -> AdmissionResponse:
        admission = db.query(Admission).filter(Admission.id == admission_id).first()
        if not admission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Admission with ID {admission_id} not found",
            )

        if current_user.role.name == RoleEnum.PATIENT.value:
            if not admission.patient or admission.patient.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Patients are only authorized to view their own admissions",
                )

        return cls.format_admission_response(admission)

    @staticmethod
    def format_admission_response(a: Admission) -> AdmissionResponse:
        patient = a.patient
        bed = a.bed
        ward = bed.ward if bed else None
        doc = a.admitting_doctor

        return AdmissionResponse(
            id=a.id,
            admission_uid=a.admission_uid,
            patient_id=a.patient_id,
            patient_name=f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
            patient_uid=patient.patient_uid if patient else "",
            bed_id=a.bed_id,
            bed_number=bed.bed_number if bed else "",
            ward_id=ward.id if ward else 0,
            ward_name=ward.name if ward else "Unknown",
            admitting_doctor_id=a.admitting_doctor_id,
            admitting_doctor_name=f"Dr. {doc.first_name} {doc.last_name}" if doc else "Unknown",
            admission_date=a.admission_date,
            discharge_date=a.discharge_date,
            status=a.status,
            reason=a.reason,
            discharge_summary=a.discharge_summary,
            discharge_notes=a.discharge_notes,
            created_at=a.created_at,
            updated_at=a.updated_at,
        )
