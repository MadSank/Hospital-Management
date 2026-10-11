import React, { useState } from 'react'
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { updateAppointmentStatus } from '../../api/appointments'
import type {
  AppointmentDetail,
  AppointmentSummary,
} from '../../types/appointment'

interface AppointmentCancelModalProps {
  isOpen: boolean
  appointment: AppointmentDetail | AppointmentSummary | null
  onClose: () => void
  onSuccess: (updated: AppointmentDetail) => void
}

export const AppointmentCancelModal: React.FC<AppointmentCancelModalProps> = ({
  isOpen,
  appointment,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !appointment) return null

  const patientName =
    'patient_name' in appointment && appointment.patient_name
      ? appointment.patient_name
      : 'patient' in appointment && appointment.patient
      ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
      : 'Patient'

  const doctorName =
    'doctor_name' in appointment && appointment.doctor_name
      ? appointment.doctor_name
      : 'doctor' in appointment && appointment.doctor
      ? `Dr. ${appointment.doctor.first_name} ${appointment.doctor.last_name}`
      : 'Doctor'

  const handleCancelAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!reason.trim()) {
      setError('Please provide a reason for cancelling this appointment.')
      return
    }

    setSubmitting(true)
    try {
      const updated = await updateAppointmentStatus(appointment.id, {
        status: 'cancelled',
        cancellation_reason: reason.trim(),
      })
      onSuccess(updated)
      onClose()
    } catch (err: any) {
      setError(
        err.response?.data?.detail?.message ||
          err.message ||
          'Failed to cancel appointment.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">
          Cancel Appointment ({appointment.appointment_uid})?
        </h3>
        <p className="text-sm text-slate-600 mt-2">
          Are you sure you want to cancel the booking for{' '}
          <strong>{patientName}</strong> with{' '}
          <strong>{doctorName}</strong> scheduled for{' '}
          <strong>
            {appointment.scheduled_date} at {appointment.scheduled_time}
          </strong>
          ?
        </p>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCancelAppointment} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Patient emergency, physician unavailable, symptom resolved..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-red-500 bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Keep Appointment
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
