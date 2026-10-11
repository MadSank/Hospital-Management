from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.billing import (
    Invoice,
    InvoiceItem,
    InvoiceItemType,
    InvoiceStatus,
    Payment,
    PaymentMethod,
    PaymentStatus,
)
from app.models.encounter import Encounter
from app.models.inpatient import Admission
from app.models.patient import Patient
from app.models.pharmacy import Medicine, Prescription
from app.schemas.billing import (
    InvoiceCreate,
    InvoiceItemCreate,
    InvoiceResponse,
    InvoiceUpdate,
    PaymentCreate,
)


def generate_invoice_uid(db: Session) -> str:
    count = db.query(func.count(Invoice.id)).scalar() or 0
    candidate = f"INV-{count + 1:04d}"
    seq = count + 1
    while db.query(Invoice).filter(Invoice.invoice_uid == candidate).first():
        seq += 1
        candidate = f"INV-{seq:04d}"
    return candidate


def generate_payment_uid(db: Session) -> str:
    count = db.query(func.count(Payment.id)).scalar() or 0
    candidate = f"PAY-{count + 1:04d}"
    seq = count + 1
    while db.query(Payment).filter(Payment.payment_uid == candidate).first():
        seq += 1
        candidate = f"PAY-{seq:04d}"
    return candidate


def format_invoice_response(invoice: Invoice) -> InvoiceResponse:
    patient_name = None
    patient_mrn = None
    if invoice.patient:
        patient_name = f"{invoice.patient.first_name} {invoice.patient.last_name}"
        patient_mrn = invoice.patient.patient_uid

    subtotal = float(invoice.subtotal or 0.0)
    discount = float(invoice.discount_amount or 0.0)
    tax = float(invoice.tax_amount or 0.0)
    total = float(invoice.total_amount or 0.0)
    paid = float(invoice.paid_amount or 0.0)
    balance_due = max(0.0, round(total - paid, 2))

    return InvoiceResponse(
        id=invoice.id,
        invoice_uid=invoice.invoice_uid,
        patient_id=invoice.patient_id,
        patient_name=patient_name,
        patient_mrn=patient_mrn,
        appointment_id=invoice.appointment_id,
        encounter_id=invoice.encounter_id,
        prescription_id=invoice.prescription_id,
        admission_id=invoice.admission_id,
        subtotal=round(subtotal, 2),
        discount_amount=round(discount, 2),
        tax_amount=round(tax, 2),
        total_amount=round(total, 2),
        paid_amount=round(paid, 2),
        balance_due=round(balance_due, 2),
        status=invoice.status,
        notes=invoice.notes,
        issued_date=invoice.issued_date,
        due_date=invoice.due_date,
        created_by=invoice.created_by,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
        items=invoice.items or [],
        payments=invoice.payments or [],
    )


