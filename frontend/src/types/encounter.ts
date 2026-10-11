export interface Vitals {
  id?: number
  encounter_id?: number
  recorded_by?: number
  recorded_by_name?: string
  temperature_f?: number
  blood_pressure_systolic?: number
  blood_pressure_diastolic?: number
  heart_rate?: number
  respiratory_rate?: number
  oxygen_saturation?: number
  weight_kg?: number
  height_cm?: number
  notes?: string
  recorded_at?: string
  created_at?: string
}

export interface Diagnosis {
  id?: number
  encounter_id?: number
  diagnosis_name: string
  diagnosis_code?: string
  diagnosis_type: 'primary' | 'secondary' | string
  notes?: string
  created_at?: string
}

export interface EncounterSummary {
  id: number
  encounter_uid: string
  patient_id: number
  patient_name: string
  patient_uid: string
  doctor_id: number
  doctor_name: string
  appointment_id?: number
  encounter_date: string
  chief_complaint?: string
  assessment?: string
  status: 'in_progress' | 'completed' | 'cancelled' | string
  created_at: string
}

export interface EncounterDetail {
  id: number
  encounter_uid: string
  patient_id: number
  patient_name: string
  patient_uid: string
  patient_gender?: string
  patient_dob?: string
  patient_allergies?: string
  doctor_id: number
  doctor_name: string
  doctor_specialty?: string
  appointment_id?: number
  appointment_uid?: string
  encounter_date: string
  chief_complaint?: string
  history_of_present_illness?: string
  examination_notes?: string
  assessment?: string
  treatment_plan?: string
  follow_up_date?: string
  follow_up_notes?: string
  status: 'in_progress' | 'completed' | 'cancelled' | string
  created_at: string
  updated_at: string
  vitals: Vitals[]
  diagnoses: Diagnosis[]
}

export interface EncounterCreatePayload {
  patient_id: number
  doctor_id?: number
  appointment_id?: number
  chief_complaint?: string
  history_of_present_illness?: string
  examination_notes?: string
  assessment?: string
  treatment_plan?: string
  follow_up_date?: string
  follow_up_notes?: string
  vitals?: Partial<Vitals>
  diagnoses?: Diagnosis[]
}
