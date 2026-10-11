export interface AppointmentsSummary {
  total: number
  scheduled: number
  checked_in: number
  in_progress: number
  completed: number
  cancelled: number
}

export interface EncountersSummary {
  total: number
  in_progress: number
  completed: number
  cancelled: number
}

export interface PatientsSummary {
  total: number
  active: number
  new_in_period: number
}

export interface InpatientSummary {
  total_beds: number
  occupied_beds: number
  available_beds: number
  maintenance_beds: number
  occupancy_rate_percent: number
  active_admissions: number
  total_admissions: number
  discharged_admissions: number
}

export interface PharmacySummary {
  total_medicines: number
  low_stock_medicines: number
  out_of_stock_medicines: number
  expiring_batches_90d: number
  total_stock_units: number
}

export interface FinancialSummary {
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  invoices_count: number
  paid_invoices_count: number
  pending_invoices_count: number
  payments_count: number
}

export interface RevenueByMethod {
  method: string
  total: number
  count: number
}

export interface DashboardReportResponse {
  period_start?: string | null
  period_end?: string | null
  appointments: AppointmentsSummary
  encounters: EncountersSummary
  patients: PatientsSummary
  inpatient: InpatientSummary
  pharmacy: PharmacySummary
  financial: FinancialSummary
  revenue_by_method: RevenueByMethod[]
}
