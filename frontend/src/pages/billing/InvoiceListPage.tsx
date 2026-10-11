import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Filter,
  Loader2,
  Plus,
  Receipt,
  Search,
  XCircle,
} from 'lucide-react'
import { getInvoices, issueInvoice } from '../../api/billing'
import { useAuth } from '../../contexts/AuthContext'
import type { Invoice, Payment } from '../../types/billing'
import { CreateInvoiceModal } from './CreateInvoiceModal'
import { RecordPaymentModal } from './RecordPaymentModal'

export const InvoiceListPage: React.FC = () => {
  const { user } = useAuth()
  const isStaff = user?.role === 'admin' || user?.role === 'receptionist'

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const fetchInvoicesList = async () => {
    setLoading(true)
    try {
      const data = await getInvoices({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
        limit: 100,
      })
      setInvoices(data)
    } catch (err) {
      console.error('Failed to load invoices', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoicesList()
  }, [statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchInvoicesList()
  }

  const handleIssue = async (invoiceId: number) => {
    try {
      await issueInvoice(invoiceId)
      setActionSuccess('Invoice issued successfully! Payments can now be recorded.')
      setTimeout(() => setActionSuccess(null), 3000)
      fetchInvoicesList()
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || 'Failed to issue invoice')
    }
  }

  const handlePaymentSuccess = (payment: Payment) => {
    setActionSuccess(`Payment ${payment.payment_uid} of $${payment.amount.toFixed(2)} recorded successfully!`)
    setTimeout(() => setActionSuccess(null), 3500)
    fetchInvoicesList()
  }

  // Calculate high level KPI totals
  const totalInvoiced = invoices
    .filter((inv) => inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + inv.total_amount, 0)

  const totalPaid = invoices
    .filter((inv) => inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + inv.paid_amount, 0)

  const totalBalance = Math.max(0, totalInvoiced - totalPaid)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        )
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3" /> Partial
          </span>
        )
      case 'issued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" /> Issued
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            <Clock className="w-3 h-3" /> Draft
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-teal-700" />
            <span>Billing & Invoices</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Itemized consultation charges, prescription bills, inpatient stays, and payment processing
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-md shadow-teal-900/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        )}
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700">&times;</button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" /> Total Invoiced
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ${totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Payments Received
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-amber-500" /> Outstanding Balance
          </span>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-teal-600" /> Total Invoices
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{invoices.length}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search invoice #, patient name, MRN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600 transition-all"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {(['all', 'draft', 'issued', 'partially_paid', 'paid', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-teal-700 text-white font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No invoices found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are no billing records matching the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">
                      <Link to={`/billing/${inv.id}`} className="hover:underline">
                        {inv.invoice_uid}
                      </Link>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inv.patient_name || 'Patient'}</div>
                      <div className="text-[11px] font-mono text-slate-400">{inv.patient_mrn || 'N/A'}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-center font-mono">
                      {inv.items ? inv.items.length : 0}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold">
                      ${inv.total_amount.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-emerald-600 font-medium">
                      ${inv.paid_amount.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span className={inv.balance_due > 0 ? 'text-amber-600' : 'text-slate-500'}>
                        ${inv.balance_due.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">{getStatusBadge(inv.status)}</td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isStaff && inv.status === 'draft' && (
                          <button
                            onClick={() => handleIssue(inv.id)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100"
                          >
                            Issue
                          </button>
                        )}

                        {isStaff && inv.status !== 'draft' && inv.status !== 'cancelled' && inv.balance_due > 0 && (
                          <button
                            onClick={() => setPaymentInvoice(inv)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1"
                          >
                            <DollarSign className="w-3 h-3" />
                            Pay
                          </button>
                        )}

                        <Link
                          to={`/billing/${inv.id}`}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded"
                          title="View Details"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(created) => {
          setActionSuccess(`Invoice ${created.invoice_uid} created successfully!`)
          setTimeout(() => setActionSuccess(null), 3000)
          fetchInvoicesList()
        }}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={!!paymentInvoice}
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}
