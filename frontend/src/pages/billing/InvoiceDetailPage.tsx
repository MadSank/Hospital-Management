import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Loader2,
  Printer,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { cancelInvoice, getInvoice, issueInvoice } from '../../api/billing'
import { useAuth } from '../../contexts/AuthContext'
import type { Invoice, Payment } from '../../types/billing'
import { RecordPaymentModal } from './RecordPaymentModal'

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const invoiceId = Number(id)
  const { user } = useAuth()
  const isStaff = user?.role === 'admin' || user?.role === 'receptionist'

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)

  const fetchInvoiceDetail = async () => {
    if (!invoiceId) return
    setLoading(true)
    try {
      const data = await getInvoice(invoiceId)
      setInvoice(data)
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail?.message || err.response?.data?.detail || 'Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoiceDetail()
  }, [invoiceId])

  const handleIssue = async () => {
    if (!invoice) return
    try {
      const updated = await issueInvoice(invoice.id)
      setInvoice(updated)
      setActionSuccess('Invoice issued successfully! Payments can now be recorded.')
      setTimeout(() => setActionSuccess(null), 3500)
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || 'Failed to issue invoice')
    }
  }

  const handleCancel = async () => {
    if (!invoice || !confirm('Are you sure you want to cancel this invoice?')) return
    try {
      const updated = await cancelInvoice(invoice.id)
      setInvoice(updated)
      setActionSuccess('Invoice marked as cancelled.')
      setTimeout(() => setActionSuccess(null), 3500)
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || 'Failed to cancel invoice')
    }
  }

  const handlePaymentSuccess = (payment: Payment) => {
    setActionSuccess(`Payment ${payment.payment_uid} of $${payment.amount.toFixed(2)} recorded successfully!`)
    setTimeout(() => setActionSuccess(null), 3500)
    fetchInvoiceDetail()
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    )
  }

  if (errorMsg || !invoice) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-red-900">Unable to load invoice</h2>
        <p className="text-xs text-red-700">{errorMsg || 'Invoice not found or access denied.'}</p>
        <Link
          to="/billing"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </Link>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Paid in Full
          </span>
        )
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> Partially Paid
          </span>
        )
      case 'issued':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Awaiting Payment
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5" /> Draft
          </span>
        )
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Navigation and Action Bar (Hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <Link
          to="/billing"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>

          {isStaff && invoice.status === 'draft' && (
            <button
              onClick={handleIssue}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-md shadow-teal-900/10 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Issue Invoice</span>
            </button>
          )}

          {isStaff && invoice.status !== 'draft' && invoice.status !== 'cancelled' && invoice.balance_due > 0 && (
            <button
              onClick={() => setIsPaymentOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-900/10 transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}

          {isStaff && (invoice.status === 'draft' || (invoice.status === 'issued' && invoice.paid_amount === 0)) && (
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            &times;
          </button>
        </div>
      )}

      {/* Printable Invoice Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10 space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Hospital Brand & Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white font-bold text-base">
                M
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tight">MedFlow HMS</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Apex General Hospital • 100 Hospital Way • Metro Health District
            </p>
            <p className="text-xs text-slate-400">Tel: +1 (800) 555-FLOW • billing@medflow-hms.com</p>
          </div>

          <div className="sm:text-right space-y-1.5">
            <div className="text-2xl font-black tracking-tight text-slate-900 font-mono">
              {invoice.invoice_uid}
            </div>
            <div>{getStatusBadge(invoice.status)}</div>
            <div className="text-xs text-slate-500 pt-1">
              Created: <span className="text-slate-800 font-semibold">{new Date(invoice.created_at).toLocaleDateString()}</span>
            </div>
            {invoice.due_date && (
              <div className="text-xs text-slate-500">
                Due Date: <span className="text-slate-800 font-semibold">{new Date(invoice.due_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Billed To Patient Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/80 p-5 rounded-xl border border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billed To</span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{invoice.patient_name || 'Patient'}</h3>
            <p className="text-xs font-mono text-teal-700 font-medium">MRN: {invoice.patient_mrn || 'N/A'}</p>
          </div>

          <div className="sm:text-right space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Linked Clinical Services</span>
            <div className="text-xs text-slate-700 space-y-0.5">
              {invoice.encounter_id && <div>Clinical Encounter #{invoice.encounter_id}</div>}
              {invoice.prescription_id && <div>Pharmacy Prescription #{invoice.prescription_id}</div>}
              {invoice.admission_id && <div>Inpatient Admission #{invoice.admission_id}</div>}
              {!invoice.encounter_id && !invoice.prescription_id && !invoice.admission_id && (
                <div className="text-slate-400">Outpatient Hospital Service</div>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Line Items Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Itemized Charges</h4>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-center">Qty</th>
                  <th className="py-2.5 px-4 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {invoice.items.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{it.description}</td>
                    <td className="py-3 px-4 capitalize text-slate-600">{it.item_type.replace('_', ' ')}</td>
                    <td className="py-3 px-4 text-center font-mono">{it.quantity}</td>
                    <td className="py-3 px-4 text-right font-mono">${it.unit_price.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">${it.total_price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary Calculation Card */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
          <div className="flex-1 space-y-2">
            {invoice.notes && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                <span className="font-bold text-slate-700 block mb-0.5">Billing Notes:</span>
                {invoice.notes}
              </div>
            )}
            <div className="p-3 rounded-lg bg-teal-50/50 border border-teal-100 text-[11px] text-teal-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Verified server-side calculation with automated balance auditing.</span>
            </div>
          </div>

          <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono text-slate-900">${invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-xs text-emerald-700">
                <span>Discount:</span>
                <span className="font-mono">-${invoice.discount_amount.toFixed(2)}</span>
              </div>
            )}
            {invoice.tax_amount > 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>Taxes:</span>
                <span className="font-mono">+${invoice.tax_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
              <span>Total Amount:</span>
              <span className="font-mono text-teal-800 text-base">${invoice.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-emerald-600">
              <span>Amount Paid:</span>
              <span className="font-mono">${invoice.paid_amount.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold">
              <span className="text-slate-700">Balance Due:</span>
              <span className={`font-mono ${invoice.balance_due > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                ${invoice.balance_due.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment History Table */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-teal-700" />
            Payment History & Receipts
          </h4>

          {invoice.payments.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
              No payments recorded for this invoice yet.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Receipt #</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4">Reference</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {invoice.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 px-4 font-mono font-bold text-teal-800">{p.payment_uid}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(p.payment_date).toLocaleString()}</td>
                      <td className="py-3 px-4 capitalize font-medium">{p.payment_method.replace('_', ' ')}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{p.reference_number || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        ${p.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          p.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentOpen}
        invoice={invoice}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}
