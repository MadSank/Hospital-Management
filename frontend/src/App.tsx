import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { PatientListPage } from './pages/patients/PatientListPage'
import { PatientDetailPage } from './pages/patients/PatientDetailPage'
import { AppointmentListPage } from './pages/appointments/AppointmentListPage'
import { EncounterListPage } from './pages/encounters/EncounterListPage'
import { EncounterDetailPage } from './pages/encounters/EncounterDetailPage'
import { PharmacyDashboardPage } from './pages/pharmacy/PharmacyDashboardPage'
import { InpatientPage } from './pages/inpatient/InpatientPage'
import { InvoiceListPage } from './pages/billing/InvoiceListPage'
import { InvoiceDetailPage } from './pages/billing/InvoiceDetailPage'
import { ReportsDashboardPage } from './pages/reports/ReportsDashboardPage'

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/patients" element={<PatientListPage />} />
              <Route path="/patients/:id" element={<PatientDetailPage />} />
              <Route path="/appointments" element={<AppointmentListPage />} />
              <Route path="/encounters" element={<EncounterListPage />} />
              <Route path="/encounters/:id" element={<EncounterDetailPage />} />
              <Route path="/pharmacy" element={<PharmacyDashboardPage />} />
              <Route path="/wards" element={<InpatientPage />} />
              <Route path="/billing" element={<InvoiceListPage />} />
              <Route path="/billing/:id" element={<InvoiceDetailPage />} />
              <Route path="/reports" element={<ReportsDashboardPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

