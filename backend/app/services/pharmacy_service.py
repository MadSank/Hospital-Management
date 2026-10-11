from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.models.encounter import Encounter
from app.models.patient import Patient
from app.models.pharmacy import (
    Medicine,
    MedicineBatch,
    Prescription,
    PrescriptionItem,
    PrescriptionStatus,
    StockMovement,
    StockMovementType,
)
from app.models.staff import Staff
from app.models.user import RoleEnum, User
from app.schemas.pharmacy import (
    DispenseItemRequest,
    DispenseRequest,
    ExpiringBatchItem,
    MedicineBatchCreate,
    MedicineBatchResponse,
    MedicineCreate,
    MedicineResponse,
    MedicineUpdate,
    PrescriptionCreate,
    PrescriptionItemResponse,
    PrescriptionResponse,
    StockAlertItem,
    StockAlertsResponse,
    StockMovementResponse,
)


class PharmacyService:

    @staticmethod
    def generate_medicine_uid(db: Session) -> str:
        last = db.query(Medicine).order_by(desc(Medicine.id)).first()
        if not last:
            return "MED-0001"
        try:
            num = int(last.medicine_uid.split("-")[1]) + 1
            return f"MED-{num:04d}"
        except Exception:
            return f"MED-{last.id + 1:04d}"

    @staticmethod
    def generate_prescription_uid(db: Session) -> str:
        last = db.query(Prescription).order_by(desc(Prescription.id)).first()
        if not last:
            return "PRE-0001"
        try:
            num = int(last.prescription_uid.split("-")[1]) + 1
            return f"PRE-{num:04d}"
        except Exception:
            return f"PRE-{last.id + 1:04d}"

    @classmethod
    def list_medicines(
        cls,
        db: Session,
        search: Optional[str] = None,
        category: Optional[str] = None,
        form: Optional[str] = None,
        is_active: Optional[bool] = None,
        low_stock_only: bool = False,
    ) -> List[MedicineResponse]:
        query = db.query(Medicine)

        if is_active is not None:
            query = query.filter(Medicine.is_active == is_active)
        else:
            query = query.filter(Medicine.is_active == True)

        if category:
            query = query.filter(Medicine.category.ilike(f"%{category}%"))

        if form:
            query = query.filter(Medicine.form.ilike(f"%{form}%"))

        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Medicine.name.ilike(s),
                    Medicine.generic_name.ilike(s),
                    Medicine.medicine_uid.ilike(s),
                    Medicine.manufacturer.ilike(s),
                )
            )

        medicines = query.order_by(Medicine.name).all()
        results = []
        for med in medicines:
            total_stock = sum(b.quantity_remaining for b in med.batches if b.quantity_remaining > 0)
            if low_stock_only and total_stock > med.reorder_level:
                continue

            batches = [
                MedicineBatchResponse(
                    id=b.id,
                    medicine_id=b.medicine_id,
                    batch_number=b.batch_number,
                    quantity_received=b.quantity_received,
                    quantity_remaining=b.quantity_remaining,
                    expiry_date=b.expiry_date,
                    received_date=b.received_date,
                    supplier=b.supplier,
                    cost_per_unit=float(b.cost_per_unit) if b.cost_per_unit is not None else None,
                    created_at=b.created_at,
                )
                for b in med.batches
            ]

            results.append(
                MedicineResponse(
                    id=med.id,
                    medicine_uid=med.medicine_uid,
                    name=med.name,
                    generic_name=med.generic_name,
                    category=med.category,
                    form=med.form,
                    strength=med.strength,
                    manufacturer=med.manufacturer,
                    unit_price=float(med.unit_price),
                    reorder_level=med.reorder_level,
                    is_active=med.is_active,
                    total_stock=total_stock,
                    created_at=med.created_at,
                    updated_at=med.updated_at,
                    batches=batches,
                )
            )
        return results

    @classmethod
    def create_medicine(cls, db: Session, data: MedicineCreate) -> MedicineResponse:
        existing = db.query(Medicine).filter(Medicine.name.ilike(data.name.strip())).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Medicine with name '{data.name}' already exists ({existing.medicine_uid})",
            )

        med_uid = cls.generate_medicine_uid(db)
        now_utc = datetime.now(timezone.utc)

        med = Medicine(
            medicine_uid=med_uid,
            name=data.name.strip(),
            generic_name=data.generic_name.strip() if data.generic_name else None,
            category=data.category.strip() if data.category else None,
            form=data.form.lower(),
            strength=data.strength.strip() if data.strength else None,
            manufacturer=data.manufacturer.strip() if data.manufacturer else None,
            unit_price=data.unit_price,
            reorder_level=data.reorder_level,
            is_active=True,
            created_at=now_utc,
            updated_at=now_utc,
        )
        db.add(med)
        db.commit()
        db.refresh(med)

        return MedicineResponse(
            id=med.id,
            medicine_uid=med.medicine_uid,
            name=med.name,
            generic_name=med.generic_name,
            category=med.category,
            form=med.form,
            strength=med.strength,
            manufacturer=med.manufacturer,
            unit_price=float(med.unit_price),
            reorder_level=med.reorder_level,
            is_active=med.is_active,
            total_stock=0,
            created_at=med.created_at,
            updated_at=med.updated_at,
            batches=[],
        )

    @classmethod
    def add_medicine_batch(
        cls,
        db: Session,
        medicine_id: int,
        data: MedicineBatchCreate,
        current_user: User,
    ) -> MedicineBatchResponse:
        med = db.query(Medicine).filter(Medicine.id == medicine_id).first()
        if not med:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Medicine with ID {medicine_id} not found",
            )

        # Check unique batch number for this medicine
        existing = (
            db.query(MedicineBatch)
            .filter(
                MedicineBatch.medicine_id == medicine_id,
                MedicineBatch.batch_number == data.batch_number.strip(),
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Batch number '{data.batch_number}' already exists for {med.name}",
            )

        now_utc = datetime.now(timezone.utc)
        recv_date = data.received_date or date.today()

        batch = MedicineBatch(
            medicine_id=medicine_id,
            batch_number=data.batch_number.strip(),
            quantity_received=data.quantity_received,
            quantity_remaining=data.quantity_received,
            expiry_date=data.expiry_date,
            received_date=recv_date,
            supplier=data.supplier,
            cost_per_unit=data.cost_per_unit,
            created_at=now_utc,
            updated_at=now_utc,
        )
        db.add(batch)
        db.flush()

        # Audit stock movement
        movement = StockMovement(
            medicine_id=medicine_id,
            batch_id=batch.id,
            movement_type=StockMovementType.RECEIPT.value,
            quantity=data.quantity_received,
            reference_type="purchase_order",
            reference_id=batch.id,
            performed_by=current_user.id,
            notes=f"Received batch {batch.batch_number} from {data.supplier or 'Supplier'}",
            created_at=now_utc,
        )
        db.add(movement)
        db.commit()
        db.refresh(batch)

        return MedicineBatchResponse(
            id=batch.id,
            medicine_id=batch.medicine_id,
            batch_number=batch.batch_number,
            quantity_received=batch.quantity_received,
            quantity_remaining=batch.quantity_remaining,
            expiry_date=batch.expiry_date,
            received_date=batch.received_date,
            supplier=batch.supplier,
            cost_per_unit=float(batch.cost_per_unit) if batch.cost_per_unit is not None else None,
            created_at=batch.created_at,
        )

    @classmethod
    def create_prescription(
        cls,
        db: Session,
        data: PrescriptionCreate,
        current_user: User,
    ) -> PrescriptionResponse:
        # Validate patient
        patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with ID {data.patient_id} not found",
            )

        # Validate encounter
        encounter = db.query(Encounter).filter(Encounter.id == data.encounter_id).first()
        if not encounter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Encounter with ID {data.encounter_id} not found",
            )

        if not data.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Prescription must contain at least one medicine item",
            )

        # Resolve doctor
        doctor_id = data.doctor_id
        if not doctor_id:
            staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
            if staff:
                doctor_id = staff.id
            else:
                doctor_id = encounter.doctor_id

        doctor = db.query(Staff).filter(Staff.id == doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Doctor with ID {doctor_id} not found",
            )

        pre_uid = cls.generate_prescription_uid(db)
        now_utc = datetime.now(timezone.utc)

        prescription = Prescription(
            prescription_uid=pre_uid,
            encounter_id=data.encounter_id,
            patient_id=data.patient_id,
            doctor_id=doctor_id,
            status=PrescriptionStatus.PENDING.value,
            notes=data.notes,
            prescribed_date=now_utc,
            created_at=now_utc,
            updated_at=now_utc,
        )
        db.add(prescription)
        db.flush()

        for item_in in data.items:
            med = db.query(Medicine).filter(Medicine.id == item_in.medicine_id).first()
            if not med:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Medicine with ID {item_in.medicine_id} not found",
                )
            if not med.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Medicine '{med.name}' is inactive and cannot be prescribed",
                )

            item = PrescriptionItem(
                prescription_id=prescription.id,
                medicine_id=med.id,
                dosage=item_in.dosage,
                frequency=item_in.frequency,
                route=item_in.route,
                duration=item_in.duration,
                quantity=item_in.quantity,
                instructions=item_in.instructions,
                is_dispensed=False,
                dispensed_quantity=0,
                created_at=now_utc,
            )
            db.add(item)

        db.commit()
        db.refresh(prescription)
        return cls.format_prescription_response(prescription)

    @classmethod
    def list_prescriptions(
        cls,
        db: Session,
        patient_id: Optional[int] = None,
        status_filter: Optional[str] = None,
        current_user: Optional[User] = None,
    ) -> List[PrescriptionResponse]:
        query = db.query(Prescription)

        if current_user and current_user.role.name == RoleEnum.PATIENT.value:
            patient_profile = db.query(Patient).filter(Patient.user_id == current_user.id).first()
            if not patient_profile:
                return []
            query = query.filter(Prescription.patient_id == patient_profile.id)
        elif patient_id:
            query = query.filter(Prescription.patient_id == patient_id)

        if status_filter:
            query = query.filter(Prescription.status == status_filter)

        prescriptions = query.order_by(desc(Prescription.prescribed_date)).all()
        return [cls.format_prescription_response(p) for p in prescriptions]

    @classmethod
    def get_prescription(
        cls,
        db: Session,
        prescription_id: int,
        current_user: User,
    ) -> PrescriptionResponse:
        prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
        if not prescription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prescription with ID {prescription_id} not found",
            )

        if current_user.role.name == RoleEnum.PATIENT.value:
            if not prescription.patient or prescription.patient.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Patients are only authorized to view their own prescriptions",
                )

        return cls.format_prescription_response(prescription)

    @classmethod
    def dispense_prescription(
        cls,
        db: Session,
        data: DispenseRequest,
        current_user: User,
    ) -> PrescriptionResponse:
        prescription = db.query(Prescription).filter(Prescription.id == data.prescription_id).first()
        if not prescription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prescription with ID {data.prescription_id} not found",
            )

        if prescription.status not in [PrescriptionStatus.PENDING.value, PrescriptionStatus.PARTIALLY_DISPENSED.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Prescription is already in '{prescription.status}' state and cannot be dispensed",
            )

        now_utc = datetime.now(timezone.utc)

        # Process each requested dispense item in a safe transaction
        for req_item in data.items:
            item = (
                db.query(PrescriptionItem)
                .filter(
                    PrescriptionItem.id == req_item.prescription_item_id,
                    PrescriptionItem.prescription_id == prescription.id,
                )
                .first()
            )
            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Prescription item {req_item.prescription_item_id} does not belong to prescription {prescription.prescription_uid}",
                )

            remaining_to_dispense = item.quantity - item.dispensed_quantity
            if req_item.quantity > remaining_to_dispense:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot dispense {req_item.quantity} units for {item.medicine.name}. Remaining needed: {remaining_to_dispense}",
                )

            qty_needed = req_item.quantity

            # If specific batch provided
            if req_item.batch_id:
                batch = (
                    db.query(MedicineBatch)
                    .filter(
                        MedicineBatch.id == req_item.batch_id,
                        MedicineBatch.medicine_id == item.medicine_id,
                    )
                    .first()
                )
                if not batch:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Batch {req_item.batch_id} not found for medicine {item.medicine.name}",
                    )
                if batch.quantity_remaining < qty_needed:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Batch {batch.batch_number} has insufficient quantity ({batch.quantity_remaining} remaining, {qty_needed} requested)",
                    )
                batch.quantity_remaining -= qty_needed

                # Record stock movement
                mv = StockMovement(
                    medicine_id=item.medicine_id,
                    batch_id=batch.id,
                    movement_type=StockMovementType.DISPENSED.value,
                    quantity=-qty_needed,
                    reference_type="prescription",
                    reference_id=prescription.id,
                    performed_by=current_user.id,
                    notes=f"Dispensed for prescription {prescription.prescription_uid}",
                    created_at=now_utc,
                )
                db.add(mv)
            else:
                # FEFO (First-Expired-First-Out) automatic batch allocation
                available_batches = (
                    db.query(MedicineBatch)
                    .filter(
                        MedicineBatch.medicine_id == item.medicine_id,
                        MedicineBatch.quantity_remaining > 0,
                    )
                    .order_by(MedicineBatch.expiry_date.asc())
                    .all()
                )
                total_avail = sum(b.quantity_remaining for b in available_batches)
                if total_avail < qty_needed:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient total stock for {item.medicine.name} ({total_avail} available, {qty_needed} requested)",
                    )

                to_deduct = qty_needed
                for b in available_batches:
                    if to_deduct <= 0:
                        break
                    deduct_here = min(b.quantity_remaining, to_deduct)
                    b.quantity_remaining -= deduct_here
                    to_deduct -= deduct_here

                    mv = StockMovement(
                        medicine_id=item.medicine_id,
                        batch_id=b.id,
                        movement_type=StockMovementType.DISPENSED.value,
                        quantity=-deduct_here,
                        reference_type="prescription",
                        reference_id=prescription.id,
                        performed_by=current_user.id,
                        notes=f"Dispensed for prescription {prescription.prescription_uid} from batch {b.batch_number}",
                        created_at=now_utc,
                    )
                    db.add(mv)

            item.dispensed_quantity += req_item.quantity
            if item.dispensed_quantity >= item.quantity:
                item.is_dispensed = True

        # Check overall prescription status
        all_items = prescription.items
        if all(it.is_dispensed for it in all_items):
            prescription.status = PrescriptionStatus.DISPENSED.value
        else:
            prescription.status = PrescriptionStatus.PARTIALLY_DISPENSED.value

        prescription.updated_at = now_utc
        db.commit()
        db.refresh(prescription)
        return cls.format_prescription_response(prescription)

    @classmethod
    def get_stock_alerts(cls, db: Session) -> StockAlertsResponse:
        today = date.today()
        ninety_days = today + timedelta(days=90)

        medicines = db.query(Medicine).filter(Medicine.is_active == True).all()
        low_stock_list: List[StockAlertItem] = []

        for med in medicines:
            total_stock = sum(b.quantity_remaining for b in med.batches if b.quantity_remaining > 0)
            if total_stock == 0:
                low_stock_list.append(
                    StockAlertItem(
                        medicine_id=med.id,
                        medicine_name=med.name,
                        medicine_uid=med.medicine_uid,
                        current_stock=0,
                        reorder_level=med.reorder_level,
                        status="out_of_stock",
                    )
                )
            elif total_stock <= med.reorder_level:
                low_stock_list.append(
                    StockAlertItem(
                        medicine_id=med.id,
                        medicine_name=med.name,
                        medicine_uid=med.medicine_uid,
                        current_stock=total_stock,
                        reorder_level=med.reorder_level,
                        status="low_stock",
                    )
                )

        expiring_batches = (
            db.query(MedicineBatch)
            .filter(
                MedicineBatch.quantity_remaining > 0,
                MedicineBatch.expiry_date <= ninety_days,
            )
            .order_by(MedicineBatch.expiry_date.asc())
            .all()
        )

        expiring_list = [
            ExpiringBatchItem(
                batch_id=b.id,
                batch_number=b.batch_number,
                medicine_id=b.medicine_id,
                medicine_name=b.medicine.name if b.medicine else "Unknown",
                expiry_date=b.expiry_date,
                days_until_expiry=(b.expiry_date - today).days,
                quantity_remaining=b.quantity_remaining,
            )
            for b in expiring_batches
        ]

        return StockAlertsResponse(
            low_stock=low_stock_list,
            expiring_soon=expiring_list,
        )

    @classmethod
    def list_stock_movements(
        cls,
        db: Session,
        medicine_id: Optional[int] = None,
        movement_type: Optional[str] = None,
        limit: int = 50,
    ) -> List[StockMovementResponse]:
        query = db.query(StockMovement)
        if medicine_id:
            query = query.filter(StockMovement.medicine_id == medicine_id)
        if movement_type:
            query = query.filter(StockMovement.movement_type == movement_type)

        movements = query.order_by(desc(StockMovement.created_at)).limit(limit).all()
        results = []
        for m in movements:
            med_name = m.medicine.name if m.medicine else None
            batch_num = m.batch.batch_number if m.batch else None
            user_name = m.user.email if m.user else None
            results.append(
                StockMovementResponse(
                    id=m.id,
                    medicine_id=m.medicine_id,
                    medicine_name=med_name,
                    batch_id=m.batch_id,
                    batch_number=batch_num,
                    movement_type=m.movement_type,
                    quantity=m.quantity,
                    reference_type=m.reference_type,
                    reference_id=m.reference_id,
                    performed_by=m.performed_by,
                    performed_by_name=user_name,
                    notes=m.notes,
                    created_at=m.created_at,
                )
            )
        return results

    @staticmethod
    def format_prescription_response(p: Prescription) -> PrescriptionResponse:
        patient = p.patient
        doctor = p.doctor
        items = [
            PrescriptionItemResponse(
                id=it.id,
                prescription_id=it.prescription_id,
                medicine_id=it.medicine_id,
                medicine_name=it.medicine.name if it.medicine else "Unknown",
                medicine_uid=it.medicine.medicine_uid if it.medicine else "",
                dosage=it.dosage,
                frequency=it.frequency,
                route=it.route,
                duration=it.duration,
                quantity=it.quantity,
                instructions=it.instructions,
                is_dispensed=it.is_dispensed,
                dispensed_quantity=it.dispensed_quantity,
                created_at=it.created_at,
            )
            for it in p.items
        ]

        return PrescriptionResponse(
            id=p.id,
            prescription_uid=p.prescription_uid,
            encounter_id=p.encounter_id,
            patient_id=p.patient_id,
            patient_name=f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
            patient_uid=patient.patient_uid if patient else "",
            doctor_id=p.doctor_id,
            doctor_name=f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else "Unknown",
            status=p.status,
            notes=p.notes,
            prescribed_date=p.prescribed_date,
            created_at=p.created_at,
            updated_at=p.updated_at,
            items=items,
        )
