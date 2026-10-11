import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  Pill,
  Plus,
  Stethoscope,
  X,
} from 'lucide-react'
import {
  addEncounterDiagnosis,
  addEncounterVitals,
  completeEncounter,
  getEncounter,
} from '../../api/encounters'
import { createPrescription, getMedicines } from '../../api/pharmacy'
import { useAuth } from '../../contexts/AuthContext'
import type { EncounterDetail } from '../../types/encounter'
import type { Medicine } from '../../types/pharmacy'

export const EncounterDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [encounter, setEncounter] = useState<EncounterDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Vitals sub-modal
  const [isVitalsOpen, setIsVitalsOpen] = useState(false)
  const [vitalsTemp, setVitalsTemp] = useState('')
  const [vitalsSys, setVitalsSys] = useState('')
  const [vitalsDia, setVitalsDia] = useState('')
  const [vitalsHR, setVitalsHR] = useState('')
  const [vitalsO2, setVitalsO2] = useState('')
  const [vitalsNotes, setVitalsNotes] = useState('')
  const [savingVitals, setSavingVitals] = useState(false)

  // Diagnosis sub-modal
  const [isDiagOpen, setIsDiagOpen] = useState(false)
  const [diagName, setDiagName] = useState('')
  const [diagCode, setDiagCode] = useState('')
  const [diagType, setDiagType] = useState('secondary')
  const [diagNotes, setDiagNotes] = useState('')
  const [savingDiag, setSavingDiag] = useState(false)

  // Prescription sub-modal
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [prescMedId, setPrescMedId] = useState<number | string>('')
  const [prescDosage, setPrescDosage] = useState('500mg')
  const [prescFreq, setPrescFreq] = useState('3 times daily')
  const [prescDuration, setPrescDuration] = useState('7 days')
  const [prescQty, setPrescQty] = useState('21')
  const [prescInstructions, setPrescInstructions] = useState('Take after meals')
  const [savingPresc, setSavingPresc] = useState(false)

  const fetchEncounter = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await getEncounter(id)
      setEncounter(data)
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail?.message || 'Failed to load encounter.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEncounter()
  }, [id])

  const handleCompleteEncounter = async () => {
    if (!encounter) return
    try {
      const updated = await completeEncounter(encounter.id)
      setEncounter(updated)
      setSuccessMsg('Clinical encounter marked as completed successfully.')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || 'Failed to complete encounter')
    }
  }

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!encounter) return
    setSavingVitals(true)
    try {
      await addEncounterVitals(encounter.id, {
        temperature_f: vitalsTemp ? parseFloat(vitalsTemp) : undefined,
        blood_pressure_systolic: vitalsSys ? parseInt(vitalsSys) : undefined,
        blood_pressure_diastolic: vitalsDia ? parseInt(vitalsDia) : undefined,
        heart_rate: vitalsHR ? parseInt(vitalsHR) : undefined,
        oxygen_saturation: vitalsO2 ? parseFloat(vitalsO2) : undefined,
        notes: vitalsNotes || undefined,
      })
      setIsVitalsOpen(false)
      fetchEncounter()
      setSuccessMsg('Vitals recorded successfully.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || 'Failed to record vitals')
    } finally {
      setSavingVitals(false)
    }
  }

  const handleSaveDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!encounter || !diagName) return
    setSavingDiag(true)
    try {
      await addEncounterDiagnosis(encounter.id, {
        diagnosis_name: diagName.trim(),
        diagnosis_code: diagCode.trim() || undefined,
        diagnosis_type: diagType,
        notes: diagNotes || undefined,
      })
      setIsDiagOpen(false)
      fetchEncounter()
      setSuccessMsg('Diagnosis added successfully.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || 'Failed to add diagnosis')
    } finally {
      setSavingDiag(false)
    }
  }

  const handleOpenPrescription = async () => {
    try {
      const meds = await getMedicines({ is_active: true })
      setMedicines(meds)
      if (meds.length > 0) setPrescMedId(meds[0].id)
      setIsPrescriptionOpen(true)
    } catch (err) {
      alert('Failed to load medicines catalogue')
    }
  }

  const handleSavePrescription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!encounter || !prescMedId) return
    setSavingPresc(true)
    try {
      await createPrescription({
        encounter_id: encounter.id,
        patient_id: encounter.patient_id,
        doctor_id: encounter.doctor_id,
        items: [
          {
            medicine_id: Number(prescMedId),
            dosage: prescDosage,
            frequency: prescFreq,
            route: 'oral',
            duration: prescDuration,
            quantity: parseInt(prescQty),
            instructions: prescInstructions,
          },
        ],
      })
      setIsPrescriptionOpen(false)
      setSuccessMsg('Prescription sent to pharmacy successfully.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || 'Failed to create prescription')
    } finally {
      setSavingPresc(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (errorMsg || !encounter) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {errorMsg || 'Encounter record not found.'}
        </div>
      </div>
    )
  }

  const canEdit = user?.role === 'admin' || user?.role === 'doctor'

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/encounters')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Clinical Encounters</span>
        </button>

        <span className="font-mono text-xs text-slate-400">
          Encounter ID #{encounter.id}
        </span>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-teal-900/10">
            <Stethoscope className="w-7 h-7" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900">
                {encounter.patient_name}
              </h1>
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                {encounter.encounter_uid}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  encounter.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${encounter.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                {encounter.status === 'completed' ? 'Completed' : 'In Progress'}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
              <span>Attending: <strong>{encounter.doctor_name}</strong></span>
              <span>•</span>
              <span>Patient MRN: <Link to={`/patients/${encounter.patient_id}`} className="text-teal-700 underline font-mono">{encounter.patient_uid}</Link></span>
              <span>•</span>
              <span>Date: {new Date(encounter.encounter_date).toLocaleDateString()}</span>
              {encounter.appointment_uid && (
                <>
                  <span>•</span>
                  <span>Linked Apt: <span className="font-mono font-semibold">{encounter.appointment_uid}</span></span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {canEdit && encounter.status !== 'completed' && (
            <>
              <button
                onClick={() => setIsVitalsOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                <Activity className="w-3.5 h-3.5 text-red-600" />
                <span>Record Vitals</span>
              </button>

              <button
                onClick={() => setIsDiagOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-teal-700" />
                <span>Add Diagnosis</span>
              </button>

              <button
                onClick={handleOpenPrescription}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors"
              >
                <Pill className="w-3.5 h-3.5 text-amber-600" />
                <span>Prescribe Rx</span>
              </button>

              <button
                onClick={handleCompleteEncounter}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Consultation</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Grid: Clinical Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Notes, Examination & Plan */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subjective & Physical Exam Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-700" />
              Clinical Consultation Notes
            </h2>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Chief Complaint</span>
              <p className="mt-1 text-sm font-semibold text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200">
                {encounter.chief_complaint || 'None recorded'}
              </p>
            </div>

            {encounter.history_of_present_illness && (
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">History of Present Illness (HPI)</span>
                <p className="mt-1 text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {encounter.history_of_present_illness}
                </p>
              </div>
            )}

            {encounter.examination_notes && (
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Physical Examination</span>
                <p className="mt-1 text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {encounter.examination_notes}
                </p>
              </div>
            )}
          </div>

          {/* Assessment & Treatment Plan Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-700" />
              Assessment & Care Plan
            </h2>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Doctor Assessment</span>
              <p className="mt-1 text-xs text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                {encounter.assessment || 'No clinical assessment documented yet.'}
              </p>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Treatment Plan & Recommendations</span>
              <p className="mt-1 text-xs text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                {encounter.treatment_plan || 'No treatment plan documented yet.'}
              </p>
            </div>

            {encounter.follow_up_date && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-700 shrink-0" />
                <span>Follow-up scheduled on: <strong>{new Date(encounter.follow_up_date).toLocaleDateString()}</strong> {encounter.follow_up_notes && `— ${encounter.follow_up_notes}`}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Diagnoses & Vitals Sidebar */}
        <div className="space-y-6">
          {/* Diagnoses Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-700" />
                Diagnoses ({encounter.diagnoses.length})
              </h2>
            </div>

            {encounter.diagnoses.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No diagnoses recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {encounter.diagnoses.map((d, idx) => (
                  <div key={d.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{d.diagnosis_name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${d.diagnosis_type === 'primary' ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-600'}`}>
                        {d.diagnosis_type}
                      </span>
                    </div>
                    {d.diagnosis_code && (
                      <span className="font-mono text-[11px] font-bold text-teal-700 block">
                        ICD-10: {d.diagnosis_code}
                      </span>
                    )}
                    {d.notes && <p className="text-[11px] text-slate-600 italic">{d.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vitals History Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-600" />
                Vitals Readings ({encounter.vitals.length})
              </h2>
            </div>

            {encounter.vitals.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No vital signs captured.</p>
            ) : (
              <div className="space-y-3">
                {encounter.vitals.map((v, idx) => (
                  <div key={v.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span>{new Date(v.recorded_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>By: {v.recorded_by_name || 'Staff'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {v.temperature_f && (
                        <div className="bg-white p-1.5 rounded border border-slate-200">
                          <span className="text-[10px] text-slate-400 block">Temp</span>
                          <span className="font-bold text-slate-800">{v.temperature_f}°F</span>
                        </div>
                      )}
                      {(v.blood_pressure_systolic || v.blood_pressure_diastolic) && (
                        <div className="bg-white p-1.5 rounded border border-slate-200">
                          <span className="text-[10px] text-slate-400 block">BP</span>
                          <span className="font-bold text-slate-800">{v.blood_pressure_systolic}/{v.blood_pressure_diastolic}</span>
                        </div>
                      )}
                      {v.heart_rate && (
                        <div className="bg-white p-1.5 rounded border border-slate-200">
                          <span className="text-[10px] text-slate-400 block">Pulse</span>
                          <span className="font-bold text-slate-800">{v.heart_rate} bpm</span>
                        </div>
                      )}
                      {v.oxygen_saturation && (
                        <div className="bg-white p-1.5 rounded border border-slate-200">
                          <span className="text-[10px] text-slate-400 block">SpO2</span>
                          <span className="font-bold text-slate-800">{v.oxygen_saturation}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Vitals Modal */}
      {isVitalsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-600" />
              Record Vital Signs
            </h3>
            <form onSubmit={handleSaveVitals} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Temp (°F)</label>
                  <input type="number" step="0.1" value={vitalsTemp} onChange={(e) => setVitalsTemp(e.target.value)} placeholder="98.6" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Heart Rate (bpm)</label>
                  <input type="number" value={vitalsHR} onChange={(e) => setVitalsHR(e.target.value)} placeholder="72" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">BP Systolic</label>
                  <input type="number" value={vitalsSys} onChange={(e) => setVitalsSys(e.target.value)} placeholder="120" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">BP Diastolic</label>
                  <input type="number" value={vitalsDia} onChange={(e) => setVitalsDia(e.target.value)} placeholder="80" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">SpO2 (%)</label>
                <input type="number" step="0.1" value={vitalsO2} onChange={(e) => setVitalsO2(e.target.value)} placeholder="98.0" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Notes / Observation</label>
                <input type="text" value={vitalsNotes} onChange={(e) => setVitalsNotes(e.target.value)} placeholder="e.g. Patient rested 5 mins prior" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setIsVitalsOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={savingVitals} className="px-4 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold">
                  {savingVitals ? 'Saving...' : 'Save Vitals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Diagnosis Modal */}
      {isDiagOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-700" />
              Add Diagnosis
            </h3>
            <form onSubmit={handleSaveDiagnosis} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Diagnosis Name *</label>
                <input type="text" value={diagName} onChange={(e) => setDiagName(e.target.value)} required placeholder="e.g. Hypertension" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">ICD-10 Code</label>
                <input type="text" value={diagCode} onChange={(e) => setDiagCode(e.target.value)} placeholder="e.g. I10" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Type</label>
                <select value={diagType} onChange={(e) => setDiagType(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs">
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Clinical Notes</label>
                <input type="text" value={diagNotes} onChange={(e) => setDiagNotes(e.target.value)} placeholder="Clinical rationale..." className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setIsDiagOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={savingDiag} className="px-4 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold">
                  {savingDiag ? 'Saving...' : 'Add Diagnosis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescribe Medication Modal */}
      {isPrescriptionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-amber-600" />
              Prescribe Medication
            </h3>
            <form onSubmit={handleSavePrescription} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Medicine *</label>
                <select value={prescMedId} onChange={(e) => setPrescMedId(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" required>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.strength || m.form}) — Stock: {m.total_stock}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Dosage</label>
                  <input type="text" value={prescDosage} onChange={(e) => setPrescDosage(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Frequency</label>
                  <input type="text" value={prescFreq} onChange={(e) => setPrescFreq(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Duration</label>
                  <input type="text" value={prescDuration} onChange={(e) => setPrescDuration(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Total Quantity</label>
                  <input type="number" value={prescQty} onChange={(e) => setPrescQty(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" min={1} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Instructions</label>
                <input type="text" value={prescInstructions} onChange={(e) => setPrescInstructions(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setIsPrescriptionOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={savingPresc} className="px-4 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold">
                  {savingPresc ? 'Sending...' : 'Send to Pharmacy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
