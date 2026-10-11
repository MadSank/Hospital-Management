import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Filter,
  Loader2,
  Plus,
  Search,
  Stethoscope,
} from 'lucide-react'
import { getEncounters } from '../../api/encounters'
import { useAuth } from '../../contexts/AuthContext'
import type { EncounterSummary } from '../../types/encounter'
import { NewEncounterModal } from './NewEncounterModal'

export const EncounterListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [encounters, setEncounters] = useState<EncounterSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)

  const fetchEncounters = async () => {
    setLoading(true)
    try {
      const data = await getEncounters({
        status: statusFilter || undefined,
      })
      setEncounters(data)
    } catch (err) {
      console.error('Failed to load encounters', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEncounters()
  }, [statusFilter])

  const filtered = encounters.filter((e) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      e.patient_name.toLowerCase().includes(term) ||
      e.patient_uid.toLowerCase().includes(term) ||
      e.encounter_uid.toLowerCase().includes(term) ||
      e.doctor_name.toLowerCase().includes(term) ||
      (e.chief_complaint && e.chief_complaint.toLowerCase().includes(term))
    )
  })

  const canCreate = user?.role === 'admin' || user?.role === 'doctor'

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Stethoscope className="w-6 h-6 text-teal-700" />
            <span>Clinical Encounters & EHR</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Consultation history, subjective notes, objective vitals, diagnoses, and medical records
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-md shadow-teal-900/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Consultation</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient, UID, complaint..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white"
          >
            <option value="">All Statuses</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Encounters Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No clinical encounters found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Start a new consultation or adjust search and filter parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Encounter UID</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Attending Doctor</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Chief Complaint</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/encounters/${e.id}`)}
                    className="hover:bg-slate-50/75 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-700">
                      {e.encounter_uid}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{e.patient_name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{e.patient_uid}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {e.doctor_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(e.encounter_date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 max-w-xs truncate">
                      {e.chief_complaint || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          e.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${e.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                        {e.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-teal-700 font-semibold hover:text-teal-900">
                        View EHR
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewEncounterModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={(created) => {
          fetchEncounters()
          navigate(`/encounters/${created.id}`)
        }}
      />
    </div>
  )
}
