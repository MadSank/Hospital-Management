import React from 'react'
import { Activity, LogOut, ShieldCheck, Stethoscope, User as UserIcon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export const TopBar: React.FC = () => {
  const { user, logout } = useAuth()

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'doctor':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'nurse':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'receptionist':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'pharmacist':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-slate-900 tracking-tight text-lg">
            MedFlow <span className="text-teal-600">HMS</span>
          </span>
          <span className="hidden md:inline-block ml-3 px-2 py-0.5 text-[11px] font-medium bg-teal-50 text-teal-700 rounded-full border border-teal-200/60">
            Milestone 1 • Foundation & Auth
          </span>
        </div>
      </div>

      {/* User Information & Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-900 leading-tight">
                {user.full_name || user.email}
              </span>
              <span className="text-xs text-slate-500">{user.email}</span>
            </div>

            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-md border capitalize flex items-center gap-1.5 ${getRoleBadgeColor(
                user.role
              )}`}
            >
              {user.role === 'admin' ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : user.role === 'doctor' ? (
                <Stethoscope className="w-3.5 h-3.5" />
              ) : (
                <UserIcon className="w-3.5 h-3.5" />
              )}
              {user.role_display || user.role}
            </span>
          </div>
        )}

        <button
          onClick={() => logout()}
          title="Sign out of system"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  )
}
