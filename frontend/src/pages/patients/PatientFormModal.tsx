import React, { useState, useEffect } from 'react'
import { AlertCircle, Plus, Trash2, X } from 'lucide-react'
import type { EmergencyContact, Patient, PatientCreatePayload, PatientUpdatePayload } from '../../types/patient'
import { createPatient, updatePatient } from '../../api/patients'

interface PatientFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (patient: Patient) => void
  initialData?: Patient | null
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

export const PatientFormModal: React.FC<PatientFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const isEdit = !!initialData

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('male')
  const [bloodGroup, setBloodGroup] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [allergies, setAllergies] = useState('')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [notes, setNotes] = useState('')
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { name: '', relationship: 'Spouse', phone: '' },
  ])

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFirstName(initialData.first_name || '')
      setLastName(initialData.last_name || '')
      setDob(initialData.date_of_birth ? initialData.date_of_birth.substring(0, 10) : '')
      setGender(initialData.gender || 'male')
      setBloodGroup(initialData.blood_group || '')
      setPhone(initialData.phone || '')
      setEmail(initialData.email || '')
      setAddress(initialData.address || '')
      setCity(initialData.city || '')
      setState(initialData.state || '')
      setZipCode(initialData.zip_code || '')
      setAllergies(initialData.allergies || '')
      setMedicalHistory(initialData.medical_history || '')
      setNotes(initialData.notes || '')
      setContacts(
        initialData.emergency_contacts && initialData.emergency_contacts.length > 0
          ? initialData.emergency_contacts.map((c) => ({
              name: c.name,
              relationship: c.relationship,
              phone: c.phone,
            }))
          : [{ name: '', relationship: 'Spouse', phone: '' }]
      )
    } else {
      // Reset form for create
      setFirstName('')
      setLastName('')
      setDob('')
      setGender('male')
      setBloodGroup('')
      setPhone('')
      setEmail('')
      setAddress('')
      setCity('')
      setState('')
      setZipCode('')
      setAllergies('')
      setMedicalHistory('')
      setNotes('')
      setContacts([{ name: '', relationship: 'Spouse', phone: '' }])
    }
    setErrorMsg(null)
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleAddContact = () => {
    setContacts([...contacts, { name: '', relationship: 'Family', phone: '' }])
  }

  const handleRemoveContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index))
  }

  const handleContactChange = (index: number, field: keyof EmergencyContact, value: string) => {
    const updated = [...contacts]
    updated[index] = { ...updated[index], [field]: value }
    setContacts(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('First and last name are required.')
      return
    }
    if (!dob) {
      setErrorMsg('Date of birth is required.')
      return
    }
    if (new Date(dob) >= new Date()) {
      setErrorMsg('Date of birth must be in the past.')
      return
    }
    if (!phone.trim()) {
      setErrorMsg('Phone number is required.')
      return
    }

    // Filter valid emergency contacts
    const validContacts = contacts.filter(
      (c) => c.name.trim() !== '' && c.phone.trim() !== ''
    )

    setIsSubmitting(true)
    try {
      if (isEdit && initialData) {
        const payload: PatientUpdatePayload = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          date_of_birth: dob,
          gender,
          blood_group: bloodGroup || null,
          phone: phone.trim(),
          email: email.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          zip_code: zipCode.trim() || null,
          allergies: allergies.trim() || null,
          medical_history: medicalHistory.trim() || null,
          notes: notes.trim() || null,
          emergency_contacts: validContacts,
        }
        const updated = await updatePatient(initialData.id, payload)
        onSuccess(updated)
      } else {
        const payload: PatientCreatePayload = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          date_of_birth: dob,
          gender,
          blood_group: bloodGroup || null,
          phone: phone.trim(),
          email: email.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          zip_code: zipCode.trim() || null,
          allergies: allergies.trim() || null,
          medical_history: medicalHistory.trim() || null,
          notes: notes.trim() || null,
          emergency_contacts: validContacts,
        }
        const created = await createPatient(payload)
        onSuccess(created)
      }
      onClose()
    } catch (err: any) {
      if (err.response?.data?.detail?.message) {
        setErrorMsg(err.response.data.detail.message)
      } else if (err.response?.status === 409) {
        setErrorMsg('A patient with this phone number or email already exists in the system.')
      } else {
        setErrorMsg('An error occurred while saving the patient record. Please check inputs.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isEdit ? `Edit Patient — ${initialData?.patient_uid}` : 'Register New Patient'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? 'Update patient demographic, medical history, and emergency contact details'
                : 'Enter complete demographic and contact information to generate a Medical Record Number'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {errorMsg && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm"
            >
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Section 1: Demographics */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600" />
              1. Personal Demographics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Rahul"
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Sharma"
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {GENDERS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">Select...</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600" />
              2. Contact & Address
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91-9876543210"
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@example.com"
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Flat, building, street address"
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="Zip / Pin"
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Clinical Notes & Medical History */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600" />
              3. Clinical History & Allergies
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Known Allergies
                </label>
                <textarea
                  rows={2}
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa drugs, Peanuts, Latex"
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Past Medical History
                </label>
                <textarea
                  rows={2}
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma"
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Administrative / Patient Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional patient notes"
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Emergency Contacts */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600" />
                4. Emergency Contacts
              </h4>
              <button
                type="button"
                onClick={handleAddContact}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Contact
              </button>
            </div>

            <div className="space-y-3">
              {contacts.map((contact, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Contact Full Name
                    </label>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:border-teal-500 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Relationship
                    </label>
                    <input
                      type="text"
                      value={contact.relationship}
                      onChange={(e) => handleContactChange(idx, 'relationship', e.target.value)}
                      placeholder="Spouse / Parent"
                      className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:border-teal-500 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => handleContactChange(idx, 'phone', e.target.value)}
                      placeholder="+91-9876543211"
                      className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:border-teal-500 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                        title="Remove contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm shadow-teal-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? 'Saving Patient Record...' : isEdit ? 'Save Changes' : 'Register Patient'}
          </button>
        </div>
      </div>
    </div>
  )
}
