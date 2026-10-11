import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Loader2,
  Phone,
  Play,
  RotateCcw,
  Stethoscope,
  User,
  X,
} from 'lucide-react'
import { getAppointment, updateAppointmentStatus } from '../../api/appointments'
import { useAuth } from '../../contexts/AuthContext'
import type { AppointmentDetail } from '../../types/appointment'

interface AppointmentDetailModalProps {
  isOpen: boolean
  appointmentId: number | null
  onClose: () => void
  onStatusUpdated: (updated: AppointmentDetail) => void
  onOpenReschedule: (apt: AppointmentDetail) => void
  onOpenCancel: (apt: AppointmentDetail) => void
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  isOpen,
  appointmentId,
  onClose,
  onStatusUpdated,
  onOpenReschedule,
  onOpenCancel,
}) => {
  const { user } = useAuth()
  const userRole = user?.role || 'patient'

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false)

  useEffect(() => {
    if (!isOpen || !appointmentId) return
    const fetchDetail = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getAppointment(appointmentId)
        setAppointment(data)
      } catch (err: any) {
        setError(
          err.response?.data?.detail?.message ||
            'Failed to load appointment details.'
        )
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [isOpen, appointmentId])

  if (!isOpen) return null

  const handleTransition = async (targetStatus: string) => {
    if (!appointment) return
    setUpdatingStatus(true)
    setError(null)
    try {
      const updated = await updateAppointmentStatus(appointment.id, {
        status: targetStatus,
      })
      setAppointment(updated)
      onStatusUpdated(updated)
    } catch (err: any) {
      setError(
        err.response?.data?.detail?.message ||
          `Failed to transition status to ${targetStatus}.`
      )
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Scheduled
          </span>
        )
      case 'checked_in':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Checked In (Waiting)
          </span>
        )
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            In Consultation
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Cancelled
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 capitalize">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">
                  Appointment Details
                </h3>
                {appointment && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                    {appointment.appointment_uid}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Clinical booking record and lifecycle actions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-2" />
            <span className="text-xs font-medium">Loading record...</span>
          </div>
        ) : error || !appointment ? (
          <div className="p-6 text-center text-red-600 text-sm">
            {error || 'Appointment record not found.'}
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Top Quick Status Ribbon */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Date & Time:</span>
                  <strong className="text-slate-900 font-mono">
                    {appointment.scheduled_date} • {appointment.scheduled_time}–{appointment.end_time}
                  </strong>
                </div>
                <div className="h-7 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-500 block">Visit Type:</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {appointment.type.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div>{getStatusBadge(appointment.status)}</div>
            </div>

            {/* Two Column Grid: Patient & Doctor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Patient Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                  <User className="w-4 h-4 text-teal-600" />
                  <span>Patient Information</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Name:</span>
                    <strong className="text-slate-800">
                      {appointment.patient.first_name} {appointment.patient.last_name}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MRN:</span>
                    <span className="font-mono font-medium text-teal-800">
                      {appointment.patient.patient_uid}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <a
                      href={`tel:${appointment.patient.phone}`}
                      className="font-mono text-teal-700 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-slate-400" />
                      {appointment.patient.phone}
                    </a>
                  </div>
                  {appointment.patient.blood_group && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Blood Group:</span>
                      <span className="font-bold text-red-600">
                        {appointment.patient.blood_group}
                      </span>
                    </div>
                  )}
                  {appointment.patient.allergies && (
                    <div className="pt-1 text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Allergies: {appointment.patient.allergies}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Doctor Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span>Attending Physician</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Doctor:</span>
                    <strong className="text-slate-800">
                      Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Staff ID:</span>
                    <span className="font-mono font-medium text-slate-700">
                      {appointment.doctor.staff_uid}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Department:</span>
                    <span className="font-medium text-slate-800">
                      {appointment.doctor.department_name || 'General Clinic'}
                    </span>
                  </div>
                  {appointment.doctor.specialty && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Specialty:</span>
                      <span className="text-slate-700 font-medium">
                        {appointment.doctor.specialty}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contact:</span>
                    <span className="font-mono text-slate-700">
                      {appointment.doctor.phone}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reason & Notes */}
            <div className="space-y-2.5 text-xs">
              {appointment.reason && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-600 block mb-1">
                    Primary Reason for Visit:
                  </span>
                  <p className="text-slate-800">{appointment.reason}</p>
                </div>
              )}

              {appointment.notes && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-600 block mb-1">
                    Staff Clinical Notes:
                  </span>
                  <p className="text-slate-800">{appointment.notes}</p>
                </div>
              )}

              {appointment.cancellation_reason && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900">
                  <span className="font-bold block mb-1 flex items-center gap-1.5 text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    Cancellation Reason:
                  </span>
                  <p>{appointment.cancellation_reason}</p>
                </div>
              )}
            </div>

            {/* Lifecycle Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Reschedule Button */}
                {['scheduled', 'checked_in'].includes(appointment.status) && (
                  <button
                    onClick={() => {
                      onOpenReschedule(appointment)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    Reschedule
                  </button>
                )}

                {/* Cancel Button */}
                {['scheduled', 'checked_in'].includes(appointment.status) && (
                  <button
                    onClick={() => {
                      onOpenCancel(appointment)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                )}
              </div>

              {/* Status progression actions */}
              <div className="flex items-center gap-2">
                {appointment.status === 'scheduled' &&
                  ['admin', 'receptionist', 'nurse'].includes(userRole) && (
                    <button
                      onClick={() => handleTransition('checked_in')}
                      disabled={updatingStatus}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs"
                    >
                      {updatingStatus ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Check In Patient
                    </button>
                  )}

                {appointment.status === 'checked_in' &&
                  ['admin', 'doctor'].includes(userRole) && (
                    <button
                      onClick={() => handleTransition('in_progress')}
                      disabled={updatingStatus}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-xs"
                    >
                      {updatingStatus ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      Start Consultation
                    </button>
                  )}

                {appointment.status === 'in_progress' &&
                  ['admin', 'doctor'].includes(userRole) && (
                    <button
                      onClick={() => handleTransition('completed')}
                      disabled={updatingStatus}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      {updatingStatus ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Complete Consultation
                    </button>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
