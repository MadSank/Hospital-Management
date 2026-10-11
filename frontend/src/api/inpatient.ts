import { apiClient } from './client'
import type { Admission, Bed, Ward } from '../types/inpatient'

export const getWards = async (): Promise<Ward[]> => {
  const res = await apiClient.get<Ward[]>('/wards')
  return res.data
}

export const getWard = async (id: number | string): Promise<Ward> => {
  const res = await apiClient.get<Ward>(`/wards/${id}`)
  return res.data
}

export const createWard = async (payload: {
  name: string
  ward_type: string
  floor?: string
  capacity: number
}): Promise<Ward> => {
  const res = await apiClient.post<Ward>('/wards', payload)
  return res.data
}

export const addBed = async (
  wardId: number | string,
  payload: {
    bed_number: string
    bed_type: string
    daily_rate: number
  }
): Promise<Bed> => {
  const res = await apiClient.post<Bed>(`/wards/${wardId}/beds`, payload)
  return res.data
}

export const updateBedStatus = async (
  bedId: number | string,
  status: string
): Promise<Bed> => {
  const res = await apiClient.patch<Bed>(`/wards/beds/${bedId}/status`, { status })
  return res.data
}

export const getAdmissions = async (params: {
  patient_id?: number
  status?: string
  ward_id?: number
} = {}): Promise<Admission[]> => {
  const res = await apiClient.get<Admission[]>('/admissions', { params })
  return res.data
}

export const getAdmission = async (id: number | string): Promise<Admission> => {
  const res = await apiClient.get<Admission>(`/admissions/${id}`)
  return res.data
}

export const admitPatient = async (payload: {
  patient_id: number
  bed_id: number
  admitting_doctor_id?: number
  admission_date?: string
  reason: string
}): Promise<Admission> => {
  const res = await apiClient.post<Admission>('/admissions', payload)
  return res.data
}

export const transferPatient = async (
  admissionId: number | string,
  payload: {
    new_bed_id: number
    reason: string
  }
): Promise<Admission> => {
  const res = await apiClient.post<Admission>(`/admissions/${admissionId}/transfer`, payload)
  return res.data
}

export const dischargePatient = async (
  admissionId: number | string,
  payload: {
    discharge_summary?: string
    discharge_notes?: string
  }
): Promise<Admission> => {
  const res = await apiClient.post<Admission>(`/admissions/${admissionId}/discharge`, payload)
  return res.data
}
