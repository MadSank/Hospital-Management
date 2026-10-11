from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class AppointmentsSummary(BaseModel):
    total: int = 0
    scheduled: int = 0
    checked_in: int = 0
    in_progress: int = 0
    completed: int = 0
    cancelled: int = 0


class EncountersSummary(BaseModel):
    total: int = 0
    in_progress: int = 0
    completed: int = 0
    cancelled: int = 0


class PatientsSummary(BaseModel):
    total: int = 0
    active: int = 0
    new_in_period: int = 0


class InpatientSummary(BaseModel):
    total_beds: int = 0
    occupied_beds: int = 0
    available_beds: int = 0
    maintenance_beds: int = 0
    occupancy_rate_percent: float = 0.0
    active_admissions: int = 0
    total_admissions: int = 0
    discharged_admissions: int = 0


class PharmacySummary(BaseModel):
    total_medicines: int = 0
    low_stock_medicines: int = 0
    out_of_stock_medicines: int = 0
    expiring_batches_90d: int = 0
    total_stock_units: int = 0


class FinancialSummary(BaseModel):
    total_invoiced: float = 0.0
    total_paid: float = 0.0
    total_outstanding: float = 0.0
    invoices_count: int = 0
    paid_invoices_count: int = 0
    pending_invoices_count: int = 0
    payments_count: int = 0


class RevenueByMethod(BaseModel):
    method: str
    total: float
    count: int


class DashboardReportResponse(BaseModel):
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    appointments: AppointmentsSummary
    encounters: EncountersSummary
    patients: PatientsSummary
    inpatient: InpatientSummary
    pharmacy: PharmacySummary
    financial: FinancialSummary
    revenue_by_method: List[RevenueByMethod] = []
