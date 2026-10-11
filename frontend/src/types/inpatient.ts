export interface Bed {
  id: number
  ward_id: number
  bed_number: string
  bed_type: 'standard' | 'electric' | 'icu' | 'crib' | string
  status: 'available' | 'occupied' | 'maintenance' | 'reserved' | string
  daily_rate: number
  is_active: boolean
  current_patient_id?: number
  current_patient_name?: string
  current_admission_id?: number
  created_at: string
}

export interface Ward {
  id: number
  name: string
  ward_type: 'general' | 'private' | 'icu' | 'pediatric' | 'maternity' | string
  floor?: string
  capacity: number
  is_active: boolean
  total_beds: number
  available_beds: number
  occupied_beds: number
  created_at: string
  beds?: Bed[]
}

export interface Admission {
  id: number
  admission_uid: string
  patient_id: number
  patient_name: string
  patient_uid: string
  bed_id: number
  bed_number: string
  ward_id: number
  ward_name: string
  admitting_doctor_id: number
  admitting_doctor_name: string
  admission_date: string
  discharge_date?: string
  status: 'admitted' | 'transferred' | 'discharged' | string
  reason: string
  discharge_summary?: string
  discharge_notes?: string
  created_at: string
  updated_at: string
}
