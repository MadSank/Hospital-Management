export type UserRole =
  | 'admin'
  | 'doctor'
  | 'receptionist'
  | 'nurse'
  | 'pharmacist'
  | 'lab_technician'
  | 'patient'

export interface UserSummary {
  id: number
  email: string
  role: UserRole
  role_display: string
  full_name: string
  is_active: boolean
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: UserSummary
}

export interface CurrentUserResponse {
  id: number
  email: string
  role: UserRole
  role_display: string
  full_name: string
  is_active: boolean
  profile_id?: number | null
  staff_id?: number | null
  patient_id?: number | null
}

export interface ApiErrorDetail {
  code: string
  message: string
  field?: string
  context?: Record<string, unknown>
}
