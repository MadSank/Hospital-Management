import { apiClient } from './client'
import type {
  Medicine,
  MedicineBatch,
  Prescription,
  StockAlerts,
  StockMovement,
} from '../types/pharmacy'

export interface MedicineListParams {
  search?: string
  category?: string
  form?: string
  is_active?: boolean
  low_stock?: boolean
}

export const getMedicines = async (
  params: MedicineListParams = {}
): Promise<Medicine[]> => {
  const res = await apiClient.get<Medicine[]>('/pharmacy/medicines', { params })
  return res.data
}

export const createMedicine = async (payload: {
  name: string
  generic_name?: string
  category?: string
  form: string
  strength?: string
  manufacturer?: string
  unit_price: number
  reorder_level: number
}): Promise<Medicine> => {
  const res = await apiClient.post<Medicine>('/pharmacy/medicines', payload)
  return res.data
}

export const addMedicineBatch = async (
  medicineId: number,
  payload: {
    batch_number: string
    quantity_received: number
    expiry_date: string
    received_date?: string
    supplier?: string
    cost_per_unit?: number
  }
): Promise<MedicineBatch> => {
  const res = await apiClient.post<MedicineBatch>(
    `/pharmacy/medicines/${medicineId}/batches`,
    payload
  )
  return res.data
}

export const getStockAlerts = async (): Promise<StockAlerts> => {
  const res = await apiClient.get<StockAlerts>('/pharmacy/stock-alerts')
  return res.data
}

export const getStockMovements = async (params: {
  medicine_id?: number
  movement_type?: string
  limit?: number
} = {}): Promise<StockMovement[]> => {
  const res = await apiClient.get<StockMovement[]>('/pharmacy/stock-movements', { params })
  return res.data
}

export const dispensePrescription = async (payload: {
  prescription_id: number
  items: Array<{
    prescription_item_id: number
    quantity: number
    batch_id?: number
  }>
}): Promise<Prescription> => {
  const res = await apiClient.post<Prescription>('/pharmacy/dispense', payload)
  return res.data
}

export const getPrescriptions = async (params: {
  patient_id?: number
  status?: string
} = {}): Promise<Prescription[]> => {
  const res = await apiClient.get<Prescription[]>('/prescriptions', { params })
  return res.data
}

export const getPrescription = async (id: number | string): Promise<Prescription> => {
  const res = await apiClient.get<Prescription>(`/prescriptions/${id}`)
  return res.data
}

export const createPrescription = async (payload: {
  encounter_id: number
  patient_id: number
  doctor_id?: number
  notes?: string
  items: Array<{
    medicine_id: number
    dosage: string
    frequency: string
    route?: string
    duration: string
    quantity: number
    instructions?: string
  }>
}): Promise<Prescription> => {
  const res = await apiClient.post<Prescription>('/prescriptions', payload)
  return res.data
}
