import React, { useEffect, useState } from 'react'
import {
  BarChart3,
  Bed,
  Calendar,
  Clock,
  CreditCard,
  DollarSign,
  Filter,
  HeartPulse,
  Loader2,
  Pill,
  RefreshCw,
} from 'lucide-react'
import { getReportsSummary } from '../../api/reports'
import type { DashboardReportResponse } from '../../types/reports'

export const ReportsDashboardPage: React.FC = () => {
  const [report, setReport] = useState<DashboardReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchReports = async (start?: string, end?: string) => {
    setLoading(true)
    try {
      const data = await getReportsSummary({
        start_date: start ? new Date(start).toISOString() : undefined,
        end_date: end ? new Date(end).toISOString() : undefined,
      })
      setReport(data)
    } catch (err) {
      console.error('Failed to load reports summary', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault()
    fetchReports(startDate, endDate)
  }

  const handleResetFilter = () => {
    setStartDate('')
    setEndDate('')
    fetchReports()
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Date Range Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-teal-700" />
            <span>Reports & Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time hospital-wide operational metrics, clinical activity, bed occupancy, and revenue auditing
          </p>
        </div>

        {/* Date Filter Form */}
        <form onSubmit={handleApplyFilter} className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-slate-700 focus:outline-hidden text-xs"
              placeholder="Start"
            />
            <span className="text-slate-300">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-slate-700 focus:outline-hidden text-xs"
              placeholder="End"
            />
          </div>

          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors flex items-center gap-1"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchReports(startDate, endDate)}
            title="Refresh Metrics"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </form>
      </div>

      {loading && !report ? (
        <div className="flex items-center justify-center min-h-[350px]">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        </div>
      ) : !report ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          No reporting data available.
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: FINANCIAL OVERVIEW */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Financial & Revenue Metrics
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Total Invoiced</span>
                <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                  ${report.financial.total_invoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Across {report.financial.invoices_count} invoices</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-emerald-700">Payments Collected</span>
                <div className="text-2xl font-bold text-emerald-600 mt-1 font-mono">
                  ${report.financial.total_paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-emerald-600/80 mt-1">
                  {report.financial.paid_invoices_count} fully settled
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-amber-700">Outstanding Receivables</span>
                <div className="text-2xl font-bold text-amber-600 mt-1 font-mono">
                  ${report.financial.total_outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-amber-600/80 mt-1">
                  {report.financial.pending_invoices_count} pending invoices
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Completed Payments</span>
                <div className="text-2xl font-bold text-teal-800 mt-1 font-mono">
                  {report.financial.payments_count}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Processed transactions</div>
              </div>
            </div>

            {/* Revenue by Method breakdown */}
            {report.revenue_by_method.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-teal-700" /> Revenue Breakdown by Payment Method
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {report.revenue_by_method.map((item) => (
                    <div key={item.method} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-600 capitalize block">
                        {item.method.replace('_', ' ')}
                      </span>
                      <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                        ${item.total.toFixed(2)}
                      </div>
                      <span className="text-[11px] text-slate-400">{item.count} payment(s)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: CLINICAL ACTIVITY & OUTPATIENTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Appointments Activity */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" /> Appointments Activity
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <span className="text-[11px] text-slate-500 font-medium">Total</span>
                  <div className="text-xl font-bold text-slate-900">{report.appointments.total}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <span className="text-[11px] text-emerald-700 font-medium">Completed</span>
                  <div className="text-xl font-bold text-emerald-700">{report.appointments.completed}</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-center">
                  <span className="text-[11px] text-amber-700 font-medium">Scheduled</span>
                  <div className="text-xl font-bold text-amber-700">{report.appointments.scheduled}</div>
                </div>
              </div>

              <div className="flex justify-between text-xs text-slate-600 px-1 pt-1 border-t border-slate-100">
                <span>Checked-in: <strong className="text-slate-900">{report.appointments.checked_in}</strong></span>
                <span>In Progress: <strong className="text-slate-900">{report.appointments.in_progress}</strong></span>
                <span>Cancelled: <strong className="text-red-600">{report.appointments.cancelled}</strong></span>
              </div>
            </div>

            {/* Consultations / EHR Activity */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-rose-600" /> Clinical Encounters & EHR
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <span className="text-[11px] text-slate-500 font-medium">Total Consults</span>
                  <div className="text-xl font-bold text-slate-900">{report.encounters.total}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <span className="text-[11px] text-emerald-700 font-medium">Completed</span>
                  <div className="text-xl font-bold text-emerald-700">{report.encounters.completed}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl text-center">
                  <span className="text-[11px] text-blue-700 font-medium">In Progress</span>
                  <div className="text-xl font-bold text-blue-700">{report.encounters.in_progress}</div>
                </div>
              </div>

              <div className="flex justify-between text-xs text-slate-600 px-1 pt-1 border-t border-slate-100">
                <span>Registered Patients: <strong className="text-slate-900">{report.patients.total}</strong></span>
                <span>Active Status: <strong className="text-emerald-700">{report.patients.active}</strong></span>
                <span>New in Period: <strong className="text-teal-700">+{report.patients.new_in_period}</strong></span>
              </div>
            </div>
          </div>

          {/* SECTION 3: INPATIENT CARE & BED OCCUPANCY */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Bed className="w-4 h-4 text-teal-700" /> Inpatient Bed Utilization & Admissions
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 bg-teal-900 text-white rounded-xl text-center">
                <span className="text-[11px] text-teal-200 font-medium">Occupancy Rate</span>
                <div className="text-2xl font-bold mt-0.5">{report.inpatient.occupancy_rate_percent}%</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl text-center border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium">Total Beds</span>
                <div className="text-xl font-bold text-slate-900 mt-0.5">{report.inpatient.total_beds}</div>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-xl text-center border border-emerald-100">
                <span className="text-[11px] text-emerald-700 font-medium">Available Beds</span>
                <div className="text-xl font-bold text-emerald-700 mt-0.5">{report.inpatient.available_beds}</div>
              </div>

              <div className="p-3.5 bg-rose-50 rounded-xl text-center border border-rose-100">
                <span className="text-[11px] text-rose-700 font-medium">Occupied Beds</span>
                <div className="text-xl font-bold text-rose-700 mt-0.5">{report.inpatient.occupied_beds}</div>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl text-center border border-amber-100">
                <span className="text-[11px] text-amber-700 font-medium">Active Inpatients</span>
                <div className="text-xl font-bold text-amber-700 mt-0.5">{report.inpatient.active_admissions}</div>
              </div>
            </div>

            <div className="flex justify-between text-xs text-slate-500 px-1 pt-1 border-t border-slate-100">
              <span>Maintenance Beds: <strong>{report.inpatient.maintenance_beds}</strong></span>
              <span>Total Admissions: <strong>{report.inpatient.total_admissions}</strong></span>
              <span>Discharged: <strong className="text-emerald-700">{report.inpatient.discharged_admissions}</strong></span>
            </div>
          </div>

          {/* SECTION 4: PHARMACY & INVENTORY HEALTH */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-teal-700" /> Pharmacy Inventory Health & Stock Auditing
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Cataloged Medicines</span>
                <div className="text-xl font-bold text-slate-900 mt-1">{report.pharmacy.total_medicines}</div>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-100">
                <span className="text-[11px] text-amber-800 font-medium block">Low Stock Alerts</span>
                <div className="text-xl font-bold text-amber-700 mt-1">{report.pharmacy.low_stock_medicines}</div>
              </div>

              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-100">
                <span className="text-[11px] text-rose-800 font-medium block">Batches Expiring (90d)</span>
                <div className="text-xl font-bold text-rose-700 mt-1">{report.pharmacy.expiring_batches_90d}</div>
              </div>

              <div className="p-3.5 bg-teal-50 rounded-xl border border-teal-100">
                <span className="text-[11px] text-teal-800 font-medium block">Total Stock Units</span>
                <div className="text-xl font-bold text-teal-800 mt-1">
                  {report.pharmacy.total_stock_units.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
