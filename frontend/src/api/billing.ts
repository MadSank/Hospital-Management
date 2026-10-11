import { apiClient as api } from './client'
import type {
  CreateInvoicePayload,
  CreatePaymentPayload,
  Invoice,
  Payment,
} from '../types/billing'

export interface GetInvoicesParams {
  patient_id?: number
  status?: string
  search?: string
  skip?: number
  limit?: number
}

export const getInvoices = async (params?: GetInvoicesParams): Promise<Invoice[]> => {
  const response = await api.get<Invoice[]>('/billing/invoices', { params })
  return response.data
}

export const getInvoice = async (invoiceId: number): Promise<Invoice> => {
  const response = await api.get<Invoice>(`/billing/invoices/${invoiceId}`)
  return response.data
}

export const createInvoice = async (payload: CreateInvoicePayload): Promise<Invoice> => {
  const response = await api.post<Invoice>('/billing/invoices', payload)
  return response.data
}

export const autoInvoiceEncounter = async (encounterId: number): Promise<Invoice> => {
  const response = await api.post<Invoice>(`/billing/invoices/auto/encounter/${encounterId}`)
  return response.data
}

export const autoInvoicePrescription = async (prescriptionId: number): Promise<Invoice> => {
  const response = await api.post<Invoice>(`/billing/invoices/auto/prescription/${prescriptionId}`)
  return response.data
}

export const autoInvoiceAdmission = async (admissionId: number): Promise<Invoice> => {
  const response = await api.post<Invoice>(`/billing/invoices/auto/admission/${admissionId}`)
  return response.data
}

export const issueInvoice = async (invoiceId: number): Promise<Invoice> => {
  const response = await api.post<Invoice>(`/billing/invoices/${invoiceId}/issue`)
  return response.data
}

export const cancelInvoice = async (invoiceId: number): Promise<Invoice> => {
  const response = await api.post<Invoice>(`/billing/invoices/${invoiceId}/cancel`)
  return response.data
}

export const recordPayment = async (
  invoiceId: number,
  payload: CreatePaymentPayload
): Promise<Payment> => {
  const response = await api.post<Payment>(`/billing/invoices/${invoiceId}/payments`, payload)
  return response.data
}

export const cancelPayment = async (paymentId: number): Promise<Payment> => {
  const response = await api.post<Payment>(`/billing/payments/${paymentId}/cancel`)
  return response.data
}
