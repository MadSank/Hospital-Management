import { apiClient } from './client'
import type { PaginatedPatients, Patient, PatientCreatePayload, PatientUpdatePayload } from '../types/patient'

export interface PatientListParams {
  search?: string
  gender?: string
  blood_group?: string
  is_active?: boolean
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: string
}

export const getPatients = async (params: PatientListParams = {}): Promise<PaginatedPatients> => {
  const response = await apiClient.get<PaginatedPatients>('/patients', { params })
  return response.data
}

export const getPatient = async (id: number | string): Promise<Patient> => {
  const response = await apiClient.get<Patient>(`/patients/${id}`)
  return response.data
}

export const createPatient = async (payload: PatientCreatePayload): Promise<Patient> => {
  const response = await apiClient.post<Patient>('/patients', payload)
  return response.data
}

export const updatePatient = async (
  id: number | string,
  payload: PatientUpdatePayload
): Promise<Patient> => {
  const response = await apiClient.put<Patient>(`/patients/${id}`, payload)
  return response.data
}

export const archivePatient = async (id: number | string): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/patients/${id}`)
  return response.data
}
