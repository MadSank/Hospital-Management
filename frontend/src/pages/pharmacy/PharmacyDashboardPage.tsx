import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  PackageCheck,
  Pill,
  Plus,
  Search,
  X,
} from 'lucide-react'
import {
  addMedicineBatch,
  createMedicine,
  dispensePrescription,
  getMedicines,
  getPrescriptions,
  getStockAlerts,
  getStockMovements,
} from '../../api/pharmacy'
import { useAuth } from '../../contexts/AuthContext'
import type {
  Medicine,
  Prescription,
  StockAlerts,
  StockMovement,
} from '../../types/pharmacy'

export const PharmacyDashboardPage: React.FC = () => {
  const { user } = useAuth()
  const isPharmacistOrAdmin = user?.role === 'admin' || user?.role === 'pharmacist'

  const [activeTab, setActiveTab] = useState<'medicines' | 'prescriptions' | 'alerts' | 'audit'>('medicines')
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [alerts, setAlerts] = useState<StockAlerts | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Add Medicine Modal
  const [isAddMedOpen, setIsAddMedOpen] = useState(false)
  const [newMedName, setNewMedName] = useState('')
  const [newMedGeneric, setNewMedGeneric] = useState('')
  const [newMedCategory, setNewMedCategory] = useState('Antibiotic')
  const [newMedForm, setNewMedForm] = useState('tablet')
  const [newMedStrength, setNewMedStrength] = useState('500mg')
  const [newMedPrice, setNewMedPrice] = useState('10.0')
  const [newMedReorder, setNewMedReorder] = useState('50')
  const [savingMed, setSavingMed] = useState(false)

  // Add Batch Modal
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false)
  const [selectedMedForBatch, setSelectedMedForBatch] = useState<Medicine | null>(null)
  const [batchNumber, setBatchNumber] = useState('')
  const [batchQty, setBatchQty] = useState('100')
  const [batchExpiry, setBatchExpiry] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().substring(0, 10)
  })
  const [batchSupplier, setBatchSupplier] = useState('Apex Pharma')
  const [savingBatch, setSavingBatch] = useState(false)

  // Dispense Modal
  const [isDispenseOpen, setIsDispenseOpen] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
  const [dispenseQuantities, setDispenseQuantities] = useState<Record<number, number>>({})
  const [savingDispense, setSavingDispense] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [meds, prescs, alrts, mvts] = await Promise.all([
        getMedicines(),
        getPrescriptions(),
        isPharmacistOrAdmin ? getStockAlerts() : Promise.resolve(null),
        isPharmacistOrAdmin ? getStockMovements({ limit: 50 }) : Promise.resolve([]),
      ])
      setMedicines(meds)
      setPrescriptions(prescs)
      if (alrts) setAlerts(alrts)
      setMovements(mvts)
    } catch (err) {
      console.error('Failed to load pharmacy data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMedName) return
    setSavingMed(true)
    try {
      await createMedicine({
        name: newMedName.trim(),
        generic_name: newMedGeneric.trim() || undefined,
        category: newMedCategory.trim() || undefined,
        form: newMedForm,
        strength: newMedStrength.trim() || undefined,
        unit_price: parseFloat(newMedPrice),
        reorder_level: parseInt(newMedReorder),
      })
      setIsAddMedOpen(false)
      loadData()
      setActionSuccess('Medicine registered successfully.')
      setTimeout(() => setActionSuccess(null), 3500)
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || err.response?.data?.detail || 'Failed to add medicine')
    } finally {
      setSavingMed(false)
    }
  }

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMedForBatch || !batchNumber) return
    setSavingBatch(true)
    try {
      await addMedicineBatch(selectedMedForBatch.id, {
        batch_number: batchNumber.trim(),
        quantity_received: parseInt(batchQty),
        expiry_date: batchExpiry,
        supplier: batchSupplier.trim() || undefined,
      })
      setIsAddBatchOpen(false)
      loadData()
      setActionSuccess(`Batch ${batchNumber} added with stock received.`)
      setTimeout(() => setActionSuccess(null), 3500)
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || err.response?.data?.detail || 'Failed to add batch')
    } finally {
      setSavingBatch(false)
    }
  }

  const handleOpenDispenseModal = (p: Prescription) => {
    setSelectedPrescription(p)
    const initialQty: Record<number, number> = {}
    p.items.forEach((it) => {
      initialQty[it.id] = Math.max(0, it.quantity - it.dispensed_quantity)
    })
    setDispenseQuantities(initialQty)
    setIsDispenseOpen(true)
  }

  const handleConfirmDispense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPrescription) return
    setSavingDispense(true)
    try {
      const itemsToDispense = selectedPrescription.items
        .filter((it) => (dispenseQuantities[it.id] || 0) > 0)
        .map((it) => ({
          prescription_item_id: it.id,
          quantity: dispenseQuantities[it.id],
        }))

      if (itemsToDispense.length === 0) {
        alert('Please specify quantity to dispense.')
        setSavingDispense(false)
        return
      }

      await dispensePrescription({
        prescription_id: selectedPrescription.id,
        items: itemsToDispense,
      })

      setIsDispenseOpen(false)
      loadData()
      setActionSuccess(`Prescription ${selectedPrescription.prescription_uid} dispensed and inventory updated!`)
      setTimeout(() => setActionSuccess(null), 3500)
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || err.response?.data?.detail || 'Failed to dispense prescription')
    } finally {
      setSavingDispense(false)
    }
  }

  const filteredMedicines = medicines.filter((m) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      m.name.toLowerCase().includes(term) ||
      (m.generic_name && m.generic_name.toLowerCase().includes(term)) ||
      m.medicine_uid.toLowerCase().includes(term) ||
      (m.category && m.category.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Pill className="w-6 h-6 text-teal-700" />
            <span>Pharmacy & Inventory Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Medicine catalogue, real-time stock levels, batch tracking, prescription dispensing, and audit movements
          </p>
        </div>

        {isPharmacistOrAdmin && (
          <button
            onClick={() => setIsAddMedOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-md shadow-teal-900/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register Medicine</span>
          </button>
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

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Medicines in Catalogue</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{medicines.length}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-700">Low / Out of Stock</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {alerts ? alerts.low_stock.length : 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-red-600">Batches Expiring (90d)</span>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {alerts ? alerts.expiring_soon.length : 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-teal-700">Pending Prescriptions</span>
          <div className="text-2xl font-bold text-teal-800 mt-1">
            {prescriptions.filter((p) => p.status === 'pending').length}
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="border-b border-slate-200 flex gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('medicines')}
          className={`pb-3 px-1 border-b-2 transition-colors ${
            activeTab === 'medicines' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Medicine Catalog & Batches
        </button>

        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'prescriptions' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Prescriptions & Dispensing</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
            {prescriptions.length}
          </span>
        </button>

        {isPharmacistOrAdmin && (
          <>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'alerts' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Stock Alerts & Expiry</span>
              {alerts && alerts.low_stock.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  {alerts.low_stock.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === 'audit' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Stock Audit Logs
            </button>
          </>
        )}
      </div>

      {/* Tab 1: Medicines Catalog */}
      {activeTab === 'medicines' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medicine name, generic, UID..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Total {filteredMedicines.length} items
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">UID / Name</th>
                    <th className="py-3 px-4">Category & Form</th>
                    <th className="py-3 px-4">Strength</th>
                    <th className="py-3 px-4">Unit Price</th>
                    <th className="py-3 px-4">Total Stock</th>
                    <th className="py-3 px-4">Status</th>
                    {isPharmacistOrAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMedicines.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/75">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{m.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{m.medicine_uid} {m.generic_name && `• ${m.generic_name}`}</div>
                      </td>
                      <td className="py-3 px-4 capitalize">
                        <span className="font-semibold text-slate-700">{m.category || 'General'}</span>
                        <span className="text-slate-400 block text-[10px]">{m.form}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{m.strength || '—'}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">${m.unit_price.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-sm text-slate-900">{m.total_stock}</span>
                        <span className="text-[10px] text-slate-400 block">Reorder: {m.reorder_level}</span>
                      </td>
                      <td className="py-3 px-4">
                        {m.total_stock === 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            Out of Stock
                          </span>
                        ) : m.total_stock <= m.reorder_level ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Available
                          </span>
                        )}
                      </td>
                      {isPharmacistOrAdmin && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedMedForBatch(m)
                              setBatchNumber(`BTH-${m.medicine_uid.split('-')[1]}-${new Date().getFullYear()}`)
                              setIsAddBatchOpen(true)
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
                          >
                            <Plus className="w-3 h-3" />
                            Add Batch
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Prescriptions & Dispensing */}
      {activeTab === 'prescriptions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {prescriptions.length === 0 ? (
            <p className="text-center py-12 text-slate-500 text-xs">No prescriptions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Prescription UID</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Prescribing Doctor</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Medications</th>
                    <th className="py-3 px-4">Status</th>
                    {isPharmacistOrAdmin && <th className="py-3 px-4 text-right">Dispensing</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescriptions.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/75">
                      <td className="py-3 px-4 font-mono font-bold text-teal-700">
                        {p.prescription_uid}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {p.patient_name}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {p.doctor_name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(p.prescribed_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {p.items.map((it) => (
                            <div key={it.id} className="text-[11px] text-slate-800">
                              <strong>{it.medicine_name}</strong> — {it.dosage} ({it.frequency}, {it.duration})
                              <span className="text-slate-400 ml-1">
                                [{it.dispensed_quantity}/{it.quantity} dispensed]
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            p.status === 'dispensed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'partially_dispensed'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.status === 'dispensed' ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                          />
                          {p.status}
                        </span>
                      </td>
                      {isPharmacistOrAdmin && (
                        <td className="py-3 px-4 text-right">
                          {p.status !== 'dispensed' && (
                            <button
                              onClick={() => handleOpenDispenseModal(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-xs"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              Dispense
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Alerts & Expiring */}
      {activeTab === 'alerts' && alerts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Low Stock & Out of Stock Alerts
            </h3>
            {alerts.low_stock.length === 0 ? (
              <p className="text-xs text-slate-500">All inventory levels are above reorder threshold.</p>
            ) : (
              <div className="space-y-2">
                {alerts.low_stock.map((al) => (
                  <div key={al.medicine_id} className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-amber-900 text-xs">{al.medicine_name}</div>
                      <div className="text-[10px] text-amber-700 font-mono">UID: {al.medicine_uid} • Reorder Threshold: {al.reorder_level}</div>
                    </div>
                    <span className="font-bold text-sm text-red-600">
                      {al.current_stock} in stock
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-600" />
              Expiring Within 90 Days
            </h3>
            {alerts.expiring_soon.length === 0 ? (
              <p className="text-xs text-slate-500">No batches expiring within the next 90 days.</p>
            ) : (
              <div className="space-y-2">
                {alerts.expiring_soon.map((ex) => (
                  <div key={ex.batch_id} className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-red-900 text-xs">{ex.medicine_name} (Batch: {ex.batch_number})</div>
                      <div className="text-[10px] text-red-700">Expires: {new Date(ex.expiry_date).toLocaleDateString()} ({ex.days_until_expiry} days remaining)</div>
                    </div>
                    <span className="font-bold text-xs text-red-800">
                      {ex.quantity_remaining} units
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date/Time</th>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Quantity Changed</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/75">
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(m.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {m.medicine_name || `#${m.medicine_id}`}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {m.batch_number || '—'}
                    </td>
                    <td className="py-3 px-4 capitalize">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.quantity > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                        {m.movement_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold font-mono">
                      <span className={m.quantity > 0 ? 'text-emerald-700' : 'text-red-600'}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {m.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {isAddMedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-teal-700" />
              Register New Medicine
            </h3>
            <form onSubmit={handleCreateMedicine} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Commercial Name *</label>
                <input type="text" value={newMedName} onChange={(e) => setNewMedName(e.target.value)} required placeholder="e.g. Augmentin" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Generic Name</label>
                <input type="text" value={newMedGeneric} onChange={(e) => setNewMedGeneric(e.target.value)} placeholder="e.g. Amoxicillin / Clavulanate" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Category</label>
                  <input type="text" value={newMedCategory} onChange={(e) => setNewMedCategory(e.target.value)} placeholder="e.g. Antibiotic" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Form</label>
                  <select value={newMedForm} onChange={(e) => setNewMedForm(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs">
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="syrup">Syrup</option>
                    <option value="injection">Injection</option>
                    <option value="cream">Cream</option>
                    <option value="drops">Drops</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Strength</label>
                  <input type="text" value={newMedStrength} onChange={(e) => setNewMedStrength(e.target.value)} placeholder="500mg" className="w-full px-2 py-1.5 bg-slate-50 border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Unit Price ($)</label>
                  <input type="number" step="0.01" value={newMedPrice} onChange={(e) => setNewMedPrice(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border rounded-lg text-xs" min={0} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Reorder Level</label>
                  <input type="number" value={newMedReorder} onChange={(e) => setNewMedReorder(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border rounded-lg text-xs" min={1} required />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setIsAddMedOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={savingMed} className="px-4 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold">
                  {savingMed ? 'Saving...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Batch Modal */}
      {isAddBatchOpen && selectedMedForBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Receive Batch Shipment</h3>
            <p className="text-xs text-slate-500 mb-4">{selectedMedForBatch.name} ({selectedMedForBatch.medicine_uid})</p>
            <form onSubmit={handleAddBatch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Batch Number *</label>
                <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} required placeholder="BTH-2026-001" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Quantity Received *</label>
                  <input type="number" value={batchQty} onChange={(e) => setBatchQty(e.target.value)} min={1} required className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Expiry Date *</label>
                  <input type="date" value={batchExpiry} onChange={(e) => setBatchExpiry(e.target.value)} required className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Supplier</label>
                <input type="text" value={batchSupplier} onChange={(e) => setBatchSupplier(e.target.value)} placeholder="Distributor name" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setIsAddBatchOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={savingBatch} className="px-4 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold">
                  {savingBatch ? 'Saving...' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispense Modal */}
      {isDispenseOpen && selectedPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-teal-700" />
              Dispense Prescription {selectedPrescription.prescription_uid}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Patient: {selectedPrescription.patient_name}</p>
            <form onSubmit={handleConfirmDispense} className="space-y-4">
              <div className="space-y-3">
                {selectedPrescription.items.map((it) => {
                  const rem = it.quantity - it.dispensed_quantity
                  return (
                    <div key={it.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{it.medicine_name}</div>
                        <div className="text-[11px] text-slate-500">{it.dosage} • Need {rem} remaining</div>
                      </div>
                      <div className="w-24">
                        <label className="block text-[10px] text-slate-500">Dispense Qty</label>
                        <input
                          type="number"
                          min={0}
                          max={rem}
                          value={dispenseQuantities[it.id] || 0}
                          onChange={(e) =>
                            setDispenseQuantities({
                              ...dispenseQuantities,
                              [it.id]: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setIsDispenseOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={savingDispense} className="px-4 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold">
                  {savingDispense ? 'Processing...' : 'Confirm Dispensing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
