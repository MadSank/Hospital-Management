export interface EmergencyContact {
  id?: number
  name: string
  relationship: string
  phone: string
}

export interface Patient {
  id: number
  patient_uid: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: 'male' | 'female' | 'other'
  blood_group?: string | null
  phone: string
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  allergies?: string | null
  medical_history?: string | null
  notes?: string | null
  is_active: boolean
  created_at: string
  updated_at?: string
  emergency_contacts?: EmergencyContact[]
}

export interface PatientCreatePayload {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  blood_group?: string | null
  phone: string
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  allergies?: string | null
  medical_history?: string | null
  notes?: string | null
  emergency_contacts?: EmergencyContact[]
  create_login?: boolean
}

export interface PatientUpdatePayload {
  first_name?: string
  last_name?: string
  date_of_birth?: string
  gender?: string
  blood_group?: string | null
  phone?: string
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  allergies?: string | null
  medical_history?: string | null
  notes?: string | null
  is_active?: boolean
  emergency_contacts?: EmergencyContact[]
}

export interface PaginatedPatients {
  items: Patient[]
  total: number
  page: number
  per_page: number
  pages: number
}
