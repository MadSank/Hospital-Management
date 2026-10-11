import { apiClient } from './client'
import type {
  Diagnosis,
  EncounterCreatePayload,
  EncounterDetail,
  EncounterSummary,
  Vitals,
} from '../types/encounter'

export interface EncounterListParams {
  patient_id?: number
  doctor_id?: number
  status?: string
}

export const getEncounters = async (
  params: EncounterListParams = {}
): Promise<EncounterSummary[]> => {
  const res = await apiClient.get<EncounterSummary[]>('/encounters', { params })
  return res.data
}

export const getEncounter = async (id: number | string): Promise<EncounterDetail> => {
  const res = await apiClient.get<EncounterDetail>(`/encounters/${id}`)
  return res.data
}

export const createEncounter = async (
  payload: EncounterCreatePayload
): Promise<EncounterDetail> => {
  const res = await apiClient.post<EncounterDetail>('/encounters', payload)
  return res.data
}

export const updateEncounter = async (
  id: number | string,
  payload: Partial<EncounterCreatePayload> & { status?: string }
): Promise<EncounterDetail> => {
  const res = await apiClient.put<EncounterDetail>(`/encounters/${id}`, payload)
  return res.data
}

export const completeEncounter = async (
  id: number | string
): Promise<EncounterDetail> => {
  const res = await apiClient.patch<EncounterDetail>(`/encounters/${id}/complete`)
  return res.data
}

export const addEncounterVitals = async (
  encounterId: number | string,
  vitals: Partial<Vitals>
): Promise<Vitals> => {
  const res = await apiClient.post<Vitals>(`/encounters/${encounterId}/vitals`, vitals)
  return res.data
}

export const addEncounterDiagnosis = async (
  encounterId: number | string,
  diagnosis: { diagnosis_name: string; diagnosis_code?: string; diagnosis_type?: string; notes?: string }
): Promise<Diagnosis> => {
  const res = await apiClient.post<Diagnosis>(`/encounters/${encounterId}/diagnoses`, diagnosis)
  return res.data
}
