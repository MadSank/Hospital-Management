import { apiClient } from './client'
import type {
  AppointmentCreatePayload,
  AppointmentDetail,
  AppointmentReschedulePayload,
  AppointmentStatusUpdatePayload,
  AppointmentSummary,
  PaginatedAppointments,
} from '../types/appointment'

export interface AppointmentListParams {
  date?: string
  date_from?: string
  date_to?: string
  doctor_id?: number
  patient_id?: number
  status?: string
  type?: string
  search?: string
  page?: number
  per_page?: number
}

export const getAppointments = async (
  params: AppointmentListParams = {}
): Promise<PaginatedAppointments> => {
  const res = await apiClient.get<PaginatedAppointments>('/appointments', { params })
  return res.data
}

export const getTodayAppointments = async (): Promise<AppointmentSummary[]> => {
  const res = await apiClient.get<AppointmentSummary[]>('/appointments/today')
  return res.data
}

export const getAppointmentQueue = async (): Promise<AppointmentSummary[]> => {
  const res = await apiClient.get<AppointmentSummary[]>('/appointments/queue')
  return res.data
}

export const getAppointment = async (id: number | string): Promise<AppointmentDetail> => {
  const res = await apiClient.get<AppointmentDetail>(`/appointments/${id}`)
  return res.data
}

export const createAppointment = async (
  payload: AppointmentCreatePayload
): Promise<AppointmentDetail> => {
  const res = await apiClient.post<AppointmentDetail>('/appointments', payload)
  return res.data
}

export const rescheduleAppointment = async (
  id: number | string,
  payload: AppointmentReschedulePayload
): Promise<AppointmentDetail> => {
  const res = await apiClient.put<AppointmentDetail>(`/appointments/${id}`, payload)
  return res.data
}

export const updateAppointmentStatus = async (
  id: number | string,
  payload: AppointmentStatusUpdatePayload
): Promise<AppointmentDetail> => {
  const res = await apiClient.patch<AppointmentDetail>(`/appointments/${id}/status`, payload)
  return res.data
}
