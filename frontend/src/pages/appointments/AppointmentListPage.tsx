import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Users,
  X,
} from 'lucide-react'
import {
  getAppointmentQueue,
  getAppointments,
  getTodayAppointments,
  updateAppointmentStatus,
} from '../../api/appointments'
import { getDoctors } from '../../api/staff'
import { useAuth } from '../../contexts/AuthContext'
import type {
  AppointmentDetail,
  AppointmentSummary,
  DoctorSummary,
} from '../../types/appointment'
import { AppointmentBookingModal } from './AppointmentBookingModal'
import { AppointmentCancelModal } from './AppointmentCancelModal'
import { AppointmentDetailModal } from './AppointmentDetailModal'
import { AppointmentRescheduleModal } from './AppointmentRescheduleModal'

export const AppointmentListPage: React.FC = () => {
  const { user } = useAuth()
  const userRole = user?.role || 'patient'
  const isPatientUser = userRole === 'patient'

  // Tab views
  const [activeView, setActiveView] = useState<'all' | 'today' | 'queue'>('all')

  // Data states
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const perPage = 15
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Doctors for filter dropdown
  const [doctors, setDoctors] = useState<DoctorSummary[]>([])

  // Filters
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterDoctorId, setFilterDoctorId] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')

  // Modals
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [selectedDetailId, setSelectedDetailId] = useState<number | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<AppointmentSummary | AppointmentDetail | null>(null)
  const [appointmentToCancel, setAppointmentToCancel] = useState<AppointmentSummary | AppointmentDetail | null>(null)

  // Fetch doctors list on mount
  useEffect(() => {
    getDoctors()
      .then(setDoctors)
      .catch((err) => console.error('Failed to load doctors list:', err))
  }, [])

  // Fetch appointment data depending on active view
  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (activeView === 'today') {
        const list = await getTodayAppointments()
        setAppointments(list)
        setTotal(list.length)
        setPages(1)
      } else if (activeView === 'queue') {
        const queue = await getAppointmentQueue()
        setAppointments(queue)
        setTotal(queue.length)
        setPages(1)
      } else {
        const params: any = {
          page,
          per_page: perPage,
        }
        if (appliedSearch.trim()) params.search = appliedSearch.trim()
        if (filterDate) params.date = filterDate
        if (filterDoctorId) params.doctor_id = Number(filterDoctorId)
        if (filterStatus) params.status = filterStatus
        if (filterType) params.type = filterType

        const data = await getAppointments(params)
        setAppointments(data.items)
        setTotal(data.total)
        setPages(data.pages)
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail?.message ||
          err.message ||
          'Failed to load appointments.'
      )
    } finally {
      setLoading(false)
    }
  }, [
    activeView,
    page,
    perPage,
    appliedSearch,
    filterDate,
    filterDoctorId,
    filterStatus,
    filterType,
  ])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setAppliedSearch(searchInput)
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setAppliedSearch('')
    setPage(1)
  }

  const handleQuickStatusUpdate = async (aptId: number, targetStatus: string) => {
    try {
      await updateAppointmentStatus(aptId, { status: targetStatus })
      setActionSuccess(`Appointment status updated to ${targetStatus.replace('_', ' ')}.`)
      fetchAppointments()
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail?.message || 'Status update failed.')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Scheduled
          </span>
        )
      case 'checked_in':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Checked In
          </span>
        )
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            In Consultation
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Cancelled
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 capitalize">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Calendar className="w-7 h-7 text-teal-600" />
            Scheduling & Appointments
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Book appointments, manage doctor working hours, check-in queues, and track consultation lifecycles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAppointments()}
            title="Refresh directory"
            className="p-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-colors focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            Book Appointment
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* View Switcher Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => {
            setActiveView('all')
            setPage(1)
          }}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
            activeView === 'all'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>All Bookings</span>
        </button>

        <button
          onClick={() => {
            setActiveView('today')
            setPage(1)
          }}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
            activeView === 'today'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Today's Schedule</span>
        </button>

        {!isPatientUser && (
          <button
            onClick={() => {
              setActiveView('queue')
              setPage(1)
            }}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              activeView === 'queue'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Check-In Queue</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Live
            </span>
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar (Active in 'all' view) */}
      {activeView === 'all' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Appointment UID (APT-...), Patient, or Doctor name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-9 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-2xs"
            >
              Search
            </button>
          </form>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Date filter */}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value)
                setPage(1)
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="text-slate-400 hover:text-slate-600 text-xs"
                title="Clear date filter"
              >
                Clear date
              </button>
            )}

            {/* Doctor filter */}
            <select
              value={filterDoctorId}
              onChange={(e) => {
                setFilterDoctorId(e.target.value)
                setPage(1)
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Physicians</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setPage(1)
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="checked_in">Checked In</option>
              <option value="in_progress">In Consultation</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value)
                setPage(1)
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Visit Types</option>
              <option value="consultation">Consultation</option>
              <option value="follow_up">Follow-Up</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>
      )}

      {/* Appointments Data Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading && appointments.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-3" />
            <p className="text-sm font-medium">Loading appointment schedule...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              No appointments found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {activeView === 'queue'
                ? 'No patients are currently checked in and waiting in the triage queue.'
                : activeView === 'today'
                ? 'No appointments are scheduled for today.'
                : 'No appointments match the applied filter criteria.'}
            </p>
            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Book New Appointment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">UID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor & Specialty</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((apt) => (
                  <tr
                    key={apt.id}
                    onClick={() => {
                      setSelectedDetailId(apt.id)
                      setIsDetailModalOpen(true)
                    }}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    {/* UID */}
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-teal-800">
                      <span className="bg-teal-50 px-2 py-1 rounded border border-teal-200">
                        {apt.appointment_uid}
                      </span>
                    </td>

                    {/* Date & Time */}
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-900">
                      <div>{apt.scheduled_date}</div>
                      <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                        {apt.scheduled_time} – {apt.end_time}
                      </div>
                    </td>

                    {/* Patient */}
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div>{apt.patient_name}</div>
                      <span className="text-[11px] font-mono text-teal-700">
                        {apt.patient_uid}
                      </span>
                    </td>

                    {/* Doctor */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-medium text-slate-900">{apt.doctor_name}</div>
                      <div className="text-slate-500 text-[11px]">
                        {apt.doctor_specialty || 'General Practitioner'}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 text-xs">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 capitalize">
                        {apt.type.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(apt.status)}</td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Check In button */}
                        {apt.status === 'scheduled' &&
                          ['admin', 'receptionist', 'nurse'].includes(userRole) && (
                            <button
                              onClick={() => handleQuickStatusUpdate(apt.id, 'checked_in')}
                              title="Check In Patient"
                              className="px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-semibold"
                            >
                              Check In
                            </button>
                          )}

                        {/* Quick Start Consultation */}
                        {apt.status === 'checked_in' &&
                          ['admin', 'doctor'].includes(userRole) && (
                            <button
                              onClick={() => handleQuickStatusUpdate(apt.id, 'in_progress')}
                              title="Start Consultation"
                              className="px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-semibold"
                            >
                              Consult
                            </button>
                          )}

                        {/* Quick Complete */}
                        {apt.status === 'in_progress' &&
                          ['admin', 'doctor'].includes(userRole) && (
                            <button
                              onClick={() => handleQuickStatusUpdate(apt.id, 'completed')}
                              title="Complete Visit"
                              className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold"
                            >
                              Complete
                            </button>
                          )}

                        {/* Reschedule Button */}
                        {['scheduled', 'checked_in'].includes(apt.status) && (
                          <button
                            onClick={() => setAppointmentToReschedule(apt)}
                            title="Reschedule Appointment"
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Cancel Button */}
                        {['scheduled', 'checked_in'].includes(apt.status) && (
                          <button
                            onClick={() => setAppointmentToCancel(apt)}
                            title="Cancel Appointment"
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* View Details */}
                        <button
                          onClick={() => {
                            setSelectedDetailId(apt.id)
                            setIsDetailModalOpen(true)
                          }}
                          title="View Full Appointment Details"
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {activeView === 'all' && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <strong className="text-slate-900">{appointments.length > 0 ? (page - 1) * perPage + 1 : 0}</strong> to{' '}
              <strong className="text-slate-900">{Math.min(page * perPage, total)}</strong> of{' '}
              <strong className="text-slate-900">{total}</strong> appointments
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 font-medium"
              >
                Previous
              </button>

              <span className="font-medium text-slate-700 px-2">
                Page {page} of {pages || 1}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages || loading}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <AppointmentBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSuccess={(created) => {
          setActionSuccess(`Appointment ${created.appointment_uid} booked successfully!`)
          fetchAppointments()
          setTimeout(() => setActionSuccess(null), 4000)
        }}
      />

      {/* Reschedule Modal */}
      <AppointmentRescheduleModal
        isOpen={!!appointmentToReschedule}
        appointment={appointmentToReschedule}
        onClose={() => setAppointmentToReschedule(null)}
        onSuccess={(updated) => {
          setActionSuccess(`Appointment ${updated.appointment_uid} rescheduled successfully!`)
          fetchAppointments()
          setTimeout(() => setActionSuccess(null), 4000)
        }}
      />

      {/* Cancel Modal */}
      <AppointmentCancelModal
        isOpen={!!appointmentToCancel}
        appointment={appointmentToCancel}
        onClose={() => setAppointmentToCancel(null)}
        onSuccess={(updated) => {
          setActionSuccess(`Appointment ${updated.appointment_uid} cancelled.`)
          fetchAppointments()
          setTimeout(() => setActionSuccess(null), 4000)
        }}
      />

      {/* Detail Modal */}
      <AppointmentDetailModal
        isOpen={isDetailModalOpen}
        appointmentId={selectedDetailId}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedDetailId(null)
        }}
        onStatusUpdated={(updated) => {
          setActionSuccess(`Appointment ${updated.appointment_uid} updated.`)
          fetchAppointments()
          setTimeout(() => setActionSuccess(null), 3000)
        }}
        onOpenReschedule={(apt) => {
          setIsDetailModalOpen(false)
          setAppointmentToReschedule(apt)
        }}
        onOpenCancel={(apt) => {
          setIsDetailModalOpen(false)
          setAppointmentToCancel(apt)
        }}
      />
    </div>
  )
}
