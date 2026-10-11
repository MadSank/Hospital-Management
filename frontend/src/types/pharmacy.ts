export interface MedicineBatch {
  id: number
  medicine_id: number
  batch_number: string
  quantity_received: number
  quantity_remaining: number
  expiry_date: string
  received_date: string
  supplier?: string
  cost_per_unit?: number
  created_at: string
}

export interface Medicine {
  id: number
  medicine_uid: string
  name: string
  generic_name?: string
  category?: string
  form: string
  strength?: string
  manufacturer?: string
  unit_price: number
  reorder_level: number
  is_active: boolean
  total_stock: number
  created_at: string
  updated_at: string
  batches?: MedicineBatch[]
}

export interface PrescriptionItem {
  id: number
  prescription_id: number
  medicine_id: number
  medicine_name: string
  medicine_uid: string
  dosage: string
  frequency: string
  route: string
  duration: string
  quantity: number
  instructions?: string
  is_dispensed: boolean
  dispensed_quantity: number
  created_at: string
}

export interface Prescription {
  id: number
  prescription_uid: string
  encounter_id: number
  patient_id: number
  patient_name: string
  patient_uid: string
  doctor_id: number
  doctor_name: string
  status: 'pending' | 'dispensed' | 'partially_dispensed' | 'cancelled' | string
  notes?: string
  prescribed_date: string
  created_at: string
  updated_at: string
  items: PrescriptionItem[]
}

export interface StockAlertItem {
  medicine_id: number
  medicine_name: string
  medicine_uid: string
  current_stock: number
  reorder_level: number
  status: 'out_of_stock' | 'low_stock' | string
}

export interface ExpiringBatchItem {
  batch_id: number
  batch_number: string
  medicine_id: number
  medicine_name: string
  expiry_date: string
  days_until_expiry: number
  quantity_remaining: number
}

export interface StockAlerts {
  low_stock: StockAlertItem[]
  expiring_soon: ExpiringBatchItem[]
}

export interface StockMovement {
  id: number
  medicine_id: number
  medicine_name?: string
  batch_id?: number
  batch_number?: string
  movement_type: string
  quantity: number
  reference_type?: string
  reference_id?: number
  performed_by?: number
  performed_by_name?: string
  notes?: string
  created_at: string
}
