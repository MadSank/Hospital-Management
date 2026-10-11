import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface DemoAccount {
  role: string
  label: string
  email: string
  pass: string
  icon: React.ReactNode
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'admin',
    label: 'Admin',
    email: 'admin@medflow.com',
    pass: 'Admin@123',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
  {
    role: 'doctor',
    label: 'Doctor',
    email: 'doctor@medflow.com',
    pass: 'Doctor@123',
    icon: <Stethoscope className="w-3.5 h-3.5" />,
  },
  {
    role: 'receptionist',
    label: 'Reception',
    email: 'receptionist@medflow.com',
    pass: 'Reception@123',
    icon: <UserCheck className="w-3.5 h-3.5" />,
  },
  {
    role: 'nurse',
    label: 'Nurse',
    email: 'nurse@medflow.com',
    pass: 'Nurse@123',
    icon: <Activity className="w-3.5 h-3.5" />,
  },
  {
    role: 'patient',
    label: 'Patient',
    email: 'patient@medflow.com',
    pass: 'Patient@123',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
]

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email address and password.')
      return
    }

    setIsSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/dashboard')
    } catch (err: any) {
      if (err.response?.data?.detail?.message) {
        setErrorMsg(err.response.data.detail.message)
      } else if (err.response?.status === 401) {
        setErrorMsg('Invalid email or password. Please verify your credentials.')
      } else if (err.response?.status === 403) {
        setErrorMsg('This account has been deactivated. Please contact an administrator.')
      } else {
        setErrorMsg('Unable to connect to the MedFlow server. Please check your connection.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const fillDemoCredentials = (acc: DemoAccount) => {
    setEmail(acc.email)
    setPassword(acc.pass)
    setErrorMsg(null)
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <div className="w-full max-w-md mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/25 mb-4 transform transition-transform hover:scale-105">
          <Activity className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          MedFlow <span className="text-teal-600">HMS</span>
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Next-Generation Clinical & Hospital Management Platform
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Sign in to your account</h2>
          <p className="text-sm text-slate-500 mt-1">
            Enter your institutional email and password to proceed
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200/80 flex items-start gap-3 text-red-800 text-sm animate-fadeIn"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Email Address
            </label>
            <div className="relative rounded-lg shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@medflow.com"
                disabled={isSubmitting}
                className="block w-full rounded-lg border border-slate-200 pl-10 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Password
              </label>
            </div>
            <div className="relative rounded-lg shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isSubmitting}
                className="block w-full rounded-lg border border-slate-200 pl-10 pr-10 py-2.5 text-slate-900 placeholder-slate-400 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-50 disabled:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="login-submit-button"
            disabled={isSubmitting}
            className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-md shadow-teal-600/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Authenticating...
              </>
            ) : (
              'Sign In to MedFlow'
            )}
          </button>
        </form>

        {/* Demo Fast-Login Pills for Academic Evaluator */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 text-center">
            Quick-Fill Demo Accounts
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => fillDemoCredentials(acc)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 border border-slate-200 transition-colors"
                title={`Login as ${acc.label} (${acc.email})`}
              >
                {acc.icon}
                <span>{acc.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2.5">
            Pre-seeded with synthetic test data for evaluation
          </p>
        </div>
      </div>

      {/* Footer / Status */}
      <div className="mt-8 text-center text-xs text-slate-400">
        <p>MedFlow HMS v1.0.0 • Academic Demonstration System</p>
        <p className="mt-1">All clinical records and identities are synthetic.</p>
      </div>
    </div>
  )
}
