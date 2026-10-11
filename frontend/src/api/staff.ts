import { apiClient } from './client'
import type {
  Department,
  DoctorAvailableSlotsResponse,
  DoctorSummary,
} from '../types/appointment'

export const getDoctors = async (departmentId?: number): Promise<DoctorSummary[]> => {
  const params: any = {}
  if (departmentId) params.department_id = departmentId
  const res = await apiClient.get<DoctorSummary[]>('/staff/doctors', { params })
  return res.data
}

export const getDepartments = async (): Promise<Department[]> => {
  const res = await apiClient.get<Department[]>('/staff/departments')
  return res.data
}

export const getDoctorAvailableSlots = async (
  doctorId: number,
  date: string
): Promise<DoctorAvailableSlotsResponse> => {
  const res = await apiClient.get<DoctorAvailableSlotsResponse>(
    `/staff/doctors/${doctorId}/available-slots`,
    { params: { date } }
  )
  return res.data
}