def create_invoice(
    db: Session,
    data: InvoiceCreate,
    user_id: Optional[int] = None,
) -> Invoice:
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {data.patient_id} not found.",
        )

    # Check for duplicate automatic charges if linked to an entity
    if data.encounter_id:
        existing = (
            db.query(Invoice)
            .filter(
                Invoice.encounter_id == data.encounter_id,
                Invoice.status != InvoiceStatus.CANCELLED.value,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invoice already exists for this encounter: {existing.invoice_uid}",
            )

    if data.prescription_id:
        existing = (
            db.query(Invoice)
            .filter(
                Invoice.prescription_id == data.prescription_id,
                Invoice.status != InvoiceStatus.CANCELLED.value,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invoice already exists for this prescription: {existing.invoice_uid}",
            )

    if data.admission_id:
        existing = (
            db.query(Invoice)
            .filter(
                Invoice.admission_id == data.admission_id,
                Invoice.status != InvoiceStatus.CANCELLED.value,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invoice already exists for this admission: {existing.invoice_uid}",
            )

    invoice_uid = generate_invoice_uid(db)
    now = datetime.now(timezone.utc)

    # Calculate item totals and subtotal
    subtotal = 0.0
    items_to_create = []
    for item in data.items:
        line_total = round(item.quantity * float(item.unit_price), 2)
        subtotal += line_total
        items_to_create.append(
            InvoiceItem(
                item_type=item.item_type,
                description=item.description,
                reference_type=item.reference_type,
                reference_id=item.reference_id,
                quantity=item.quantity,
                unit_price=round(float(item.unit_price), 2),
                total_price=line_total,
            )
        )

    subtotal = round(subtotal, 2)
    discount = round(float(data.discount_amount), 2)
    tax = round(float(data.tax_amount), 2)
    total_amount = max(0.0, round(subtotal - discount + tax, 2))

    inv_status = InvoiceStatus.ISSUED.value if data.auto_issue else InvoiceStatus.DRAFT.value
    issued_date = now if data.auto_issue else None

    invoice = Invoice(
        invoice_uid=invoice_uid,
        patient_id=data.patient_id,
        appointment_id=data.appointment_id,
        encounter_id=data.encounter_id,
        prescription_id=data.prescription_id,
        admission_id=data.admission_id,
        subtotal=subtotal,
        discount_amount=discount,
        tax_amount=tax,
        total_amount=total_amount,
        paid_amount=0.0,
        status=inv_status,
        notes=data.notes,
        issued_date=issued_date,
        due_date=data.due_date,
        created_by=user_id,
        created_at=now,
        updated_at=now,
    )
    db.add(invoice)
    db.flush()

    for it in items_to_create:
        it.invoice_id = invoice.id
        db.add(it)

    db.commit()
    db.refresh(invoice)
    return invoice


def auto_invoice_encounter(
    db: Session,
    encounter_id: int,
    user_id: Optional[int] = None,
) -> Invoice:
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Encounter with ID {encounter_id} not found.",
        )

    # Check for existing invoice
    existing = (
        db.query(Invoice)
        .filter(
            Invoice.encounter_id == encounter_id,
            Invoice.status != InvoiceStatus.CANCELLED.value,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invoice already exists for consultation {encounter.encounter_uid}: {existing.invoice_uid}",
        )

    doctor_name = "Medical Practitioner"
    if encounter.doctor:
        doctor_name = f"{encounter.doctor.first_name} {encounter.doctor.last_name}"

    consultation_fee = 50.0  # Standard consultation rate

    items = [
        InvoiceItemCreate(
            item_type=InvoiceItemType.CONSULTATION.value,
            description=f"Consultation ({encounter.encounter_uid}) - Dr. {doctor_name}",
            reference_type="encounter",
            reference_id=encounter.id,
            quantity=1,
            unit_price=consultation_fee,
        )
    ]

    create_data = InvoiceCreate(
        patient_id=encounter.patient_id,
        encounter_id=encounter.id,
        appointment_id=encounter.appointment_id,
        items=items,
        auto_issue=True,
        notes=f"Auto-generated billing for clinical consultation {encounter.encounter_uid}.",
    )
    return create_invoice(db, create_data, user_id=user_id)


def auto_invoice_prescription(
    db: Session,
    prescription_id: int,
    user_id: Optional[int] = None,
) -> Invoice:
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prescription with ID {prescription_id} not found.",
        )

    # Check for existing invoice
    existing = (
        db.query(Invoice)
        .filter(
            Invoice.prescription_id == prescription_id,
            Invoice.status != InvoiceStatus.CANCELLED.value,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invoice already exists for prescription {prescription.prescription_uid}: {existing.invoice_uid}",
        )

    items: List[InvoiceItemCreate] = []
    for pi in prescription.items:
        med = db.query(Medicine).filter(Medicine.id == pi.medicine_id).first()
        med_name = med.name if med else "Prescribed Medication"
        unit_price = float(med.unit_price) if med else 10.0
        qty = pi.quantity if pi.quantity > 0 else 1
        items.append(
            InvoiceItemCreate(
                item_type=InvoiceItemType.MEDICINE.value,
                description=f"Medication: {med_name} ({pi.dosage}, {pi.frequency})",
                reference_type="prescription_item",
                reference_id=pi.id,
                quantity=qty,
                unit_price=unit_price,
            )
        )

    if not items:
        # Fallback line item if prescription items empty
        items.append(
            InvoiceItemCreate(
                item_type=InvoiceItemType.MEDICINE.value,
                description=f"Pharmacy Dispensation ({prescription.prescription_uid})",
                reference_type="prescription",
                reference_id=prescription.id,
                quantity=1,
                unit_price=15.0,
            )
        )

    create_data = InvoiceCreate(
        patient_id=prescription.patient_id,
        encounter_id=prescription.encounter_id,
        prescription_id=prescription.id,
        items=items,
        auto_issue=True,
        notes=f"Auto-generated billing for prescription {prescription.prescription_uid}.",
    )
    return create_invoice(db, create_data, user_id=user_id)


def auto_invoice_admission(
    db: Session,
    admission_id: int,
    user_id: Optional[int] = None,
) -> Invoice:
    admission = db.query(Admission).filter(Admission.id == admission_id).first()
    if not admission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inpatient admission with ID {admission_id} not found.",
        )

    # Check for existing invoice
    existing = (
        db.query(Invoice)
        .filter(
            Invoice.admission_id == admission_id,
            Invoice.status != InvoiceStatus.CANCELLED.value,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invoice already exists for admission {admission.admission_uid}: {existing.invoice_uid}",
        )

    # Calculate days of stay
    end_date = admission.discharge_date or datetime.now(timezone.utc)
    delta_days = (end_date.date() - admission.admission_date.date()).days
    stay_days = max(1, delta_days)

    daily_rate = float(admission.bed.daily_rate) if admission.bed else 50.0
    bed_num = admission.bed.bed_number if admission.bed else "N/A"
    ward_name = admission.bed.ward.name if admission.bed and admission.bed.ward else "General Ward"

    items = [
        InvoiceItemCreate(
            item_type=InvoiceItemType.BED_CHARGE.value,
            description=f"Inpatient Bed Stay ({stay_days} nights @ ${daily_rate:.2f}/day) - Bed {bed_num} ({ward_name})",
            reference_type="admission",
            reference_id=admission.id,
            quantity=stay_days,
            unit_price=daily_rate,
        )
    ]

    create_data = InvoiceCreate(
        patient_id=admission.patient_id,
        admission_id=admission.id,
        items=items,
        auto_issue=True,
        notes=f"Auto-generated billing for inpatient stay {admission.admission_uid} ({stay_days} days).",
    )
    return create_invoice(db, create_data, user_id=user_id)


def issue_invoice(db: Session, invoice_id: int) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID {invoice_id} not found.",
        )
    if invoice.status == InvoiceStatus.CANCELLED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot issue a cancelled invoice.",
        )
    if invoice.status != InvoiceStatus.DRAFT.value:
        return invoice

    invoice.status = InvoiceStatus.ISSUED.value
    invoice.issued_date = datetime.now(timezone.utc)
    invoice.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(invoice)
    return invoice


def cancel_invoice(db: Session, invoice_id: int) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID {invoice_id} not found.",
        )
    if float(invoice.paid_amount) > 0.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel invoice with recorded payments. Please void payments first.",
        )

    invoice.status = InvoiceStatus.CANCELLED.value
    invoice.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(invoice)
    return invoice


