import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Edit3,
  Eye,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Users,
  UserX,
  X,
} from 'lucide-react'
import { archivePatient, getPatients } from '../../api/patients'
import { useAuth } from '../../contexts/AuthContext'
import type { Patient } from '../../types/patient'
import { PatientFormModal } from './PatientFormModal'

export const PatientListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userRole = user?.role || 'patient'
  const canManage = ['admin', 'receptionist'].includes(userRole)

  // Data states
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [selectedGender, setSelectedGender] = useState('')
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('active')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)

  // Archive confirmation modal
  const [patientToArchive, setPatientToArchive] = useState<Patient | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const fetchPatientList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = {
        page,
        per_page: perPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      }

      if (appliedSearch.trim()) params.search = appliedSearch.trim()
      if (selectedGender) params.gender = selectedGender
      if (selectedBloodGroup) params.blood_group = selectedBloodGroup
      if (selectedStatus === 'active') params.is_active = true
      if (selectedStatus === 'archived') params.is_active = false

      const data = await getPatients(params)
      setPatients(data.items)
      setTotal(data.total)
      setPages(data.pages)
    } catch (err: any) {
      const msg = err.response?.data?.detail?.message || err.message || 'Failed to load patients'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [page, perPage, appliedSearch, selectedGender, selectedBloodGroup, selectedStatus, sortBy, sortOrder])

  useEffect(() => {
    fetchPatientList()
  }, [fetchPatientList])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setAppliedSearch(searchInput)
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setAppliedSearch('')
    setPage(1)
  }

  const handleOpenRegister = () => {
    setEditingPatient(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (patient: Patient) => {
    setEditingPatient(patient)
    setIsModalOpen(true)
  }

  const handleModalSuccess = (patient: Patient) => {
    setIsModalOpen(false)
    setActionSuccess(
      editingPatient
        ? `Patient ${patient.patient_uid} (${patient.first_name} ${patient.last_name}) updated successfully.`
        : `Patient ${patient.patient_uid} (${patient.first_name} ${patient.last_name}) registered successfully.`
    )
    fetchPatientList()
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const handleConfirmArchive = async () => {
    if (!patientToArchive) return
    setIsArchiving(true)
    try {
      await archivePatient(patientToArchive.id)
      setActionSuccess(`Patient ${patientToArchive.patient_uid} has been archived.`)
      setPatientToArchive(null)
      fetchPatientList()
      setTimeout(() => setActionSuccess(null), 4000)
    } catch (err: any) {
      const msg = err.response?.data?.detail?.message || err.message || 'Failed to archive patient'
      setError(msg)
    } finally {
      setIsArchiving(false)
    }
  }

  // Calculate age helper
  const calculateAge = (dobString: string): string => {
    if (!dobString) return '—'
    const birthDate = new Date(dobString)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age > 0 ? `${age} yrs` : '< 1 yr'
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-teal-600" />
            Patient Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Search, register, and manage patient clinical records and demographics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPatientList()}
            title="Refresh list"
            className="p-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>

          {canManage && (
            <button
              onClick={handleOpenRegister}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-colors focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4" />
              Register Patient
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by MRN (PAT-...), full name, phone, or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-50/50"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-xs"
          >
            Search
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value)
              setPage(1)
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
          >
            <option value="active">Active Patients</option>
            <option value="all">All Records</option>
            <option value="archived">Archived Only</option>
          </select>

          {/* Gender Filter */}
          <select
            value={selectedGender}
            onChange={(e) => {
              setSelectedGender(e.target.value)
              setPage(1)
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          {/* Blood Group Filter */}
          <select
            value={selectedBloodGroup}
            onChange={(e) => {
              setSelectedBloodGroup(e.target.value)
              setPage(1)
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
          >
            <option value="">All Blood Groups</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>

          {/* Sorting */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-slate-500">Sort by:</span>
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(':')
                setSortBy(sb)
                setSortOrder(so)
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
            >
              <option value="created_at:desc">Newest First</option>
              <option value="created_at:asc">Oldest First</option>
              <option value="last_name:asc">Name (A-Z)</option>
              <option value="last_name:desc">Name (Z-A)</option>
              <option value="patient_uid:asc">MRN (Ascending)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patient Data Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && patients.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-3" />
            <p className="text-sm font-medium">Loading patient directory...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <UserX className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No patients found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {appliedSearch || selectedGender || selectedBloodGroup || selectedStatus !== 'active'
                ? 'No patient records match the applied search or filter criteria. Try resetting your filters.'
                : 'No patients have been registered yet.'}
            </p>
            {canManage && (
              <button
                onClick={handleOpenRegister}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Register First Patient
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">MRN</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Age / Gender</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Phone / Email</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((pt) => {
                  return (
                    <tr
                      key={pt.id}
                      className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/patients/${pt.id}`)}
                    >
                      {/* MRN */}
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-teal-800">
                        <span className="bg-teal-50 px-2 py-1 rounded border border-teal-200">
                          {pt.patient_uid}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <Link
                          to={`/patients/${pt.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-teal-600 hover:underline flex items-center gap-1.5"
                        >
                          {pt.first_name} {pt.last_name}
                        </Link>
                      </td>

                      {/* Age & Gender */}
                      <td className="py-3.5 px-4 text-xs text-slate-600 capitalize">
                        {calculateAge(pt.date_of_birth)} • {pt.gender}
                      </td>

                      {/* Blood Group */}
                      <td className="py-3.5 px-4">
                        {pt.blood_group ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            {pt.blood_group}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-mono text-slate-800">{pt.phone}</div>
                        {pt.email && <div className="text-slate-400 truncate max-w-[160px]">{pt.email}</div>}
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {pt.city ? `${pt.city}${pt.state ? `, ${pt.state}` : ''}` : '—'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {pt.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Archived
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/patients/${pt.id}`)}
                            title="View Full Record"
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canManage && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(pt)}
                                title="Edit Patient"
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-md transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {pt.is_active && (
                                <button
                                  onClick={() => setPatientToArchive(pt)}
                                  title="Archive Patient"
                                  className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-slate-900">{patients.length > 0 ? (page - 1) * perPage + 1 : 0}</strong> to{' '}
              <strong className="text-slate-900">{Math.min(page * perPage, total)}</strong> of{' '}
              <strong className="text-slate-900">{total}</strong> patients
            </span>

            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value))
                setPage(1)
              }}
              className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 focus:ring-1 focus:ring-teal-500"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-xs"
            >
              Previous
            </button>

            <span className="px-3 py-1.5 font-medium text-slate-700">
              Page {page} of {pages || 1}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages || loading}
              className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Register/Edit Patient Modal */}
      <PatientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        initialData={editingPatient}
      />

      {/* Confirmation Modal for Archival */}
      {patientToArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Archive className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              Archive Patient Record?
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              Are you sure you want to archive{' '}
              <strong>
                {patientToArchive.first_name} {patientToArchive.last_name}
              </strong>{' '}
              ({patientToArchive.patient_uid})?
            </p>
            <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              Archiving deactivates this patient from routine clinical lookups while preserving all historic clinical notes, encounters, and audit records.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPatientToArchive(null)}
                disabled={isArchiving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isArchiving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs"
              >
                {isArchiving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  'Confirm Archive'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
