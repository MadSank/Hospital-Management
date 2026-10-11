from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.appointment import Appointment, AppointmentStatus
from app.models.billing import Invoice, InvoiceStatus, Payment, PaymentStatus
from app.models.encounter import Encounter, EncounterStatus
from app.models.inpatient import Admission, AdmissionStatus, Bed, BedStatus
from app.models.patient import Patient
from app.models.pharmacy import Medicine, MedicineBatch
from app.schemas.reports import (
    AppointmentsSummary,
    DashboardReportResponse,
    EncountersSummary,
    FinancialSummary,
    InpatientSummary,
    PatientsSummary,
    PharmacySummary,
    RevenueByMethod,
)


def get_dashboard_report(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> DashboardReportResponse:
    now = datetime.now(timezone.utc)

    # 1. Appointments Summary
    app_query = db.query(Appointment)
    if start_date:
        app_query = app_query.filter(Appointment.appointment_date >= start_date)
    if end_date:
        app_query = app_query.filter(Appointment.appointment_date <= end_date)

    appointments_list = app_query.all()
    app_total = len(appointments_list)
    app_scheduled = sum(1 for a in appointments_list if a.status == AppointmentStatus.SCHEDULED.value)
    app_checked_in = sum(1 for a in appointments_list if a.status == AppointmentStatus.CHECKED_IN.value)
    app_in_progress = sum(1 for a in appointments_list if a.status == AppointmentStatus.IN_PROGRESS.value)
    app_completed = sum(1 for a in appointments_list if a.status == AppointmentStatus.COMPLETED.value)
    app_cancelled = sum(1 for a in appointments_list if a.status == AppointmentStatus.CANCELLED.value)

    app_summary = AppointmentsSummary(
        total=app_total,
        scheduled=app_scheduled,
        checked_in=app_checked_in,
        in_progress=app_in_progress,
        completed=app_completed,
        cancelled=app_cancelled,
    )

    # 2. Encounters Summary
    enc_query = db.query(Encounter)
    if start_date:
        enc_query = enc_query.filter(Encounter.started_at >= start_date)
    if end_date:
        enc_query = enc_query.filter(Encounter.started_at <= end_date)

    enc_list = enc_query.all()
    enc_total = len(enc_list)
    enc_in_progress = sum(1 for e in enc_list if e.status == EncounterStatus.IN_PROGRESS.value)
    enc_completed = sum(1 for e in enc_list if e.status == EncounterStatus.COMPLETED.value)
    enc_cancelled = sum(1 for e in enc_list if e.status == EncounterStatus.CANCELLED.value)

    enc_summary = EncountersSummary(
        total=enc_total,
        in_progress=enc_in_progress,
        completed=enc_completed,
        cancelled=enc_cancelled,
    )

    # 3. Patients Summary
    pat_total = db.query(func.count(Patient.id)).scalar() or 0
    pat_active = db.query(func.count(Patient.id)).filter(Patient.is_active.is_(True)).scalar() or 0

    new_pat_query = db.query(func.count(Patient.id))
    if start_date:
        new_pat_query = new_pat_query.filter(Patient.created_at >= start_date)
    if end_date:
        new_pat_query = new_pat_query.filter(Patient.created_at <= end_date)
    pat_new_period = new_pat_query.scalar() or 0

    pat_summary = PatientsSummary(
        total=pat_total,
        active=pat_active,
        new_in_period=pat_new_period,
    )

    # 4. Inpatient Summary
    beds = db.query(Bed).all()
    total_beds = len(beds)
    occupied_beds = sum(1 for b in beds if b.status == BedStatus.OCCUPIED.value)
    available_beds = sum(1 for b in beds if b.status == BedStatus.AVAILABLE.value)
    maintenance_beds = sum(1 for b in beds if b.status == BedStatus.MAINTENANCE.value)
    occupancy_rate = round((occupied_beds / total_beds * 100.0), 1) if total_beds > 0 else 0.0

    adm_list = db.query(Admission).all()
    active_admissions = sum(1 for a in adm_list if a.status == AdmissionStatus.ADMITTED.value)
    discharged_admissions = sum(1 for a in adm_list if a.status == AdmissionStatus.DISCHARGED.value)

    inp_summary = InpatientSummary(
        total_beds=total_beds,
        occupied_beds=occupied_beds,
        available_beds=available_beds,
        maintenance_beds=maintenance_beds,
        occupancy_rate_percent=occupancy_rate,
        active_admissions=active_admissions,
        total_admissions=len(adm_list),
        discharged_admissions=discharged_admissions,
    )

    # 5. Pharmacy Summary
    meds = db.query(Medicine).all()
    total_meds = len(meds)
    med_stocks = {
        m.id: sum(b.quantity_remaining for b in m.batches if b.quantity_remaining > 0)
        for m in meds
    }
    low_stock_meds = sum(
        1 for m in meds
        if 0 < med_stocks[m.id] <= (m.reorder_level or 10)
    )
    out_of_stock_meds = sum(
        1 for m in meds
        if med_stocks[m.id] == 0
    )

    cutoff_90d = now.date() + timedelta(days=90)
    batches = db.query(MedicineBatch).filter(MedicineBatch.quantity_remaining > 0).all()
    expiring_90d = sum(1 for b in batches if b.expiry_date and b.expiry_date <= cutoff_90d)
    total_stock_units = sum(b.quantity_remaining for b in batches)

    pharm_summary = PharmacySummary(
        total_medicines=total_meds,
        low_stock_medicines=low_stock_meds,
        out_of_stock_medicines=out_of_stock_meds,
        expiring_batches_90d=expiring_90d,
        total_stock_units=total_stock_units,
    )

    # 6. Financial Summary
    inv_query = db.query(Invoice).filter(Invoice.status != InvoiceStatus.CANCELLED.value)
    if start_date:
        inv_query = inv_query.filter(Invoice.created_at >= start_date)
    if end_date:
        inv_query = inv_query.filter(Invoice.created_at <= end_date)

    invoices = inv_query.all()
    total_invoiced = sum(float(inv.total_amount) for inv in invoices)
    total_paid = sum(float(inv.paid_amount) for inv in invoices)
    total_outstanding = max(0.0, round(total_invoiced - total_paid, 2))
    paid_inv_count = sum(1 for inv in invoices if inv.status == InvoiceStatus.PAID.value)
    pending_inv_count = sum(1 for inv in invoices if inv.status in (InvoiceStatus.DRAFT.value, InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value))

    # Payments count & revenue by method
    pay_query = db.query(Payment).filter(Payment.status == PaymentStatus.COMPLETED.value)
    if start_date:
        pay_query = pay_query.filter(Payment.payment_date >= start_date)
    if end_date:
        pay_query = pay_query.filter(Payment.payment_date <= end_date)

    payments = pay_query.all()
    payments_count = len(payments)

    method_totals = {}
    for p in payments:
        m = p.payment_method or "other"
        if m not in method_totals:
            method_totals[m] = {"total": 0.0, "count": 0}
        method_totals[m]["total"] += float(p.amount)
        method_totals[m]["count"] += 1

    revenue_by_method = [
        RevenueByMethod(
            method=m,
            total=round(data["total"], 2),
            count=data["count"],
        )
        for m, data in method_totals.items()
    ]

    fin_summary = FinancialSummary(
        total_invoiced=round(total_invoiced, 2),
        total_paid=round(total_paid, 2),
        total_outstanding=round(total_outstanding, 2),
        invoices_count=len(invoices),
        paid_invoices_count=paid_inv_count,
        pending_invoices_count=pending_inv_count,
        payments_count=payments_count,
    )

    return DashboardReportResponse(
        period_start=start_date,
        period_end=end_date,
        appointments=app_summary,
        encounters=enc_summary,
        patients=pat_summary,
        inpatient=inp_summary,
        pharmacy=pharm_summary,
        financial=fin_summary,
        revenue_by_method=revenue_by_method,
    )
