export interface InvoiceItem {
  id: number
  invoice_id: number
  item_type: 'consultation' | 'lab_test' | 'medicine' | 'bed_charge' | 'procedure' | 'other' | string
  description: string
  reference_type?: string | null
  reference_id?: number | null
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface Payment {
  id: number
  payment_uid: string
  invoice_id: number
  amount: number
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'insurance' | 'other' | string
  payment_date: string
  reference_number?: string | null
  received_by?: number | null
  notes?: string | null
  status: 'completed' | 'cancelled' | string
  created_at: string
}

export interface Invoice {
  id: number
  invoice_uid: string
  patient_id: number
  patient_name?: string | null
  patient_mrn?: string | null
  appointment_id?: number | null
  encounter_id?: number | null
  prescription_id?: number | null
  admission_id?: number | null
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  balance_due: number
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled' | string
  notes?: string | null
  issued_date?: string | null
  due_date?: string | null
  created_by?: number | null
  created_at: string
  updated_at: string
  items: InvoiceItem[]
  payments: Payment[]
}

export interface CreateInvoiceItemPayload {
  item_type: string
  description: string
  quantity: number
  unit_price: number
  reference_type?: string
  reference_id?: number
}

export interface CreateInvoicePayload {
  patient_id: number
  appointment_id?: number
  encounter_id?: number
  prescription_id?: number
  admission_id?: number
  discount_amount?: number
  tax_amount?: number
  due_date?: string
  notes?: string
  items: CreateInvoiceItemPayload[]
  auto_issue?: boolean
}

export interface CreatePaymentPayload {
  amount: number
  payment_method: string
  reference_number?: string
  notes?: string
}
