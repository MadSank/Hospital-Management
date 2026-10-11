from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_any_role, require_role
from app.models.patient import Patient
from app.models.user import RoleEnum, User
from app.schemas.billing import (
    InvoiceCreate,
    InvoiceResponse,
    PaymentCreate,
    PaymentResponse,
)
from app.services.billing_service import (
    auto_invoice_admission,
    auto_invoice_encounter,
    auto_invoice_prescription,
    cancel_invoice,
    cancel_payment,
    create_invoice,
    format_invoice_response,
    get_invoice_by_id,
    get_invoices,
    issue_invoice,
    record_payment,
)

router = APIRouter(prefix="/billing", tags=["Billing & Payments"])


@router.get("/invoices", response_model=List[InvoiceResponse])
def list_invoices(
    patient_id: Optional[int] = Query(None, description="Filter by patient ID"),
    status: Optional[str] = Query(None, description="Filter by invoice status"),
    search: Optional[str] = Query(None, description="Search by invoice number or patient name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List invoices with filtering and pagination. Patients are strictly limited to their own records."""
    if current_user.role and current_user.role.name == RoleEnum.PATIENT.value:
        patient_profile = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient_profile:
            return []
        patient_id = patient_profile.id

    invoices, _ = get_invoices(
        db,
        patient_id=patient_id,
        status_filter=status,
        search=search,
        skip=skip,
        limit=limit,
    )
    return [format_invoice_response(inv) for inv in invoices]


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full invoice details with line items and payment records."""
    invoice = get_invoice_by_id(db, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID {invoice_id} not found.",
        )

    # Patient boundary authorization
    if current_user.role and current_user.role.name == RoleEnum.PATIENT.value:
        patient_profile = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient_profile or invoice.patient_id != patient_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view another patient's invoice.",
            )

    return format_invoice_response(invoice)


@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice_endpoint(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_role([RoleEnum.ADMIN, RoleEnum.RECEPTIONIST, RoleEnum.DOCTOR])
    ),
):
    """Manually create an invoice with custom line items."""
    invoice = create_invoice(db, data, user_id=current_user.id)
    return format_invoice_response(invoice)


@router.post("/invoices/auto/encounter/{encounter_id}", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def auto_invoice_encounter_endpoint(
    encounter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_role([RoleEnum.ADMIN, RoleEnum.RECEPTIONIST, RoleEnum.DOCTOR])
    ),
):
    """Auto-generate an invoice for a completed clinical consultation."""
    invoice = auto_invoice_encounter(db, encounter_id, user_id=current_user.id)
    return format_invoice_response(invoice)


@router.post("/invoices/auto/prescription/{prescription_id}", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def auto_invoice_prescription_endpoint(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_role([RoleEnum.ADMIN, RoleEnum.RECEPTIONIST, RoleEnum.PHARMACIST, RoleEnum.DOCTOR])
    ),
):
    """Auto-generate an invoice for a dispensed pharmacy prescription."""
    invoice = auto_invoice_prescription(db, prescription_id, user_id=current_user.id)
    return format_invoice_response(invoice)


@router.post("/invoices/auto/admission/{admission_id}", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def auto_invoice_admission_endpoint(
    admission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_role([RoleEnum.ADMIN, RoleEnum.RECEPTIONIST, RoleEnum.DOCTOR, RoleEnum.NURSE])
    ),
):
    """Auto-generate an invoice for an inpatient bed stay based on days stayed."""
    invoice = auto_invoice_admission(db, admission_id, user_id=current_user.id)
    return format_invoice_response(invoice)


@router.post("/invoices/{invoice_id}/issue", response_model=InvoiceResponse)
def issue_invoice_endpoint(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_role([RoleEnum.ADMIN, RoleEnum.RECEPTIONIST])
    ),
):
    """Transition a draft invoice to 'issued' status so payments can be accepted."""
    invoice = issue_invoice(db, invoice_id)
    return format_invoice_response(invoice)


@router.post("/invoices/{invoice_id}/cancel", response_model=InvoiceResponse)
def cancel_invoice_endpoint(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_role([RoleEnum.ADMIN, RoleEnum.RECEPTIONIST])
    ),
):
    """Cancel an invoice that has no active payments."""
    invoice = cancel_invoice(db, invoice_id)
    return format_invoice_response(invoice)


@router.post("/invoices/{invoice_id}/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def record_payment_endpoint(
    invoice_id: int,
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_role([RoleEnum.ADMIN, RoleEnum.RECEPTIONIST])
    ),
):
    """Record a simulated payment against an issued invoice (cash, card, insurance, bank transfer)."""
    payment = record_payment(db, invoice_id, data, received_by=current_user.id)
    return payment


@router.post("/payments/{payment_id}/cancel", response_model=PaymentResponse)
def cancel_payment_endpoint(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.ADMIN)),
):
    """Void/cancel a payment and recalculate the parent invoice balance."""
    payment = cancel_payment(db, payment_id)
    return payment
