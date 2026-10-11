import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Loader2,
  User,
  X,
} from 'lucide-react'
import { createAppointment } from '../../api/appointments'
import { getPatients } from '../../api/patients'
import { getDoctorAvailableSlots, getDoctors } from '../../api/staff'
import { useAuth } from '../../contexts/AuthContext'
import type {
  AppointmentDetail,
  DoctorSummary,
  TimeSlot,
} from '../../types/appointment'
import type { Patient } from '../../types/patient'

interface AppointmentBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (appointment: AppointmentDetail) => void
  preselectedPatientId?: number
  preselectedDoctorId?: number
}

export const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedPatientId,
  preselectedDoctorId,
}) => {
  const { user } = useAuth()
  const isPatientUser = user?.role === 'patient'

  // Doctors & Patients list
  const [doctors, setDoctors] = useState<DoctorSummary[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingInitial, setLoadingInitial] = useState(false)

  // Form states
  const [selectedPatientId, setSelectedPatientId] = useState<number | string>(
    preselectedPatientId || ''
  )
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | string>(
    preselectedDoctorId || ''
  )
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().substring(0, 10)
  })
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [appointmentType, setAppointmentType] = useState<string>('consultation')
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Available slots states
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false)
  const [slotError, setSlotError] = useState<string | null>(null)

  // Form submission states
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Load initial doctors and patients
  useEffect(() => {
    if (!isOpen) return
    const loadData = async () => {
      setLoadingInitial(true)
      try {
        const docList = await getDoctors()
        setDoctors(docList)
        if (!selectedDoctorId && docList.length > 0) {
          setSelectedDoctorId(docList[0].id)
        }

        // Only staff need to fetch patient list; patient user is bound to self
        if (!isPatientUser) {
          const patList = await getPatients({ per_page: 100, is_active: true })
          setPatients(patList.items)
          if (!selectedPatientId && patList.items.length > 0) {
            setSelectedPatientId(patList.items[0].id)
          }
        } else {
          // If patient role, bind to patient profile (in seed PAT-0001 id: 1)
          setSelectedPatientId(1)
        }
      } catch (err: any) {
        console.error('Failed to load doctors or patients:', err)
      } finally {
        setLoadingInitial(false)
      }
    }
    loadData()
  }, [isOpen, isPatientUser])

  // Load slots when doctor or date changes
  useEffect(() => {
    if (!isOpen || !selectedDoctorId || !selectedDate) return
    const loadSlots = async () => {
      setLoadingSlots(true)
      setSlotError(null)
      setSelectedSlot(null)
      try {
        const res = await getDoctorAvailableSlots(
          Number(selectedDoctorId),
          selectedDate
        )
        setAvailableSlots(res.slots)
        if (res.slots.length === 0) {
          setSlotError('No working slots scheduled for this doctor on this day.')
        }
      } catch (err: any) {
        setSlotError(
          err.response?.data?.detail?.message ||
            'Could not retrieve doctor availability for this date.'
        )
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }
    loadSlots()
  }, [isOpen, selectedDoctorId, selectedDate])

  if (!isOpen) return null

  const todayStr = new Date().toISOString().substring(0, 10)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!selectedPatientId) {
      setSubmitError('Please select a patient.')
      return
    }
    if (!selectedDoctorId) {
      setSubmitError('Please select a doctor.')
      return
    }
    if (!selectedDate) {
      setSubmitError('Please select an appointment date.')
      return
    }
    if (!selectedSlot) {
      setSubmitError('Please select an available time slot from the schedule below.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        patient_id: Number(selectedPatientId),
        doctor_id: Number(selectedDoctorId),
        scheduled_date: selectedDate,
        scheduled_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        type: appointmentType,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      }

      const created = await createAppointment(payload)
      onSuccess(created)
      onClose()
    } catch (err: any) {
      const msg =
        err.response?.data?.detail?.message ||
        err.message ||
        'Failed to book appointment. Please check for scheduling conflicts.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
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
              <h2 className="text-lg font-bold text-slate-900">
                Book Clinical Appointment
              </h2>
              <p className="text-xs text-slate-500">
                Schedule a consultation with live doctor availability & conflict checks.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {submitError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{submitError}</div>
          </div>
        )}

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Patient Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient <span className="text-red-500">*</span>
              </label>
              {isPatientUser ? (
                <div className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-sm font-medium text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-600" />
                  <span>{user?.full_name || 'My Profile (Self)'}</span>
                </div>
              ) : (
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 bg-white"
                  disabled={loadingInitial}
                  required
                >
                  <option value="">Select a patient...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.patient_uid}: {p.first_name} {p.last_name} ({p.phone})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Doctor Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attending Doctor <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 bg-white"
                disabled={loadingInitial}
                required
              >
                <option value="">Select a physician...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.specialty || d.department_name || 'General'})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Appointment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 bg-white"
                required
              />
            </div>

            {/* Appointment Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Visit Type <span className="text-red-500">*</span>
              </label>
              <select
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="consultation">Standard Consultation (New/Regular)</option>
                <option value="follow_up">Follow-Up Review</option>
                <option value="emergency">Emergency / Urgent</option>
              </select>
            </div>
          </div>

          {/* Time Slot Picker Grid */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>Available Doctor Time Slots</span>
                <span className="text-red-500">*</span>
              </label>
              {selectedSlot && (
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Selected: {selectedSlot.start_time} – {selectedSlot.end_time}
                </span>
              )}
            </div>

            {loadingSlots ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-500 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600 mr-2" />
                Calculating real-time doctor schedule...
              </div>
            ) : slotError ? (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs">
                {slotError}
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs text-center">
                Please select a doctor and date to view available appointment slots.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1">
                {availableSlots.map((slot) => {
                  const isSelected =
                    selectedSlot?.start_time === slot.start_time &&
                    selectedSlot?.end_time === slot.end_time

                  return (
                    <button
                      key={slot.start_time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                        !slot.available
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 line-through'
                          : isSelected
                          ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-600 ring-offset-1'
                          : 'bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100'
                      }`}
                    >
                      <span>{slot.start_time}</span>
                      <span className="text-[10px] font-normal opacity-75">
                        {slot.available ? 'Free' : 'Booked'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Reason for Visit */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Primary Reason for Visit
            </label>
            <input
              type="text"
              placeholder="e.g. Chest pain, annual cardiology review, diabetes checkup..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Clinical / Scheduling Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Needs wheelchair assistance, bringing outside lab reports..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirming Slot...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm Booking
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
