import React, { useState } from 'react'
import { AlertCircle, CheckCircle2, DollarSign, Loader2, ShieldCheck, X } from 'lucide-react'
import { recordPayment } from '../../api/billing'
import type { Invoice, Payment } from '../../types/billing'

interface RecordPaymentModalProps {
  isOpen: boolean
  invoice: Invoice | null
  onClose: () => void
  onSuccess: (payment: Payment) => void
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>(invoice ? String(invoice.balance_due) : '0')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Reset default amount when invoice changes
  React.useEffect(() => {
    if (invoice) {
      setAmount(String(invoice.balance_due))
      setErrorMsg(null)
    }
  }, [invoice])

  if (!isOpen || !invoice) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payNum = parseFloat(amount)
    if (isNaN(payNum) || payNum <= 0) {
      setErrorMsg('Payment amount must be greater than $0.00')
      return
    }
    if (payNum > invoice.balance_due + 0.001) {
      setErrorMsg(`Payment amount cannot exceed outstanding balance of $${invoice.balance_due.toFixed(2)}`)
      return
    }

    setSubmitting(true)
    setErrorMsg(null)

    try {
      const createdPayment = await recordPayment(invoice.id, {
        amount: payNum,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onSuccess(createdPayment)
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.detail || 'Failed to record payment'
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Payment</h2>
              <span className="text-xs text-slate-500 font-mono">{invoice.invoice_uid}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Invoice Summary Box */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Patient:</span>
              <span className="font-semibold text-slate-900">{invoice.patient_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Total Invoice Amount:</span>
              <span className="font-semibold text-slate-900">${invoice.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Already Paid:</span>
              <span className="font-medium text-emerald-600">${invoice.paid_amount.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-bold">
              <span className="text-slate-700">Outstanding Balance:</span>
              <span className="text-amber-600 text-sm">${invoice.balance_due.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount ($) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={invoice.balance_due}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600 font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600"
            >
              <option value="cash">Cash (Physical Currency)</option>
              <option value="card">Credit / Debit Card (Simulated POS)</option>
              <option value="bank_transfer">Direct Bank Transfer</option>
              <option value="insurance">Health Insurance Claim</option>
              <option value="other">Other / Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference / Transaction # <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. REC-98412 or AUTH-290"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Notes <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Received at cashier counter..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Simulation disclaimer */}
          <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-[11px] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Simulated Payment: Secure transaction ledger recorded without charging actual banking rails.</span>
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
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
