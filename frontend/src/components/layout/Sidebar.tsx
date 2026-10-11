import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Bed,
  Calendar,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  Pill,
  Receipt,
  Stethoscope,
  Users,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface NavItem {
  name: string
  icon: React.ReactNode
  roles: string[]
  badge?: string
  path: string
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    roles: ['admin', 'doctor', 'receptionist', 'nurse', 'pharmacist', 'lab_technician', 'patient'],
    path: '/dashboard',
  },
  {
    name: 'Patients',
    icon: <Users className="w-4 h-4" />,
    roles: ['admin', 'doctor', 'receptionist', 'nurse'],
    badge: 'M2',
    path: '/patients',
  },
  {
    name: 'My Health Record',
    icon: <Users className="w-4 h-4" />,
    roles: ['patient'],
    badge: 'M2',
    path: '/patients/1',
  },
  {
    name: 'Appointments',
    icon: <Calendar className="w-4 h-4" />,
    roles: ['admin', 'doctor', 'receptionist', 'nurse', 'patient'],
    badge: 'M3',
    path: '/appointments',
  },
  {
    name: 'Clinical Encounters',
    icon: <Stethoscope className="w-4 h-4" />,
    roles: ['admin', 'doctor', 'nurse'],
    badge: 'M4',
    path: '/encounters',
  },
  {
    name: 'Pharmacy & Stock',
    icon: <Pill className="w-4 h-4" />,
    roles: ['admin', 'pharmacist', 'doctor'],
    badge: 'M4',
    path: '/pharmacy',
  },
  {
    name: 'Laboratory Tests',
    icon: <FlaskConical className="w-4 h-4" />,
    roles: ['admin', 'lab_technician', 'doctor'],
    badge: 'M5',
    path: '/laboratory',
  },
  {
    name: 'Wards & Beds',
    icon: <Bed className="w-4 h-4" />,
    roles: ['admin', 'nurse', 'doctor'],
    badge: 'M4',
    path: '/wards',
  },
  {
    name: 'Billing & Invoices',
    icon: <Receipt className="w-4 h-4" />,
    roles: ['admin', 'receptionist', 'doctor', 'patient'],
    badge: 'M5',
    path: '/billing',
  },
  {
    name: 'Reports & Analytics',
    icon: <BarChart3 className="w-4 h-4" />,
    roles: ['admin', 'doctor', 'receptionist'],
    badge: 'M5',
    path: '/reports',
  },
  {
    name: 'System Audit Logs',
    icon: <ClipboardList className="w-4 h-4" />,
    roles: ['admin'],
    badge: 'M7',
    path: '/audit-logs',
  },
]

export const Sidebar: React.FC = () => {
  const { user } = useAuth()
  const location = useLocation()
  const userRole = user?.role || 'patient'

  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Role Navigation Header */}
      <div className="p-4 border-b border-slate-800">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-400">
          Navigation • {user?.role_display || 'Staff'}
        </span>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1">
        {visibleNavItems.map((item) => {
          const isActive =
            item.path === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                    isActive
                      ? 'bg-teal-700 text-teal-100 border-teal-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Sidebar Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        <div className="flex items-center justify-between">
          <span>Database</span>
          <span className="text-emerald-400 font-mono text-[11px]">SQLite (WAL)</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span>Backend API</span>
          <span className="text-teal-400 font-mono text-[11px]">FastAPI :8000</span>
        </div>
      </div>
    </aside>
  )
}
