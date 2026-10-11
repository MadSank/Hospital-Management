import React, { useEffect, useState } from 'react'
import {
  ArrowRightLeft,
  Bed as BedIcon,
  CheckCircle2,
  Loader2,
  LogOut,
  Plus,
  UserPlus,
  X,
} from 'lucide-react'
import {
  addBed,
  admitPatient,
  createWard,
  dischargePatient,
  getAdmissions,
  getWard,
  getWards,
  transferPatient,
} from '../../api/inpatient'
import { getPatients } from '../../api/patients'
import { getDoctors } from '../../api/staff'
import { useAuth } from '../../contexts/AuthContext'
import type { DoctorSummary } from '../../types/appointment'
import type { Admission, Bed, Ward } from '../../types/inpatient'
import type { Patient } from '../../types/patient'

export const InpatientPage: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isClinicalStaff = user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'nurse'

  const [wards, setWards] = useState<Ward[]>([])
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null)
  const [activeWardDetail, setActiveWardDetail] = useState<Ward | null>(null)
  const [admissions, setAdmissions] = useState<Admission[]>([])
  const [loading, setLoading] = useState(true)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Modals
  const [isAdmitOpen, setIsAdmitOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isDischargeOpen, setIsDischargeOpen] = useState(false)
  const [isAddWardOpen, setIsAddWardOpen] = useState(false)
  const [isAddBedOpen, setIsAddBedOpen] = useState(false)

  // Target Entities for Actions
  const [targetBed, setTargetBed] = useState<Bed | null>(null)
  const [targetAdmission, setTargetAdmission] = useState<Admission | null>(null)

  // Admit Form States
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<DoctorSummary[]>([])
  const [admitPatientId, setAdmitPatientId] = useState<number | string>('')
  const [admitDoctorId, setAdmitDoctorId] = useState<number | string>('')
  const [admitReason, setAdmitReason] = useState('')
  const [submittingAdmit, setSubmittingAdmit] = useState(false)

  // Transfer Form States
  const [transferTargetBedId, setTransferTargetBedId] = useState<number | string>('')
  const [transferReason, setTransferReason] = useState('')
  const [submittingTransfer, setSubmittingTransfer] = useState(false)

  // Discharge Form States
  const [dischargeSummary, setDischargeSummary] = useState('')
  const [dischargeNotes, setDischargeNotes] = useState('')
  const [submittingDischarge, setSubmittingDischarge] = useState(false)

  // Add Ward Form States
  const [newWardName, setNewWardName] = useState('')
  const [newWardType, setNewWardType] = useState('general')
  const [newWardFloor, setNewWardFloor] = useState('Floor 1')
  const [newWardCapacity, setNewWardCapacity] = useState('10')

  // Add Bed Form States
  const [newBedNumber, setNewBedNumber] = useState('')
  const [newBedType, setNewBedType] = useState('standard')
  const [newBedRate, setNewBedRate] = useState('50.0')

  const fetchWardsAndAdmissions = async () => {
    setLoading(true)
    try {
      const [wList, aList] = await Promise.all([
        getWards(),
        getAdmissions({ status: 'admitted' }),
      ])
      setWards(wList)
      setAdmissions(aList)

      const initialWardId = selectedWardId || (wList.length > 0 ? wList[0].id : null)
      setSelectedWardId(initialWardId)

      if (initialWardId) {
        const detail = await getWard(initialWardId)
        setActiveWardDetail(detail)
      }
    } catch (err) {
      console.error('Failed to load inpatient data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWardsAndAdmissions()
  }, [])

  const handleSelectWard = async (wardId: number) => {
    setSelectedWardId(wardId)
    try {
      const detail = await getWard(wardId)
      setActiveWardDetail(detail)
    } catch (err) {
      console.error('Failed to fetch ward detail', err)
    }
  }

  // Open Admit Modal
  const handleOpenAdmit = async (bed?: Bed) => {
    if (bed) setTargetBed(bed)
    try {
      const [pRes, dRes] = await Promise.all([
        getPatients({ is_active: true, per_page: 100 }),
        getDoctors(),
      ])
      setPatients(pRes.items)
      setDoctors(dRes)
      if (dRes.length > 0 && !admitDoctorId) setAdmitDoctorId(dRes[0].id)
      setIsAdmitOpen(true)
    } catch (err) {
      alert('Failed to load patients or doctors')
    }
  }

  const handleSubmitAdmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!admitPatientId || !targetBed) return
    setSubmittingAdmit(true)
    try {
      await admitPatient({
        patient_id: Number(admitPatientId),
        bed_id: targetBed.id,
        admitting_doctor_id: admitDoctorId ? Number(admitDoctorId) : undefined,
        reason: admitReason.trim(),
      })
      setIsAdmitOpen(false)
      setAdmitReason('')
      fetchWardsAndAdmissions()
      setActionSuccess(`Patient admitted to Bed ${targetBed.bed_number} successfully!`)
      setTimeout(() => setActionSuccess(null), 3500)
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || err.response?.data?.detail || 'Admission failed')
    } finally {
      setSubmittingAdmit(false)
    }
  }

  // Open Transfer Modal
  const handleOpenTransfer = (bed: Bed) => {
    setTargetBed(bed)
    const adm = admissions.find((a) => a.bed_id === bed.id && a.status === 'admitted')
    if (!adm) {
      alert('Active admission record not found for this bed.')
      return
    }
    setTargetAdmission(adm)
    setIsTransferOpen(true)
  }

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetAdmission || !transferTargetBedId) return
    setSubmittingTransfer(true)
    try {
      await transferPatient(targetAdmission.id, {
        new_bed_id: Number(transferTargetBedId),
        reason: transferReason.trim() || 'Internal bed transfer',
      })
      setIsTransferOpen(false)
      setTransferReason('')
      fetchWardsAndAdmissions()
      setActionSuccess('Patient transferred to new bed successfully.')
      setTimeout(() => setActionSuccess(null), 3500)
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || err.response?.data?.detail || 'Transfer failed')
    } finally {
      setSubmittingTransfer(false)
    }
  }

  // Open Discharge Modal
  const handleOpenDischarge = (bed: Bed) => {
    setTargetBed(bed)
    const adm = admissions.find((a) => a.bed_id === bed.id && a.status === 'admitted')
    if (!adm) {
      alert('Active admission record not found for this bed.')
      return
    }
    setTargetAdmission(adm)
    setIsDischargeOpen(true)
  }

  const handleSubmitDischarge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetAdmission) return
    setSubmittingDischarge(true)
    try {
      await dischargePatient(targetAdmission.id, {
        discharge_summary: dischargeSummary.trim() || undefined,
        discharge_notes: dischargeNotes.trim() || undefined,
      })
      setIsDischargeOpen(false)
      setDischargeSummary('')
      setDischargeNotes('')
      fetchWardsAndAdmissions()
      setActionSuccess('Patient discharged and bed released to available inventory.')
      setTimeout(() => setActionSuccess(null), 3500)
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || err.response?.data?.detail || 'Discharge failed')
    } finally {
      setSubmittingDischarge(false)
    }
  }

  const handleCreateWard = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createWard({
        name: newWardName.trim(),
        ward_type: newWardType,
        floor: newWardFloor,
        capacity: parseInt(newWardCapacity),
      })
      setIsAddWardOpen(false)
      fetchWardsAndAdmissions()
      setActionSuccess(`Ward '${newWardName}' created successfully.`)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || 'Failed to create ward')
    }
  }

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWardId) return
    try {
      await addBed(selectedWardId, {
        bed_number: newBedNumber.trim(),
        bed_type: newBedType,
        daily_rate: parseFloat(newBedRate),
      })
      setIsAddBedOpen(false)
      setNewBedNumber('')
      handleSelectWard(selectedWardId)
      setActionSuccess(`Bed '${newBedNumber}' added successfully.`)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || 'Failed to add bed')
    }
  }

  // Calculate available beds across wards for transfer picker
  const allAvailableBeds = activeWardDetail?.beds?.filter(
    (b) => b.status === 'available' && b.id !== targetBed?.id
  ) || []

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BedIcon className="w-6 h-6 text-teal-700" />
            <span>Inpatient Care & Bed Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ward allocations, visual bed status matrix, inpatient admissions, bed transfers, and discharges
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsAddWardOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Ward</span>
            </button>
            <button
              onClick={() => setIsAddBedOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-md shadow-teal-900/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Bed</span>
            </button>
          </div>
        )}
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-8 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
      )}

      {/* Ward Cards Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {wards.map((w) => {
          const isSelected = w.id === selectedWardId
          return (
            <div
              key={w.id}
              onClick={() => handleSelectWard(w.id)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-teal-900 text-white border-teal-900 shadow-md shadow-teal-950/20'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base">{w.name}</h3>
                  <span className={`text-[11px] font-semibold uppercase ${isSelected ? 'text-teal-200' : 'text-slate-400'}`}>
                    {w.floor || 'Main Wing'} • {w.ward_type}
                  </span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${isSelected ? 'bg-teal-800 text-teal-100' : 'bg-slate-100 text-slate-700'}`}>
                  {w.capacity} Beds
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100/20 flex items-center justify-between text-xs font-semibold">
                <span className={isSelected ? 'text-teal-200' : 'text-emerald-700'}>
                  {w.available_beds} Available
                </span>
                <span className={isSelected ? 'text-teal-200' : 'text-blue-700'}>
                  {w.occupied_beds} Occupied
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bed Grid for Active Ward */}
      {activeWardDetail && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BedIcon className="w-5 h-5 text-teal-700" />
              <span>{activeWardDetail.name} — Bed Allocation Matrix</span>
            </h2>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Available ({activeWardDetail.available_beds})
              </span>
              <span className="flex items-center gap-1.5 text-blue-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Occupied ({activeWardDetail.occupied_beds})
              </span>
            </div>
          </div>

          {!activeWardDetail.beds || activeWardDetail.beds.length === 0 ? (
            <p className="text-center py-12 text-slate-500 text-xs">No beds configured in this ward.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeWardDetail.beds.map((b) => {
                const isOccupied = b.status === 'occupied'
                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      isOccupied
                        ? 'bg-blue-50/50 border-blue-200 shadow-xs'
                        : 'bg-emerald-50/30 border-emerald-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-base text-slate-900 font-mono">
                          Bed {b.bed_number}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            isOccupied
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1 capitalize">
                        Type: {b.bed_type} • Rate: ${b.daily_rate}/day
                      </div>

                      {isOccupied && b.current_patient_name && (
                        <div className="mt-3 p-2 bg-white rounded-lg border border-blue-100 text-xs space-y-1">
                          <div className="font-bold text-slate-900 truncate">
                            {b.current_patient_name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Admitted Patient
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bed Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-end gap-1.5">
                      {!isOccupied && isClinicalStaff && (
                        <button
                          onClick={() => handleOpenAdmit(b)}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Admit Patient
                        </button>
                      )}

                      {isOccupied && isClinicalStaff && (
                        <>
                          <button
                            onClick={() => handleOpenTransfer(b)}
                            title="Transfer Bed"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            Transfer
                          </button>
                          <button
                            onClick={() => handleOpenDischarge(b)}
                            title="Discharge Patient"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            Discharge
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Admit Patient Modal */}
      {isAdmitOpen && targetBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              Admit Patient to Bed {targetBed.bed_number}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{activeWardDetail?.name}</p>

            <form onSubmit={handleSubmitAdmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Select Patient *</label>
                <select
                  value={admitPatientId}
                  onChange={(e) => setAdmitPatientId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs"
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
                <label className="block text-xs font-semibold text-slate-700">Admitting Doctor *</label>
                <select
                  value={admitDoctorId}
                  onChange={(e) => setAdmitDoctorId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700">Reason for Admission *</label>
                <textarea
                  rows={3}
                  value={admitReason}
                  onChange={(e) => setAdmitReason(e.target.value)}
                  placeholder="Diagnosis, monitoring required, post-surgical care..."
                  className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setIsAdmitOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={submittingAdmit} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">
                  {submittingAdmit ? 'Processing...' : 'Confirm Admission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Bed Modal */}
      {isTransferOpen && targetAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-teal-700" />
              Transfer Patient {targetAdmission.patient_name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Current Bed: {targetAdmission.bed_number} ({targetAdmission.ward_name})</p>

            <form onSubmit={handleSubmitTransfer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Target Bed (Available) *</label>
                <select
                  value={transferTargetBedId}
                  onChange={(e) => setTransferTargetBedId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs"
                  required
                >
                  <option value="">-- Choose Target Bed --</option>
                  {allAvailableBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      Bed {b.bed_number} ({b.bed_type}) — ${b.daily_rate}/day
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Reason for Transfer</label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Higher acuity monitoring, patient request"
                  className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setIsTransferOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={submittingTransfer} className="px-4 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold">
                  {submittingTransfer ? 'Transferring...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discharge Modal */}
      {isDischargeOpen && targetAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <LogOut className="w-5 h-5 text-amber-600" />
              Discharge Patient {targetAdmission.patient_name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Releasing Bed {targetAdmission.bed_number} to inventory</p>

            <form onSubmit={handleSubmitDischarge} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Discharge Summary</label>
                <textarea
                  rows={2}
                  value={dischargeSummary}
                  onChange={(e) => setDischargeSummary(e.target.value)}
                  placeholder="Patient recovered, stable vitals at discharge..."
                  className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Discharge Notes / Follow-up</label>
                <textarea
                  rows={2}
                  value={dischargeNotes}
                  onChange={(e) => setDischargeNotes(e.target.value)}
                  placeholder="Medication instructions, outpatient clinic follow up..."
                  className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setIsDischargeOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={submittingDischarge} className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold">
                  {submittingDischarge ? 'Discharging...' : 'Confirm Discharge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Ward Modal */}
      {isAddWardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Hospital Ward</h3>
            <form onSubmit={handleCreateWard} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Ward Name *</label>
                <input type="text" value={newWardName} onChange={(e) => setNewWardName(e.target.value)} required placeholder="e.g. Maternity Ward" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Ward Type</label>
                  <select value={newWardType} onChange={(e) => setNewWardType(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs">
                    <option value="general">General</option>
                    <option value="icu">ICU</option>
                    <option value="private">Private</option>
                    <option value="pediatric">Pediatric</option>
                    <option value="maternity">Maternity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Floor</label>
                  <input type="text" value={newWardFloor} onChange={(e) => setNewWardFloor(e.target.value)} placeholder="Floor 1" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Capacity</label>
                  <input type="number" value={newWardCapacity} onChange={(e) => setNewWardCapacity(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" min={1} required />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setIsAddWardOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold">Save Ward</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bed Modal */}
      {isAddBedOpen && activeWardDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Bed to {activeWardDetail.name}</h3>
            <form onSubmit={handleAddBed} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Bed Number *</label>
                <input type="text" value={newBedNumber} onChange={(e) => setNewBedNumber(e.target.value)} required placeholder="e.g. A-105" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Bed Type</label>
                  <select value={newBedType} onChange={(e) => setNewBedType(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs">
                    <option value="standard">Standard</option>
                    <option value="electric">Electric</option>
                    <option value="icu">ICU</option>
                    <option value="crib">Crib</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Daily Rate ($)</label>
                  <input type="number" step="0.5" value={newBedRate} onChange={(e) => setNewBedRate(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" min={0} required />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setIsAddBedOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold">Add Bed</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
