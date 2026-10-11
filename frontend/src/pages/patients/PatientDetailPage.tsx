import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  HeartPulse,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Stethoscope,
  User,
  Users,
  X,
} from 'lucide-react'
import { archivePatient, getPatient } from '../../api/patients'
import { getAppointments } from '../../api/appointments'
import { getEncounters } from '../../api/encounters'
import { useAuth } from '../../contexts/AuthContext'
import type { Patient } from '../../types/patient'
import type { AppointmentSummary } from '../../types/appointment'
import type { EncounterSummary } from '../../types/encounter'
import { PatientFormModal } from './PatientFormModal'
import { AppointmentBookingModal } from '../appointments/AppointmentBookingModal'
import { NewEncounterModal } from '../encounters/NewEncounterModal'

export const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userRole = user?.role || 'patient'
  const canManage = ['admin', 'receptionist'].includes(userRole)

  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Archive modal
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'encounters' | 'invoices'>('overview')

  // Patient Appointments
  const [patientAppointments, setPatientAppointments] = useState<AppointmentSummary[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(false)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  // Patient Clinical Encounters
  const [patientEncounters, setPatientEncounters] = useState<EncounterSummary[]>([])
  const [loadingEncounters, setLoadingEncounters] = useState(false)
  const [isEncounterModalOpen, setIsEncounterModalOpen] = useState(false)

  const fetchPatientAppointments = async () => {
    if (!id) return
    setLoadingAppointments(true)
    try {
      const res = await getAppointments({ patient_id: Number(id), per_page: 50 })
      setPatientAppointments(res.items)
    } catch (err: any) {
      console.error('Failed to load patient appointments:', err)
    } finally {
      setLoadingAppointments(false)
    }
  }

  const fetchPatientEncounters = async () => {
    if (!id) return
    setLoadingEncounters(true)
    try {
      const res = await getEncounters({ patient_id: Number(id) })
      setPatientEncounters(res)
    } catch (err: any) {
      console.error('Failed to load patient encounters:', err)
    } finally {
      setLoadingEncounters(false)
    }
  }

  const fetchPatientData = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await getPatient(id)
      setPatient(data)
    } catch (err: any) {
      const status = err.response?.status
      if (status === 404) {
        setError('Patient record not found. The patient may have been deleted or the ID is invalid.')
      } else if (status === 403) {
        setError('Access denied: You do not have permission to view this patient record.')
      } else {
        setError(err.response?.data?.detail?.message || err.message || 'Failed to fetch patient details')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatientData()
  }, [id])

  useEffect(() => {
    if (activeTab === 'appointments') {
      fetchPatientAppointments()
    } else if (activeTab === 'encounters') {
      fetchPatientEncounters()
    }
  }, [id, activeTab])

  const handleEditSuccess = (updated: Patient) => {
    setPatient(updated)
    setIsEditModalOpen(false)
    setActionSuccess(`Patient record ${updated.patient_uid} updated successfully.`)
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const handleConfirmArchive = async () => {
    if (!patient) return
    setIsArchiving(true)
    try {
      await archivePatient(patient.id)
      setPatient({ ...patient, is_active: false })
      setIsArchiveConfirmOpen(false)
      setActionSuccess(`Patient ${patient.patient_uid} has been archived successfully.`)
      setTimeout(() => setActionSuccess(null), 4000)
    } catch (err: any) {
      setError(err.response?.data?.detail?.message || err.message || 'Failed to archive patient')
    } finally {
      setIsArchiving(false)
    }
  }

  // Calculate age helper
  const calculateAge = (dobString?: string): string => {
    if (!dobString) return '—'
    const birthDate = new Date(dobString)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age > 0 ? `${age} years old` : '< 1 year old'
  }

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-9 h-9 text-teal-600 animate-spin mb-3" />
        <p className="text-sm font-medium">Loading patient profile...</p>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="max-w-3xl mx-auto my-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Unable to load patient</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">{error}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/patients')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Patients
          </button>
          <button
            onClick={fetchPatientData}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Parse allergies array/string
  const allergyList = patient.allergies
    ? patient.allergies
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0)
    : []

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/patients')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Patient Directory</span>
        </button>

        <div className="text-xs text-slate-500 font-mono">
          Internal ID: #{patient.id}
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Patient Header Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-teal-900/10">
            {patient.first_name[0]}
            {patient.last_name[0]}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900">
                {patient.first_name} {patient.last_name}
              </h1>
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                {patient.patient_uid}
              </span>

              {patient.is_active ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Archived
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
              <span>{calculateAge(patient.date_of_birth)}</span>
              <span>•</span>
              <span className="capitalize">{patient.gender}</span>
              {patient.blood_group && (
                <>
                  <span>•</span>
                  <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                    Blood Group: {patient.blood_group}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {canManage && (
            <>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <Edit3 className="w-4 h-4 text-slate-500" />
                Edit Profile
              </button>

              {patient.is_active && (
                <button
                  onClick={() => setIsArchiveConfirmOpen(true)}
                  className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors shadow-xs"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-1 border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Clinical & Demographic Overview
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'appointments'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Appointments</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">M3</span>
        </button>
        <button
          onClick={() => setActiveTab('encounters')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'encounters'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Encounters & EHR</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">M4</span>
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'invoices'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Invoices & Billing</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">M7</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 cols): Clinical & Medical History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Clinical Alerts & Allergies Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                <HeartPulse className="w-5 h-5 text-red-600" />
                Clinical Alerts & Allergies
              </h2>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Known Allergies
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {allergyList.length > 0 ? (
                      allergyList.map((allergy, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          {allergy}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        No Known Drug Allergies (NKDA)
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Medical & Surgical History
                  </span>
                  <div className="mt-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
                    {patient.medical_history || 'No pre-existing conditions or medical history documented.'}
                  </div>
                </div>

                {patient.notes && (
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Staff / Clinical Notes
                    </span>
                    <div className="mt-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {patient.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Contacts Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-teal-600" />
                Emergency Contacts
              </h2>

              {patient.emergency_contacts && patient.emergency_contacts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {patient.emergency_contacts.map((contact, idx) => (
                    <div
                      key={contact.id || idx}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-2"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-sm">{contact.name}</h4>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                            {contact.relationship}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs">
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-2 text-slate-700 hover:text-teal-700 font-mono"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{contact.phone}</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No emergency contacts registered.</p>
              )}
            </div>
          </div>

          {/* Right Column (1 col): Demographics & Address */}
          <div className="space-y-6">
            {/* Demographics Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" />
                Demographics
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Date of Birth:</span>
                  <span className="font-medium text-slate-800">
                    {patient.date_of_birth ? patient.date_of_birth.substring(0, 10) : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Age:</span>
                  <span className="font-medium text-slate-800">{calculateAge(patient.date_of_birth)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Gender:</span>
                  <span className="font-medium text-slate-800 capitalize">{patient.gender}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Blood Group:</span>
                  <span className="font-bold text-red-600">{patient.blood_group || '—'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Status:</span>
                  <span className={patient.is_active ? 'font-semibold text-emerald-600' : 'text-slate-500'}>
                    {patient.is_active ? 'Active' : 'Archived'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact & Address Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600" />
                Contact & Address
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500">Primary Phone:</span>
                  <a
                    href={`tel:${patient.phone}`}
                    className="block font-mono font-medium text-teal-700 hover:underline mt-0.5"
                  >
                    {patient.phone}
                  </a>
                </div>

                <div>
                  <span className="text-slate-500">Email Address:</span>
                  {patient.email ? (
                    <a
                      href={`mailto:${patient.email}`}
                      className="block text-slate-800 hover:text-teal-700 mt-0.5 truncate"
                    >
                      {patient.email}
                    </a>
                  ) : (
                    <span className="block text-slate-400 mt-0.5">—</span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Residential Address:</span>
                  <p className="mt-0.5 text-slate-800 leading-snug">
                    {patient.address || '—'}
                  </p>
                  {(patient.city || patient.state || patient.zip_code) && (
                    <p className="text-slate-600 mt-1">
                      {[patient.city, patient.state, patient.zip_code].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Audit Metadata Card */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-[11px] text-slate-500 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Audit & System Log</span>
              </div>
              <div className="flex justify-between">
                <span>Created At:</span>
                <span className="font-mono text-slate-700">
                  {patient.created_at ? new Date(patient.created_at).toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="font-mono text-slate-700">
                  {patient.updated_at ? new Date(patient.updated_at).toLocaleString() : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Appointments */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                <span>Patient Appointment History</span>
              </h3>
              <p className="text-xs text-slate-500">
                Scheduled consultations, check-ins, and past clinic visits for {patient.first_name}.
              </p>
            </div>
            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Book Appointment
            </button>
          </div>

          {loadingAppointments ? (
            <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-teal-600 mr-2" />
              Loading appointments...
            </div>
          ) : patientAppointments.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-500">No appointments scheduled for this patient.</p>
              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="mt-3 text-xs font-semibold text-teal-700 hover:underline"
              >
                + Schedule First Appointment
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">UID</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Doctor</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patientAppointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-800">
                        {apt.appointment_uid}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {apt.scheduled_date} • {apt.scheduled_time}–{apt.end_time}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">
                        {apt.doctor_name}
                      </td>
                      <td className="py-2.5 px-3 capitalize">
                        {apt.type.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {apt.reason || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="capitalize px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {apt.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Clinical Encounters & EHR (M4) */}
      {activeTab === 'encounters' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-700" />
                <span>Clinical Consultation History</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Past doctor encounters, diagnosis assessments, and vital sign logs
              </p>
            </div>

            {['admin', 'doctor'].includes(userRole) && (
              <button
                onClick={() => setIsEncounterModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start Consultation</span>
              </button>
            )}
          </div>

          {loadingEncounters ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : patientEncounters.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No clinical encounters documented for this patient yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3">UID</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Doctor</th>
                    <th className="py-2.5 px-3">Chief Complaint</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patientEncounters.map((enc) => (
                    <tr
                      key={enc.id}
                      onClick={() => navigate(`/encounters/${enc.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-700">
                        {enc.encounter_uid}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {new Date(enc.encounter_date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {enc.doctor_name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                        {enc.chief_complaint || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            enc.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              enc.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                          />
                          {enc.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-teal-700 font-semibold hover:underline">
                          View EHR →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Invoices Placeholder (M7) */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Milestone 7 — Billing & Invoices</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Consultation fees, prescription billing, and invoice generation activate in Milestone 7.
          </p>
        </div>
      )}

      {/* Edit Patient Modal */}
      <PatientFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        initialData={patient}
      />

      {/* Book Appointment Modal */}
      <AppointmentBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSuccess={(created) => {
          setActionSuccess(`Appointment ${created.appointment_uid} booked successfully!`)
          fetchPatientAppointments()
          setTimeout(() => setActionSuccess(null), 4000)
        }}
        preselectedPatientId={patient.id}
      />

      {/* Start Consultation Modal */}
      <NewEncounterModal
        isOpen={isEncounterModalOpen}
        onClose={() => setIsEncounterModalOpen(false)}
        onSuccess={(created) => {
          setActionSuccess(`Encounter ${created.encounter_uid} initiated successfully!`)
          fetchPatientEncounters()
          navigate(`/encounters/${created.id}`)
        }}
        preselectedPatientId={patient.id}
      />

      {/* Confirmation Modal for Archiving */}
      {isArchiveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Archive className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              Archive Patient Record?
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              Are you sure you want to archive{' '}
              <strong>
                {patient.first_name} {patient.last_name}
              </strong>{' '}
              ({patient.patient_uid})?
            </p>
            <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              This marks the patient as inactive. Historical records remain fully preserved.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsArchiveConfirmOpen(false)}
                disabled={isArchiving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isArchiving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs"
              >
                {isArchiving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  'Confirm Archive'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
