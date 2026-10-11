import math
from datetime import datetime, timezone
from typing import Optional
from fastapi import status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.models.patient import EmergencyContact, Patient
from app.models.user import RoleEnum, User
from app.schemas.patient import (
    PaginatedPatientResponse,
    PatientCreateRequest,
    PatientSummaryResponse,
    PatientUpdateRequest,
)
from app.utils.permissions import create_api_error
from app.utils.security import hash_password


class PatientService:
    @staticmethod
    def generate_patient_uid(db: Session) -> str:
        """Generates a sequential, collision-proof patient identifier (e.g., PAT-0001)."""
        max_id = db.query(func.max(Patient.id)).scalar() or 0
        candidate_num = max_id + 1
        candidate_uid = f"PAT-{candidate_num:04d}"

        # Guarantee uniqueness against any manual or legacy records
        while db.query(Patient).filter(Patient.patient_uid == candidate_uid).first():
            candidate_num += 1
            candidate_uid = f"PAT-{candidate_num:04d}"

        return candidate_uid

    @classmethod
    def create_patient(cls, db: Session, req: PatientCreateRequest, current_user: User) -> Patient:
        """Create a new patient record with optional emergency contacts."""
        # 1. Check for duplicate phone
        existing_phone = db.query(Patient).filter(Patient.phone == req.phone.strip()).first()
        if existing_phone:
            raise create_api_error(
                status_code=status.HTTP_409_CONFLICT,
                code="DUPLICATE_PHONE",
                message=f"A patient with phone number '{req.phone}' already exists",
                field="phone",
            )

        # 2. Check for duplicate email if provided
        if req.email:
            existing_email = db.query(Patient).filter(Patient.email == req.email.strip().lower()).first()
            if existing_email:
                raise create_api_error(
                    status_code=status.HTTP_409_CONFLICT,
                    code="DUPLICATE_EMAIL",
                    message=f"A patient with email '{req.email}' already exists",
                    field="email",
                )

        # 3. Optional User login creation
        linked_user_id = None
        if req.create_login and req.email:
            # Check if user account already exists
            user_account = db.query(User).filter(User.email == req.email.strip().lower()).first()
            if not user_account:
                # Get patient role
                patient_role = db.query(User).filter(User.email == req.email.strip().lower()).first()
                from app.models.user import Role
                role_record = db.query(Role).filter(Role.name == RoleEnum.PATIENT.value).first()
                if role_record:
                    # Generate temporary initial password
                    temp_pass = f"MedFlow@{req.phone[-4:] if len(req.phone) >= 4 else '123'}"
                    user_account = User(
                        email=req.email.strip().lower(),
                        password_hash=hash_password(temp_pass),
                        full_name=f"{req.first_name} {req.last_name}",
                        role_id=role_record.id,
                        is_active=True,
                    )
                    db.add(user_account)
                    db.flush()
            if user_account:
                linked_user_id = user_account.id

        # 4. Generate unique MRN
        uid = cls.generate_patient_uid(db)

        # 5. Create patient entity
        patient = Patient(
            user_id=linked_user_id,
            patient_uid=uid,
            first_name=req.first_name.strip(),
            last_name=req.last_name.strip(),
            date_of_birth=req.date_of_birth,
            gender=req.gender,
            blood_group=req.blood_group,
            phone=req.phone.strip(),
            email=req.email.strip().lower() if req.email else None,
            address=req.address.strip() if req.address else None,
            city=req.city.strip() if req.city else None,
            state=req.state.strip() if req.state else None,
            zip_code=req.zip_code.strip() if req.zip_code else None,
            allergies=req.allergies.strip() if req.allergies else None,
            medical_history=req.medical_history.strip() if req.medical_history else None,
            notes=req.notes.strip() if req.notes else None,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(patient)
        db.flush()

        # 6. Add emergency contacts
        if req.emergency_contacts:
            for ec in req.emergency_contacts:
                contact = EmergencyContact(
                    patient_id=patient.id,
                    name=ec.name.strip(),
                    relationship=ec.relationship.strip(),
                    phone=ec.phone.strip(),
                    created_at=datetime.now(timezone.utc),
                )
                db.add(contact)

        db.commit()
        db.refresh(patient)
        return patient

    @staticmethod
    def get_patient(db: Session, patient_id: int, current_user: User) -> Patient:
        """Retrieve patient details with role-based access validation."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise create_api_error(
                status_code=status.HTTP_404_NOT_FOUND,
                code="PATIENT_NOT_FOUND",
                message=f"Patient with ID {patient_id} does not exist",
            )

        # Check authorization
        user_role = current_user.role.name if current_user.role else ""
        if user_role == RoleEnum.PATIENT.value:
            # Patient can ONLY view their own record
            if patient.user_id != current_user.id:
                raise create_api_error(
                    status_code=status.HTTP_403_FORBIDDEN,
                    code="FORBIDDEN_PATIENT_ACCESS",
                    message="You are not authorized to view another patient's medical records",
                )

        return patient

    @staticmethod
    def list_patients(
        db: Session,
        current_user: User,
        search: Optional[str] = None,
        gender: Optional[str] = None,
        blood_group: Optional[str] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        per_page: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> PaginatedPatientResponse:
        """List and search patients with pagination and filtering."""
        user_role = current_user.role.name if current_user.role else ""
        if user_role == RoleEnum.PATIENT.value:
            raise create_api_error(
                status_code=status.HTTP_403_FORBIDDEN,
                code="FORBIDDEN_ROLE",
                message="Patients are not authorized to list hospital records",
            )

        query = db.query(Patient)

        # Filtering
        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Patient.first_name.ilike(search_pattern),
                    Patient.last_name.ilike(search_pattern),
                    Patient.patient_uid.ilike(search_pattern),
                    Patient.phone.ilike(search_pattern),
                    Patient.email.ilike(search_pattern),
                )
            )

        if gender:
            query = query.filter(Patient.gender == gender.strip().lower())

        if blood_group:
            query = query.filter(Patient.blood_group == blood_group.strip().upper())

        if is_active is not None:
            query = query.filter(Patient.is_active == is_active)

        # Sorting
        sort_column = getattr(Patient, sort_by, Patient.created_at)
        if sort_order.lower() == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())

        # Total count
        total = query.count()
        pages = max(1, math.ceil(total / per_page))

        # Pagination window
        offset = (page - 1) * per_page
        items = query.offset(offset).limit(per_page).all()

        summary_items = [
            PatientSummaryResponse(
                id=p.id,
                patient_uid=p.patient_uid,
                first_name=p.first_name,
                last_name=p.last_name,
                date_of_birth=p.date_of_birth,
                gender=p.gender,
                blood_group=p.blood_group,
                phone=p.phone,
                email=p.email,
                city=p.city,
                is_active=p.is_active,
                created_at=p.created_at,
            )
            for p in items
        ]

        return PaginatedPatientResponse(
            items=summary_items,
            total=total,
            page=page,
            per_page=per_page,
            pages=pages,
        )

    @classmethod
    def update_patient(
        cls,
        db: Session,
        patient_id: int,
        req: PatientUpdateRequest,
        current_user: User,
    ) -> Patient:
        """Update patient information with role-based field restrictions."""
        patient = cls.get_patient(db, patient_id, current_user)
        user_role = current_user.role.name if current_user.role else ""

        # Role checks
        if user_role == RoleEnum.PATIENT.value:
            # Patients can only update their own demographic contact fields
            if patient.user_id != current_user.id:
                raise create_api_error(
                    status_code=status.HTTP_403_FORBIDDEN,
                    code="FORBIDDEN_PATIENT_ACCESS",
                    message="You cannot modify another patient's record",
                )
        elif user_role not in {RoleEnum.ADMIN.value, RoleEnum.RECEPTIONIST.value}:
            raise create_api_error(
                status_code=status.HTTP_403_FORBIDDEN,
                code="FORBIDDEN_ROLE",
                message="Only administrators and reception staff can modify patient demographics",
            )

        # Check phone conflict if phone is being changed
        if req.phone and req.phone.strip() != patient.phone:
            existing_phone = (
                db.query(Patient)
                .filter(Patient.phone == req.phone.strip(), Patient.id != patient.id)
                .first()
            )
            if existing_phone:
                raise create_api_error(
                    status_code=status.HTTP_409_CONFLICT,
                    code="DUPLICATE_PHONE",
                    message=f"Phone number '{req.phone}' is already registered to another patient",
                    field="phone",
                )
            patient.phone = req.phone.strip()

        # Check email conflict if email is being changed
        if req.email and req.email.strip().lower() != (patient.email or "").lower():
            existing_email = (
                db.query(Patient)
                .filter(Patient.email == req.email.strip().lower(), Patient.id != patient.id)
                .first()
            )
            if existing_email:
                raise create_api_error(
                    status_code=status.HTTP_409_CONFLICT,
                    code="DUPLICATE_EMAIL",
                    message=f"Email '{req.email}' is already registered to another patient",
                    field="email",
                )
            patient.email = req.email.strip().lower()

        # Update basic fields if provided
        if req.first_name and user_role != RoleEnum.PATIENT.value:
            patient.first_name = req.first_name.strip()
        if req.last_name and user_role != RoleEnum.PATIENT.value:
            patient.last_name = req.last_name.strip()
        if req.date_of_birth and user_role != RoleEnum.PATIENT.value:
            patient.date_of_birth = req.date_of_birth
        if req.gender and user_role != RoleEnum.PATIENT.value:
            patient.gender = req.gender
        if req.blood_group and user_role != RoleEnum.PATIENT.value:
            patient.blood_group = req.blood_group

        if req.address is not None:
            patient.address = req.address.strip() if req.address else None
        if req.city is not None:
            patient.city = req.city.strip() if req.city else None
        if req.state is not None:
            patient.state = req.state.strip() if req.state else None
        if req.zip_code is not None:
            patient.zip_code = req.zip_code.strip() if req.zip_code else None

        if req.allergies is not None and user_role != RoleEnum.PATIENT.value:
            patient.allergies = req.allergies.strip() if req.allergies else None
        if req.medical_history is not None and user_role != RoleEnum.PATIENT.value:
            patient.medical_history = req.medical_history.strip() if req.medical_history else None
        if req.notes is not None and user_role != RoleEnum.PATIENT.value:
            patient.notes = req.notes.strip() if req.notes else None

        if req.is_active is not None and user_role in {RoleEnum.ADMIN.value, RoleEnum.RECEPTIONIST.value}:
            patient.is_active = req.is_active

        # Update emergency contacts if provided
        if req.emergency_contacts is not None:
            # Delete existing
            db.query(EmergencyContact).filter(EmergencyContact.patient_id == patient.id).delete()
            for ec in req.emergency_contacts:
                contact = EmergencyContact(
                    patient_id=patient.id,
                    name=ec.name.strip(),
                    relationship=ec.relationship.strip(),
                    phone=ec.phone.strip(),
                    created_at=datetime.now(timezone.utc),
                )
                db.add(contact)

        patient.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(patient)
        return patient

    @classmethod
    def archive_patient(cls, db: Session, patient_id: int, current_user: User) -> Patient:
        """Soft-delete / archive a patient by setting is_active = False."""
        user_role = current_user.role.name if current_user.role else ""
        if user_role not in {RoleEnum.ADMIN.value, RoleEnum.RECEPTIONIST.value}:
            raise create_api_error(
                status_code=status.HTTP_403_FORBIDDEN,
                code="FORBIDDEN_ROLE",
                message="Only administrators and reception staff can archive patient records",
            )

        patient = cls.get_patient(db, patient_id, current_user)
        patient.is_active = False
        patient.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(patient)
        return patient
