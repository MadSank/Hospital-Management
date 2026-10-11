import React, { useEffect, useState } from 'react'
import { AlertCircle, FileText, Loader2, Plus, Trash2, X } from 'lucide-react'
import { createInvoice } from '../../api/billing'
import { getPatients } from '../../api/patients'
import type { CreateInvoiceItemPayload, Invoice } from '../../types/billing'
import type { Patient } from '../../types/patient'

interface CreateInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (invoice: Invoice) => void
  preselectedPatientId?: number
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedPatientId,
}) => {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(false)

  const [patientId, setPatientId] = useState<number | string>(preselectedPatientId || '')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [taxAmount, setTaxAmount] = useState('0')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [autoIssue, setAutoIssue] = useState(true)

  const [items, setItems] = useState<CreateInvoiceItemPayload[]>([
    {
      item_type: 'consultation',
      description: 'General Clinical Consultation',
      quantity: 1,
      unit_price: 50.0,
    },
  ])

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const fetchPatientsList = async () => {
      setLoadingPatients(true)
      try {
        const res = await getPatients({ per_page: 100, is_active: true })
        setPatients(res.items)
        if (res.items.length > 0 && !patientId) {
          setPatientId(res.items[0].id)
        }
      } catch (err) {
        console.error('Failed to load patients for invoice modal', err)
      } finally {
        setLoadingPatients(false)
      }
    }
    fetchPatientsList()
  }, [isOpen])

  if (!isOpen) return null

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        item_type: 'other',
        description: '',
        quantity: 1,
        unit_price: 0,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: keyof CreateInvoiceItemPayload, value: any) => {
    setItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Calculate live financial totals
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
  const discount = parseFloat(discountAmount) || 0
  const tax = parseFloat(taxAmount) || 0
  const total = Math.max(0, subtotal - discount + tax)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId) {
      setErrorMsg('Please select a patient.')
      return
    }

    if (items.length === 0) {
      setErrorMsg('Invoice must contain at least one line item.')
      return
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].description.trim()) {
        setErrorMsg(`Item #${i + 1} requires a valid description.`)
        return
      }
      if (items[i].quantity <= 0) {
        setErrorMsg(`Item #${i + 1} quantity must be 1 or greater.`)
        return
      }
    }

    setSubmitting(true)
    setErrorMsg(null)

    try {
      const created = await createInvoice({
        patient_id: Number(patientId),
        discount_amount: discount,
        tax_amount: tax,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          ...it,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
        })),
        auto_issue: autoIssue,
      })
      onSuccess(created)
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.detail || 'Failed to generate invoice'
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create New Invoice</h2>
              <span className="text-xs text-slate-500">Itemized billing & hospital charges</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Patient Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient *</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                disabled={loadingPatients}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Line Items *</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <div className="p-2 space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 shadow-xs">
                    <select
                      value={item.item_type}
                      onChange={(e) => handleItemChange(idx, 'item_type', e.target.value)}
                      className="w-full sm:w-32 px-2 py-1.5 bg-slate-50 border rounded-md text-xs text-slate-700"
                    >
                      <option value="consultation">Consultation</option>
                      <option value="medicine">Medicine</option>
                      <option value="bed_charge">Bed Stay</option>
                      <option value="lab_test">Lab Test</option>
                      <option value="procedure">Procedure</option>
                      <option value="other">Other</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Item Description"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="flex-1 w-full px-2 py-1.5 bg-slate-50 border rounded-md text-xs text-slate-900"
                      required
                    />

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-14 px-2 py-1.5 bg-slate-50 border rounded-md text-xs text-center"
                          required
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500">Price:</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1.5 bg-slate-50 border rounded-md text-xs text-right"
                          required
                        />
                      </div>

                      <div className="text-xs font-bold text-slate-700 w-16 text-right">
                        ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Discounts, Taxes & Financial Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Instructions</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, cashier remarks..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoIssue"
                  checked={autoIssue}
                  onChange={(e) => setAutoIssue(e.target.checked)}
                  className="rounded text-teal-700 focus:ring-teal-600"
                />
                <label htmlFor="autoIssue" className="text-xs text-slate-700 font-medium">
                  Auto-Issue Invoice immediately (allows instant payment)
                </label>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>Discount ($):</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-20 px-2 py-1 bg-white border rounded text-xs text-right font-medium"
                />
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>Tax ($):</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  className="w-20 px-2 py-1 bg-white border rounded text-xs text-right font-medium"
                />
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold">
                <span className="text-slate-800">Total Invoice Amount:</span>
                <span className="text-teal-700 text-base">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-md shadow-teal-900/10 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Invoice...</span>
                </>
              ) : (
                <span>Generate Invoice</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
