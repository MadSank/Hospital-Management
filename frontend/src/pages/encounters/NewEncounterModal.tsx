import React, { useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  FileText,
  Loader2,
  Stethoscope,
  X,
} from 'lucide-react'
import { createEncounter } from '../../api/encounters'
import { getPatients } from '../../api/patients'
import { getDoctors } from '../../api/staff'
import type { DoctorSummary } from '../../types/appointment'
import type { EncounterDetail } from '../../types/encounter'
import type { Patient } from '../../types/patient'

interface NewEncounterModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (encounter: EncounterDetail) => void
  preselectedPatientId?: number
  preselectedAppointmentId?: number
}

export const NewEncounterModal: React.FC<NewEncounterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedPatientId,
  preselectedAppointmentId,
}) => {
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<DoctorSummary[]>([])
  const [loadingInitial, setLoadingInitial] = useState(false)

  // Form fields
  const [patientId, setPatientId] = useState<number | string>(preselectedPatientId || '')
  const [doctorId, setDoctorId] = useState<number | string>('')
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState('')
  const [examinationNotes, setExaminationNotes] = useState('')
  const [assessment, setAssessment] = useState('')
  const [treatmentPlan, setTreatmentPlan] = useState('')

  // Vitals
  const [temperatureF, setTemperatureF] = useState('')
  const [bpSystolic, setBpSystolic] = useState('')
  const [bpDiastolic, setBpDiastolic] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [respiratoryRate, setRespiratoryRate] = useState('')
  const [oxygenSaturation, setOxygenSaturation] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')

  // Primary Diagnosis
  const [diagName, setDiagName] = useState('')
  const [diagCode, setDiagCode] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const fetchSelectData = async () => {
      setLoadingInitial(true)
      try {
        const [patRes, docRes] = await Promise.all([
          getPatients({ per_page: 100 }),
          getDoctors(),
        ])
        setPatients(patRes.items)
        setDoctors(docRes)
        if (docRes.length > 0 && !doctorId) {
          setDoctorId(docRes[0].id)
        }
      } catch (err) {
        console.error('Failed to load doctors/patients', err)
      } finally {
        setLoadingInitial(false)
      }
    }
    fetchSelectData()
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId) {
      setErrorMsg('Please select a patient.')
      return
    }
    if (!chiefComplaint.trim()) {
      setErrorMsg('Chief complaint is required.')
      return
    }

    setSubmitting(true)
    setErrorMsg(null)

    try {
      const vitalsPayload = (temperatureF || bpSystolic || bpDiastolic || heartRate || oxygenSaturation) ? {
        temperature_f: temperatureF ? parseFloat(temperatureF) : undefined,
        blood_pressure_systolic: bpSystolic ? parseInt(bpSystolic) : undefined,
        blood_pressure_diastolic: bpDiastolic ? parseInt(bpDiastolic) : undefined,
        heart_rate: heartRate ? parseInt(heartRate) : undefined,
        respiratory_rate: respiratoryRate ? parseInt(respiratoryRate) : undefined,
        oxygen_saturation: oxygenSaturation ? parseFloat(oxygenSaturation) : undefined,
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
        height_cm: heightCm ? parseFloat(heightCm) : undefined,
      } : undefined

      const diagnosesPayload = diagName.trim() ? [
        {
          diagnosis_name: diagName.trim(),
          diagnosis_code: diagCode.trim() || undefined,
          diagnosis_type: 'primary',
        }
      ] : undefined

      const created = await createEncounter({
        patient_id: Number(patientId),
        doctor_id: doctorId ? Number(doctorId) : undefined,
        appointment_id: preselectedAppointmentId,
        chief_complaint: chiefComplaint.trim(),
        history_of_present_illness: historyOfPresentIllness.trim() || undefined,
        examination_notes: examinationNotes.trim() || undefined,
        assessment: assessment.trim() || undefined,
        treatment_plan: treatmentPlan.trim() || undefined,
        vitals: vitalsPayload,
        diagnoses: diagnosesPayload,
      })

      onSuccess(created)
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.detail || 'Failed to start consultation'
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Start Clinical Consultation</h2>
              <p className="text-xs text-slate-500">Record subjective notes, objective vitals, and assessment</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Patient & Doctor Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient *</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                disabled={Boolean(preselectedPatientId) || loadingInitial}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600"
                required
              >
                <option value="">-- Choose Patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.patient_uid})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Attending Doctor *</label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                disabled={loadingInitial}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600"
                required
              >
                <option value="">-- Choose Doctor --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.first_name} {d.last_name} ({d.specialty || 'General'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subjective Notes */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-teal-700" />
              Subjective & History
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Complaint *</label>
              <input
                type="text"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="e.g. Sharp chest discomfort, fever, headache"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">History of Present Illness (HPI)</label>
              <textarea
                rows={2}
                value={historyOfPresentIllness}
                onChange={(e) => setHistoryOfPresentIllness(e.target.value)}
                placeholder="Onset, duration, severity, aggravating factors..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Examination Notes</label>
              <textarea
                rows={2}
                value={examinationNotes}
                onChange={(e) => setExaminationNotes(e.target.value)}
                placeholder="General appearance, HEENT, cardiovascular, respiratory findings..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Objective: Initial Vitals */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-red-600" />
              Triage Vital Signs (Optional)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600">Temp (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  value={temperatureF}
                  onChange={(e) => setTemperatureF(e.target.value)}
                  placeholder="98.6"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600">BP Systolic</label>
                <input
                  type="number"
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(e.target.value)}
                  placeholder="120"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600">BP Diastolic</label>
                <input
                  type="number"
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(e.target.value)}
                  placeholder="80"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600">Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="72"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600">Resp Rate (/min)</label>
                <input
                  type="number"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(e.target.value)}
                  placeholder="16"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600">SpO2 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={oxygenSaturation}
                  onChange={(e) => setOxygenSaturation(e.target.value)}
                  placeholder="98.0"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="70"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600">Height (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="170"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Assessment, Diagnosis & Treatment Plan */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-teal-700" />
              Assessment & Diagnosis
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Diagnosis Name</label>
                <input
                  type="text"
                  value={diagName}
                  onChange={(e) => setDiagName(e.target.value)}
                  placeholder="e.g. Acute Viral Bronchitis"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ICD-10 Code</label>
                <input
                  type="text"
                  value={diagCode}
                  onChange={(e) => setDiagCode(e.target.value)}
                  placeholder="e.g. J20.9"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-600 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Assessment</label>
              <textarea
                rows={2}
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                placeholder="Doctor's clinical findings and differential diagnoses..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Treatment Plan & Recommendations</label>
              <textarea
                rows={2}
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                placeholder="Diagnostic workup, therapy, medications..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-md shadow-teal-900/20 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save & Open Encounter</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
