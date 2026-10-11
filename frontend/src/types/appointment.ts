export type AppointmentStatus =
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type AppointmentType = 'consultation' | 'follow_up' | 'emergency'

export interface PatientBrief {
  id: number
  patient_uid: string
  first_name: string
  last_name: string
  gender: string
  date_of_birth: string
  phone: string
  blood_group?: string | null
  allergies?: string | null
}

export interface DoctorBrief {
  id: number
  staff_uid: string
  first_name: string
  last_name: string
  specialty?: string | null
  qualification?: string | null
  phone: string
  department_name?: string | null
}

export interface AppointmentSummary {
  id: number
  appointment_uid: string
  patient_id: number
  patient_name: string
  patient_uid: string
  doctor_id: number
  doctor_name: string
  doctor_specialty?: string | null
  scheduled_date: string
  scheduled_time: string
  end_time: string
  status: AppointmentStatus
  type: AppointmentType
  reason?: string | null
  created_at: string
}

export interface AppointmentDetail {
  id: number
  appointment_uid: string
  patient_id: number
  doctor_id: number
  scheduled_date: string
  scheduled_time: string
  end_time: string
  status: AppointmentStatus
  type: AppointmentType
  reason?: string | null
  cancellation_reason?: string | null
  notes?: string | null
  patient: PatientBrief
  doctor: DoctorBrief
  created_at: string
  updated_at: string
}

export interface PaginatedAppointments {
  items: AppointmentSummary[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface AppointmentCreatePayload {
  patient_id: number
  doctor_id: number
  scheduled_date: string
  scheduled_time: string
  end_time?: string
  type?: string
  reason?: string
  notes?: string
}

export interface AppointmentReschedulePayload {
  scheduled_date: string
  scheduled_time: string
  end_time?: string
  doctor_id?: number
  reason?: string
}

export interface AppointmentStatusUpdatePayload {
  status: string
  cancellation_reason?: string
}

export interface Department {
  id: number
  name: string
  description?: string | null
  is_active: boolean
}

export interface DoctorSummary {
  id: number
  user_id: number
  staff_uid: string
  full_name: string
  first_name: string
  last_name: string
  specialty?: string | null
  qualification?: string | null
  phone: string
  department_id?: number | null
  department_name?: string | null
}

export interface TimeSlot {
  start_time: string
  end_time: string
  available: boolean
}

export interface DoctorAvailableSlotsResponse {
  doctor_id: number
  doctor_name: string
  date: string
  slots: TimeSlot[]
}
