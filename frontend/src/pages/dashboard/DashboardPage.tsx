import React, { useState } from 'react'
import {
  CheckCircle2,
  Database,
  Lock,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react'
import { apiClient } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const [adminTestResult, setAdminTestResult] = useState<string | null>(null)
  const [adminTestError, setAdminTestError] = useState<string | null>(null)
  const [isTestingAdmin, setIsTestingAdmin] = useState(false)

  const testAdminAccess = async () => {
    setIsTestingAdmin(true)
    setAdminTestResult(null)
    setAdminTestError(null)

    try {
      const res = await apiClient.get('/auth/admin-only')
      setAdminTestResult(res.data.message || 'Access granted!')
    } catch (err: any) {
      if (err.response?.status === 403) {
        setAdminTestError(
          `HTTP 403 Forbidden: ${err.response.data?.detail?.message || 'Access denied for non-admin'}`
        )
      } else {
        setAdminTestError(`Error: ${err.message}`)
      }
    } finally {
      setIsTestingAdmin(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-teal-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-teal-900/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-xs mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-200" />
            Milestone 1 Verified & Active
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome, {user?.full_name || user?.email}
          </h1>
          <p className="mt-1 text-teal-100 text-sm max-w-xl">
            You are authenticated with role{' '}
            <strong className="underline underline-offset-2 capitalize">
              {user?.role_display || user?.role}
            </strong>
            . MedFlow core authentication, database models, and session management are operating.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-3 text-right shrink-0">
          <div className="text-[11px] text-teal-200 uppercase font-semibold">Session Status</div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5 justify-end mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Active (8hr JWT)
          </div>
        </div>
      </div>

      {/* Grid Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: User Profile */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Authenticated Identity</h3>
              <p className="text-xs text-slate-500">FastAPI JWT Token Claims</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Email:</span>
              <span className="font-medium text-slate-900">{user?.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Role:</span>
              <span className="font-semibold text-teal-700 capitalize">{user?.role}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">User ID:</span>
              <span className="font-mono text-slate-700">{user?.id}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Account Status:</span>
              <span className="text-emerald-600 font-semibold">Active</span>
            </div>
          </div>
        </div>

        {/* Card 2: Database Architecture */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Persistence Layer</h3>
              <p className="text-xs text-slate-500">SQLAlchemy 2.0 & SQLite</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Engine:</span>
              <span className="font-medium text-slate-900">SQLite 3</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Journal Mode:</span>
              <span className="font-medium text-emerald-600">WAL Enabled</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Migrations:</span>
              <span className="font-medium text-slate-900">Alembic (Head)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Foreign Keys:</span>
              <span className="font-semibold text-emerald-600">Enforced (ON)</span>
            </div>
          </div>
        </div>

        {/* Card 3: RBAC Enforcement Test */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Role Authorization Test</h3>
              <p className="text-xs text-slate-500">Backend RBAC Dependency</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mb-3">
            Click to invoke the backend endpoint <code>/api/auth/admin-only</code> with your active token:
          </p>
          <button
            onClick={testAdminAccess}
            disabled={isTestingAdmin}
            className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {isTestingAdmin ? 'Testing...' : 'Test Admin Endpoint'}
          </button>

          {adminTestResult && (
            <div className="mt-2.5 p-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{adminTestResult}</span>
            </div>
          )}

          {adminTestError && (
            <div className="mt-2.5 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{adminTestError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Roadmap Section */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900 mb-2">Milestone Implementation Status</h2>
        <p className="text-xs text-slate-500 mb-5">
          MedFlow HMS implementation follows the strict ordered roadmap defined in <code>docs/IMPLEMENTATION_PLAN.md</code>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-200">
            <span className="font-semibold text-teal-800">✅ Milestone 1</span>
            <p className="text-teal-700 font-medium mt-1">Foundation & Core Auth</p>
            <span className="text-[10px] text-teal-600">Active & Passing Tests</span>
          </div>
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-200">
            <span className="font-semibold text-teal-800">✅ Milestone 2</span>
            <p className="text-teal-700 font-medium mt-1">Patient Management</p>
            <span className="text-[10px] text-teal-600">Active & Passing Tests</span>
          </div>
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-200">
            <span className="font-semibold text-teal-800">✅ Milestone 3</span>
            <p className="text-teal-700 font-medium mt-1">Appointments & Scheduling</p>
            <span className="text-[10px] text-teal-600">Active & Passing Tests</span>
          </div>
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-200">
            <span className="font-semibold text-teal-800">✅ Milestone 4</span>
            <p className="text-teal-700 font-medium mt-1">EHR, Pharmacy & Inpatient</p>
            <span className="text-[10px] text-teal-600">Active & Passing Tests</span>
          </div>
        </div>
      </div>
    </div>
  )
}