def record_payment(
    db: Session,
    invoice_id: int,
    data: PaymentCreate,
    received_by: Optional[int] = None,
) -> Payment:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).with_for_update().first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID {invoice_id} not found.",
        )

    if invoice.status == InvoiceStatus.DRAFT.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment cannot be recorded on a draft invoice. Please issue the invoice first.",
        )

    if invoice.status == InvoiceStatus.CANCELLED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment cannot be recorded on a cancelled invoice.",
        )

    total_amount = float(invoice.total_amount)
    current_paid = float(invoice.paid_amount)
    balance_due = max(0.0, round(total_amount - current_paid, 2))

    if balance_due <= 0.0 or invoice.status == InvoiceStatus.PAID.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice is already fully paid.",
        )

    payment_amount = round(float(data.amount), 2)
    if payment_amount > balance_due + 0.001:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount (${payment_amount:.2f}) exceeds outstanding balance (${balance_due:.2f}). Overpayment is not permitted.",
        )

    payment_uid = generate_payment_uid(db)
    now = datetime.now(timezone.utc)

    payment = Payment(
        payment_uid=payment_uid,
        invoice_id=invoice.id,
        amount=payment_amount,
        payment_method=data.payment_method,
        payment_date=now,
        reference_number=data.reference_number,
        received_by=received_by,
        notes=data.notes,
        status=PaymentStatus.COMPLETED.value,
        created_at=now,
    )
    db.add(payment)

    new_paid = round(current_paid + payment_amount, 2)
    invoice.paid_amount = new_paid
    if new_paid >= total_amount - 0.001:
        invoice.status = InvoiceStatus.PAID.value
    else:
        invoice.status = InvoiceStatus.PARTIALLY_PAID.value

    invoice.updated_at = now
    db.commit()
    db.refresh(payment)
    db.refresh(invoice)
    return payment


def cancel_payment(
    db: Session,
    payment_id: int,
) -> Payment:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with ID {payment_id} not found.",
        )

    if payment.status == PaymentStatus.CANCELLED.value:
        return payment

    invoice = db.query(Invoice).filter(Invoice.id == payment.invoice_id).with_for_update().first()
    if invoice:
        new_paid = max(0.0, round(float(invoice.paid_amount) - float(payment.amount), 2))
        invoice.paid_amount = new_paid
        total = float(invoice.total_amount)
        if new_paid >= total - 0.001 and total > 0:
            invoice.status = InvoiceStatus.PAID.value
        elif new_paid > 0:
            invoice.status = InvoiceStatus.PARTIALLY_PAID.value
        else:
            invoice.status = InvoiceStatus.ISSUED.value

        invoice.updated_at = datetime.now(timezone.utc)

    payment.status = PaymentStatus.CANCELLED.value
    db.commit()
    db.refresh(payment)
    return payment


def get_invoices(
    db: Session,
    patient_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[Invoice], int]:
    query = db.query(Invoice)

    if patient_id:
        query = query.filter(Invoice.patient_id == patient_id)

    if status_filter:
        query = query.filter(Invoice.status == status_filter)

    if search:
        search_pattern = f"%{search}%"
        query = query.join(Invoice.patient).filter(
            or_(
                Invoice.invoice_uid.ilike(search_pattern),
                Patient.first_name.ilike(search_pattern),
                Patient.last_name.ilike(search_pattern),
                Patient.mrn.ilike(search_pattern),
            )
        )

    total = query.count()
    invoices = query.order_by(desc(Invoice.created_at)).offset(skip).limit(limit).all()
    return invoices, total


def get_invoice_by_id(db: Session, invoice_id: int) -> Optional[Invoice]:
    return db.query(Invoice).filter(Invoice.id == invoice_id).first()
