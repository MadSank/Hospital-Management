import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Loader2,
  X,
} from 'lucide-react'
import { rescheduleAppointment } from '../../api/appointments'
import { getDoctorAvailableSlots } from '../../api/staff'
import type {
  AppointmentDetail,
  AppointmentSummary,
  TimeSlot,
} from '../../types/appointment'

interface AppointmentRescheduleModalProps {
  isOpen: boolean
  appointment: AppointmentDetail | AppointmentSummary | null
  onClose: () => void
  onSuccess: (updated: AppointmentDetail) => void
}

export const AppointmentRescheduleModal: React.FC<AppointmentRescheduleModalProps> = ({
  isOpen,
  appointment,
  onClose,
  onSuccess,
}) => {
  const [newDate, setNewDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [rescheduleReason, setRescheduleReason] = useState<string>('')

  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false)
  const [slotError, setSlotError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (appointment) {
      // Default new date to existing appointment date or tomorrow
      setNewDate(appointment.scheduled_date)
      setRescheduleReason('')
      setSelectedSlot(null)
    }
  }, [appointment, isOpen])

  useEffect(() => {
    if (!isOpen || !appointment || !newDate) return
    const loadSlots = async () => {
      setLoadingSlots(true)
      setSlotError(null)
      try {
        const res = await getDoctorAvailableSlots(appointment.doctor_id, newDate)
        setAvailableSlots(res.slots)
        if (res.slots.length === 0) {
          setSlotError('No working slots scheduled for this doctor on this day.')
        }
      } catch (err: any) {
        setSlotError('Could not retrieve available slots.')
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }
    loadSlots()
  }, [isOpen, appointment, newDate])

  if (!isOpen || !appointment) return null

  const todayStr = new Date().toISOString().substring(0, 10)

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!newDate) {
      setSubmitError('Please select a date.')
      return
    }
    if (!selectedSlot) {
      setSubmitError('Please select a time slot.')
      return
    }

    setSubmitting(true)
    try {
      const updated = await rescheduleAppointment(appointment.id, {
        scheduled_date: newDate,
        scheduled_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        reason: rescheduleReason.trim() || undefined,
      })
      onSuccess(updated)
      onClose()
    } catch (err: any) {
      const msg =
        err.response?.data?.detail?.message ||
        err.message ||
        'Failed to reschedule appointment. The selected slot may already be occupied.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const patientName =
    'patient_name' in appointment && appointment.patient_name
      ? appointment.patient_name
      : 'patient' in appointment && appointment.patient
      ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
      : 'Patient'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Reschedule Appointment ({appointment.appointment_uid})
              </h3>
              <p className="text-xs text-slate-500">
                Move {patientName} to a different date or time slot.
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

        {submitError && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleReschedule} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              min={todayStr}
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value)
                setSelectedSlot(null)
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 bg-white"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>Select New Time Slot</span>
                <span className="text-red-500">*</span>
              </label>
              {selectedSlot && (
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {selectedSlot.start_time} – {selectedSlot.end_time}
                </span>
              )}
            </div>

            {loadingSlots ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs text-center flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600 mr-2" />
                Loading slots...
              </div>
            ) : slotError ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                {slotError}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                {availableSlots.map((slot) => {
                  const isSelected =
                    selectedSlot?.start_time === slot.start_time &&
                    selectedSlot?.end_time === slot.end_time
                  const isOriginalSlot =
                    appointment.scheduled_date === newDate &&
                    appointment.scheduled_time.startsWith(slot.start_time)
                  const canSelect = slot.available || isOriginalSlot

                  return (
                    <button
                      key={slot.start_time}
                      type="button"
                      disabled={!canSelect}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all ${
                        !canSelect
                          ? 'bg-slate-100 text-slate-400 line-through cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100'
                      }`}
                    >
                      {slot.start_time}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Rescheduling
            </label>
            <input
              type="text"
              placeholder="e.g. Patient requested morning shift, doctor schedule update..."
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm Reschedule
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
