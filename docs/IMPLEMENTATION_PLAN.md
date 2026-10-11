# Implementation Plan

## Overview

This plan breaks the MedFlow HMS project into 13 ordered milestones. Each milestone produces a working, verifiable increment. The system must remain runnable after every milestone.

**Reference documents:**
- [ARCHITECTURE.md](file:///d:/hopital%20managment/docs/ARCHITECTURE.md) — Stack, structure, auth design
- [DATABASE_DESIGN.md](file:///d:/hopital%20managment/docs/DATABASE_DESIGN.md) — Tables, relationships, concurrency
- [API_SPECIFICATION.md](file:///d:/hopital%20managment/docs/API_SPECIFICATION.md) — Endpoint contracts
- [UI_UX_SPECIFICATION.md](file:///d:/hopital%20managment/docs/UI_UX_SPECIFICATION.md) — Design system, screens
- [TEST_PLAN.md](file:///d:/hopital%20managment/docs/TEST_PLAN.md) — Test cases and tools

---

## Milestone 0 — Project Scaffolding

### Goal
Set up the repository, initialize both frontend and backend projects, configure development tools, and verify the dev environment works end-to-end.

### Files Created
```
.gitignore
README.md
.env.example
scripts/setup.ps1
scripts/start.ps1
scripts/reset-db.ps1
backend/requirements.txt
backend/.env.example
backend/app/__init__.py
backend/app/main.py
backend/app/config.py
backend/app/database.py
frontend/ (Vite scaffold)
```

### Steps
1. Initialize Git repository.
2. Create `.gitignore` (Python, Node, IDE files, .env, *.db).
3. Create backend directory with Python virtual environment.
4. Install backend dependencies: `fastapi`, `uvicorn[standard]`, `sqlalchemy`, `alembic`, `pydantic[email]`, `python-jose[cryptography]`, `passlib[bcrypt]`, `python-dotenv`, `python-multipart`, `httpx`.
5. Create `backend/app/main.py` with minimal FastAPI app, CORS middleware, health check endpoint.
6. Create `backend/app/config.py` with Pydantic Settings loading `.env`.
7. Create `backend/app/database.py` with SQLAlchemy engine (SQLite + WAL mode), session factory.
8. Initialize Alembic: `alembic init alembic`, configure `env.py` to use app's Base metadata.
9. Scaffold frontend with Vite: `npx -y create-vite@latest ./ --template react-ts`.
10. Install frontend dependencies: `@radix-ui/react-*`, `tailwindcss`, `postcss`, `autoprefixer`, `axios`, `react-router-dom`, `react-hook-form`, `@hookform/resolvers`, `zod`, `recharts`, `date-fns`, `lucide-react`, `sonner`, `@tanstack/react-table`, `class-variance-authority`, `clsx`, `tailwind-merge`, `react-to-print`.
11. Configure Tailwind with the design system colors from UI_UX_SPECIFICATION.
12. Initialize shadcn/ui: create `components.json`, install `button`, `input`, `label`, `card`, `dialog`, `dropdown-menu`, `table`, `badge`, `separator`, `skeleton`, `sheet`, `tabs`, `select`, `textarea`, `checkbox`, `calendar`, `popover`, `command`, `toast`/`sonner`, `avatar`, `tooltip`.
13. Create `frontend/src/index.css` with Tailwind directives and design tokens.
14. Create scripts: `setup.ps1`, `start.ps1`, `reset-db.ps1`.
15. Create `README.md` with project overview and quick-start instructions.
16. Verify: backend starts on :8000, frontend starts on :5173, frontend proxy to backend works.

### Acceptance Criteria
- `GET http://localhost:8000/health` returns `{"status": "ok"}`.
- `GET http://localhost:8000/docs` shows Swagger UI.
- Frontend loads at `http://localhost:5173` with a placeholder page.
- No import or build errors in either project.

### Commands
```powershell
# Setup
.\scripts\setup.ps1
# Start backend
cd backend && .\.venv\Scripts\Activate.ps1 && python -m uvicorn app.main:app --reload --port 8000
# Start frontend
cd frontend && npm run dev
```

### Failure Modes
- Python venv creation fails → ensure `python -m venv .venv` uses the correct Python 3.13.
- npm install fails → check Node.js version, clear npm cache.
- CORS errors → verify `CORSMiddleware` origins include `http://localhost:5173`.

---

## Milestone 1 — App Shell and Design System

### Goal
Build the authenticated app layout shell with sidebar navigation, top bar, and reusable UI components. This milestone produces the visual frame for the entire application.

### Prerequisites
Milestone 0 complete.

### Files Created/Modified
```
frontend/src/App.tsx
frontend/src/components/layout/AppLayout.tsx
frontend/src/components/layout/Sidebar.tsx
frontend/src/components/layout/TopBar.tsx
frontend/src/components/layout/Breadcrumbs.tsx
frontend/src/components/shared/DataTable.tsx
frontend/src/components/shared/StatusBadge.tsx
frontend/src/components/shared/SearchInput.tsx
frontend/src/components/shared/EmptyState.tsx
frontend/src/components/shared/LoadingState.tsx
frontend/src/components/shared/ConfirmDialog.tsx
frontend/src/components/shared/PrintButton.tsx
frontend/src/components/shared/DateRangePicker.tsx
frontend/src/components/charts/MetricCard.tsx
frontend/src/components/charts/BarChart.tsx
frontend/src/components/charts/LineChart.tsx
frontend/src/components/charts/PieChart.tsx
frontend/src/lib/utils.ts
frontend/src/lib/constants.ts
frontend/src/lib/formatters.ts
frontend/src/pages/auth/LoginPage.tsx
```

### Steps
1. Create `AppLayout` component with sidebar + topbar + main content area.
2. Implement collapsible `Sidebar` with role-based navigation items (use hardcoded role for now).
3. Implement `TopBar` with logo, notification bell placeholder, user menu dropdown.
4. Implement `Breadcrumbs` component with React Router integration.
5. Build all shared components listed above with proper TypeScript props.
6. Build chart wrapper components using Recharts.
7. Create `LoginPage` with form layout and styling (no backend connection yet).
8. Create `lib/constants.ts` with role definitions, status enums, color mappings.
9. Create `lib/formatters.ts` with date, currency, phone number formatters.
10. Set up React Router with auth-guarded layout (placeholder auth state).
11. Add Inter font from Google Fonts in `index.html`.

### Acceptance Criteria
- App shell renders with sidebar and top bar.
- Sidebar navigation items are visible and clickable.
- Sidebar collapses on medium screens.
- Login page renders with styled form.
- All shared components render correctly in isolation.
- No TypeScript errors or console warnings.

---

## Milestone 2 — Authentication and Authorization

### Goal
Implement complete login/logout flow, JWT authentication, role-based route protection, and backend authorization middleware.

### Prerequisites
Milestone 1 complete.

### Database Changes
Create tables: `roles`, `users`.

### API Endpoints
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

### Files Created/Modified
```
backend/app/models/user.py
backend/app/schemas/auth.py
backend/app/routers/auth.py
backend/app/services/auth_service.py
backend/app/utils/security.py
backend/app/utils/permissions.py
backend/app/dependencies.py
backend/alembic/versions/001_auth_tables.py
backend/seed.py (initial: roles + admin user)
frontend/src/api/client.ts
frontend/src/api/auth.ts
frontend/src/contexts/AuthContext.tsx
frontend/src/hooks/useAuth.ts
frontend/src/pages/auth/LoginPage.tsx (connect to API)
frontend/src/App.tsx (add protected routes)
```

### Steps
1. Create User and Role SQLAlchemy models.
2. Create Pydantic schemas for login request/response and user profile.
3. Implement `security.py`: password hashing (bcrypt), JWT creation/verification.
4. Implement `permissions.py`: role-checking decorator/dependency.
5. Implement `auth_service.py`: authenticate user, get current user.
6. Implement `dependencies.py`: `get_current_user` FastAPI dependency.
7. Create auth router with login, me, change-password endpoints.
8. Run Alembic migration for auth tables.
9. Create `seed.py` with roles and admin user.
10. Implement `AuthContext` on frontend with login/logout/user state.
11. Create Axios client with JWT interceptor (add Bearer token, handle 401).
12. Connect `LoginPage` to API.
13. Implement route protection: redirect to login if unauthenticated.
14. Update sidebar to show role-appropriate navigation.

### Acceptance Criteria
- Admin can log in with `admin@medflow.com` / `Admin@123`.
- JWT is stored and sent with subsequent requests.
- `/api/auth/me` returns current user info.
- Accessing protected routes without token returns 401.
- Frontend redirects to login when not authenticated.
- Sidebar shows role-appropriate items after login.
- Logout clears token and redirects to login.
- Invalid credentials show error message.

### Tests
- `test_auth.py`: login success, login failure, token validation, me endpoint, change password.

---

## Milestone 3 — Patients and Staff

### Goal
Implement patient registration, patient list with search/filter/pagination, patient detail view, staff management, and department management.

### Prerequisites
Milestone 2 complete.

### Database Changes
Create tables: `patients`, `emergency_contacts`, `departments`, `staff`, `doctor_availability`.

### API Endpoints
- CRUD `/api/patients` (list, get, create, update)
- CRUD `/api/staff` (list, get, create, update)
- CRUD `/api/departments` (list, get, create, update)
- GET/POST `/api/staff/{id}/availability`

### Files Created/Modified
```
backend/app/models/patient.py
backend/app/models/staff.py
backend/app/schemas/patient.py
backend/app/schemas/staff.py
backend/app/routers/patients.py
backend/app/routers/staff.py
backend/app/routers/departments.py
backend/app/services/patient_service.py
backend/alembic/versions/002_patients_staff.py
backend/seed.py (add departments, staff, patients)
frontend/src/api/patients.ts
frontend/src/api/staff.ts
frontend/src/types/patient.ts
frontend/src/types/staff.ts
frontend/src/pages/patients/PatientListPage.tsx
frontend/src/pages/patients/PatientDetailPage.tsx
frontend/src/pages/patients/PatientFormPage.tsx
frontend/src/pages/staff/StaffListPage.tsx
frontend/src/pages/staff/StaffDetailPage.tsx
frontend/src/pages/staff/StaffFormPage.tsx
frontend/src/pages/staff/DepartmentListPage.tsx
```

### Acceptance Criteria
- Patient list renders with search, gender filter, blood group filter, pagination.
- Patient registration form validates all required fields.
- Patient detail shows full profile with emergency contacts.
- Duplicate phone/email detection shows appropriate error.
- Staff list with department filter.
- Doctor availability can be set (day, start/end time, slot duration).
- Role-based access: receptionist can register patients but not manage staff.
- Seed data creates 20 patients, 6 doctors, 4 nurses, etc.

### Tests
- `test_patients.py`: CRUD operations, search, validation, duplicate detection, authorization.

---

## Milestone 4 — Appointments and Queue Management

### Goal
Implement appointment booking with doctor availability checking, conflict prevention, status lifecycle, check-in queue, and calendar views.

### Prerequisites
Milestone 3 complete (patients and staff exist).

### Database Changes
Create table: `appointments`.

### API Endpoints
- CRUD `/api/appointments`
- `PATCH /api/appointments/{id}/status`
- `GET /api/appointments/today`
- `GET /api/appointments/queue`
- `GET /api/staff/{id}/available-slots?date=...`

### Files Created/Modified
```
backend/app/models/appointment.py
backend/app/schemas/appointment.py
backend/app/routers/appointments.py
backend/app/services/appointment_service.py
backend/alembic/versions/003_appointments.py
frontend/src/api/appointments.ts
frontend/src/types/appointment.ts
frontend/src/pages/appointments/AppointmentListPage.tsx
frontend/src/pages/appointments/AppointmentBookingPage.tsx
frontend/src/pages/appointments/AppointmentDetailPage.tsx
frontend/src/pages/appointments/AppointmentQueuePage.tsx
```

### Acceptance Criteria
- Booking shows available time slots based on doctor's schedule.
- Booking rejects overlapping time slots for same doctor.
- Booking rejects if patient already has appointment at same time.
- Status transitions follow the defined lifecycle.
- Invalid transitions return 400.
- Check-in queue shows waiting patients ordered by check-in time.
- Today's appointments view filterable by doctor.
- Cancel requires reason.
- Patient can only see/book their own appointments.

### Tests
- `test_appointments.py`: booking, conflict detection, status transitions, authorization, concurrent booking attempt.

---

## Milestone 5 — Consultations and Prescriptions

### Goal
Implement clinical encounter creation, vitals recording, diagnoses, prescription creation, and the consultation workflow.

### Prerequisites
Milestone 4 complete (appointments exist to link to).

### Database Changes
Create tables: `encounters`, `vitals`, `diagnoses`, `prescriptions`, `prescription_items`.

### API Endpoints
- CRUD `/api/encounters`
- `PATCH /api/encounters/{id}/complete`
- POST `/api/encounters/{id}/vitals`
- POST `/api/encounters/{id}/diagnoses`
- CRUD `/api/prescriptions`
- GET `/api/prescriptions/{id}/print`

### Files Created/Modified
```
backend/app/models/encounter.py
backend/app/models/prescription.py
backend/app/schemas/encounter.py
backend/app/schemas/prescription.py
backend/app/routers/encounters.py
backend/app/routers/prescriptions.py
backend/app/services/encounter_service.py
backend/app/services/prescription_service.py
backend/alembic/versions/004_encounters_prescriptions.py
frontend/src/pages/encounters/EncounterPage.tsx
frontend/src/pages/encounters/EncounterListPage.tsx
frontend/src/pages/prescriptions/PrescriptionListPage.tsx
frontend/src/pages/prescriptions/PrescriptionDetailPage.tsx
frontend/src/pages/prescriptions/PrescriptionPrintPage.tsx
```

### Acceptance Criteria
- Doctor can start an encounter from a checked-in appointment.
- Starting encounter sets appointment status to `in_progress`.
- Vitals can be recorded by doctor or nurse.
- Diagnoses can be added (primary/secondary).
- Prescription items reference medicines from the catalog.
- Completing encounter sets appointment to `completed`.
- Print-friendly prescription renders with all required information.
- Patient can view their own encounter history and prescriptions.
- Encounter belongs to exactly one appointment (or is walk-in with no appointment).

### Tests
- `test_encounters.py`: creation, completion, vitals, diagnoses, authorization.
- `test_prescriptions.py`: creation, print, authorization.

---

## Milestone 6 — Laboratory Management

### Goal
Implement the complete lab workflow: test catalog, ordering, sample collection, result entry, verification, and reporting.

### Prerequisites
Milestone 5 complete (encounters exist to link orders to).

### Database Changes
Create tables: `lab_tests`, `lab_orders`, `lab_order_items`, `lab_samples`, `lab_results`.

### API Endpoints
- CRUD `/api/laboratory/tests`
- POST `/api/laboratory/orders`
- GET `/api/laboratory/orders`
- POST `/api/laboratory/orders/{id}/collect-sample`
- POST `/api/laboratory/orders/{id}/items/{item_id}/result`
- POST `/api/laboratory/orders/{id}/items/{item_id}/verify`
- GET `/api/laboratory/orders/{id}/report`

### Files Created/Modified
```
backend/app/models/laboratory.py
backend/app/schemas/laboratory.py
backend/app/routers/laboratory.py
backend/app/services/laboratory_service.py
backend/alembic/versions/005_laboratory.py
frontend/src/pages/laboratory/LabTestCatalogPage.tsx
frontend/src/pages/laboratory/LabOrderListPage.tsx
frontend/src/pages/laboratory/LabOrderDetailPage.tsx
frontend/src/pages/laboratory/LabSampleCollectionPage.tsx
frontend/src/pages/laboratory/LabResultEntryPage.tsx
frontend/src/pages/laboratory/LabReportPage.tsx
```

### Acceptance Criteria
- Doctor can order multiple lab tests from an encounter.
- Lab technician sees pending orders.
- Sample collection creates sample records and updates order status.
- Result entry compares against reference ranges and flags abnormals.
- Results can be verified by authorized personnel.
- All items verified → order status `completed`.
- Print-friendly lab report with abnormal flags.
- Patient sees completed results but not in-progress ones.

### Tests
- `test_laboratory.py`: ordering, sample collection, result entry, abnormal flagging, verification, lifecycle, authorization.

---

## Milestone 7 — Pharmacy and Inventory

### Goal
Implement medicine catalog, batch management, stock tracking, dispensing workflow, and alerts.

### Prerequisites
Milestone 5 complete (prescriptions exist to dispense).

### Database Changes
Create tables: `medicines`, `medicine_batches`, `stock_movements`.

### API Endpoints
- CRUD `/api/pharmacy/medicines`
- POST `/api/pharmacy/medicines/{id}/batches`
- POST `/api/pharmacy/dispense`
- GET `/api/pharmacy/stock-alerts`
- GET `/api/pharmacy/stock-movements`

### Files Created/Modified
```
backend/app/models/pharmacy.py
backend/app/schemas/pharmacy.py
backend/app/routers/pharmacy.py
backend/app/services/pharmacy_service.py
backend/alembic/versions/006_pharmacy.py
frontend/src/pages/pharmacy/MedicineCatalogPage.tsx
frontend/src/pages/pharmacy/MedicineDetailPage.tsx
frontend/src/pages/pharmacy/MedicineFormPage.tsx
frontend/src/pages/pharmacy/BatchFormPage.tsx
frontend/src/pages/pharmacy/DispensingPage.tsx
frontend/src/pages/pharmacy/StockAlertsPage.tsx
frontend/src/pages/pharmacy/StockMovementsPage.tsx
```

### Acceptance Criteria
- Medicine catalog with search by name, category, form.
- Batch creation records stock receipt with movement trail.
- Dispensing validates stock availability per batch.
- Dispensing decrements batch quantity atomically.
- Dispensing updates prescription item status.
- Negative inventory is prevented.
- Low-stock alerts calculated from current stock vs reorder_level.
- Near-expiry alerts for batches expiring within 90 days.
- Stock movement history shows complete audit trail.
- Prescription status updates to `dispensed` when all items dispensed.

### Tests
- `test_pharmacy.py`: CRUD, batch creation, dispensing, insufficient stock, negative prevention, alerts, concurrent dispensing.

---

## Milestone 8 — Billing and Payments

### Goal
Implement invoice creation with itemized charges, payment recording, receipt generation, and financial calculations.

### Prerequisites
Milestones 5-7 complete (encounters, prescriptions, lab orders, medicines provide billable items).

### Database Changes
Create tables: `invoices`, `invoice_items`, `payments`.

### API Endpoints
- CRUD `/api/billing/invoices`
- POST `/api/billing/invoices/{id}/issue`
- POST `/api/billing/invoices/{id}/payments`
- GET `/api/billing/invoices/{id}/print`

### Files Created/Modified
```
backend/app/models/billing.py
backend/app/schemas/billing.py
backend/app/routers/billing.py
backend/app/services/billing_service.py
backend/alembic/versions/007_billing.py
frontend/src/pages/billing/InvoiceListPage.tsx
frontend/src/pages/billing/InvoiceCreatePage.tsx
frontend/src/pages/billing/InvoiceDetailPage.tsx
frontend/src/pages/billing/InvoicePrintPage.tsx
frontend/src/pages/billing/PaymentHistoryPage.tsx
```

### Acceptance Criteria
- Invoice items pull prices from encounters, lab tests, medicines.
- Subtotal, discount, tax, total calculated correctly using Decimal.
- Payment recording updates paid_amount and status.
- Partial payment sets status to `partially_paid`.
- Full payment sets status to `paid`.
- Overpayment prevented.
- Payment on non-issued invoice rejected.
- Print-friendly invoice/receipt with all line items.
- Patient can view their own invoices.

### Tests
- `test_billing.py`: invoice creation, calculations, payments, partial payments, overpayment prevention, status transitions, duplicate prevention.

---

## Milestone 9 — Wards, Beds, and Admissions

### Goal
Implement ward management, bed inventory, admission workflow, bed transfers, and discharge.

### Prerequisites
Milestone 3 complete (patients and staff exist).

### Database Changes
Create tables: `wards`, `beds`, `admissions`.

### API Endpoints
- CRUD `/api/wards`
- CRUD `/api/wards/{id}/beds`
- PATCH `/api/wards/{ward_id}/beds/{bed_id}/status`
- POST `/api/admissions`
- POST `/api/admissions/{id}/transfer`
- POST `/api/admissions/{id}/discharge`
- GET `/api/admissions`

### Files Created/Modified
```
backend/app/models/ward.py
backend/app/schemas/ward.py
backend/app/routers/wards.py
backend/app/routers/admissions.py
backend/app/services/ward_service.py
backend/alembic/versions/008_wards_admissions.py
frontend/src/pages/wards/WardListPage.tsx
frontend/src/pages/wards/WardDetailPage.tsx
frontend/src/pages/wards/BedMapPage.tsx
frontend/src/pages/wards/AdmissionListPage.tsx
frontend/src/pages/wards/AdmissionFormPage.tsx
frontend/src/pages/wards/DischargeFormPage.tsx
```

### Acceptance Criteria
- Ward and bed CRUD with visual bed map.
- Admitting a patient sets bed to `occupied`.
- Cannot admit to an occupied/maintenance bed.
- Cannot admit a patient who already has an active admission.
- Transfer creates new admission and frees old bed.
- Discharge frees bed and records summary.
- Discharge generates bed charges (days × daily_rate) for billing.
- Bed occupancy stats calculated from actual data.

### Tests
- `test_wards.py`: CRUD, admission, occupied bed rejection, transfer, discharge, concurrent allocation.

---

## Milestone 10 — Notifications and Audit Logs

### Goal
Implement the in-app notification system and security audit logging.

### Prerequisites
Milestones 2-9 complete (all modules generate events).

### Database Changes
Create tables: `notifications`, `audit_logs`.

### API Endpoints
- GET `/api/notifications`
- GET `/api/notifications/unread-count`
- PATCH `/api/notifications/{id}/read`
- POST `/api/notifications/mark-all-read`
- GET `/api/audit/logs`

### Files Created/Modified
```
backend/app/models/notification.py
backend/app/models/audit.py
backend/app/schemas/notification.py
backend/app/schemas/audit.py
backend/app/routers/notifications.py
backend/app/routers/audit.py
backend/app/services/notification_service.py
backend/app/services/audit_service.py
backend/alembic/versions/009_notifications_audit.py
frontend/src/contexts/NotificationContext.tsx
frontend/src/pages/notifications/NotificationListPage.tsx
frontend/src/pages/audit/AuditLogPage.tsx
```

### Retroactive Integration
Go back through all service methods and add:
1. `notification_service.create(...)` calls for appointment booking/changes, prescription creation, lab results, low stock alerts, discharge, payment receipt.
2. `audit_service.log(...)` calls for login/logout, patient CRUD, appointment changes, prescription creation, dispensing, lab result updates, inventory changes, invoice/payment changes.

### Acceptance Criteria
- Notification bell shows unread count.
- Clicking bell shows recent notifications.
- Mark individual or all as read.
- Notifications created for all defined trigger events.
- Audit logs record all defined actions.
- Admin can view/search/filter audit logs.
- Non-admins cannot access audit logs.
- Audit records cannot be modified or deleted.
- Login failures are logged.

### Tests
- `test_notifications.py`: creation, read/unread, mark-all, authorization (own only).
- `test_audit.py`: log creation, admin-only access, immutability.

---

## Milestone 11 — Analytics and Dashboards

### Goal
Implement role-specific dashboards with real database-driven metrics, charts, and report views.

### Prerequisites
Milestones 2-10 complete (data exists to aggregate).

### API Endpoints
- GET `/api/analytics/dashboard`
- GET `/api/analytics/reports/revenue`
- GET `/api/analytics/reports/appointments`
- GET `/api/analytics/reports/occupancy`

### Files Created/Modified
```
backend/app/routers/analytics.py
frontend/src/pages/dashboard/AdminDashboard.tsx
frontend/src/pages/dashboard/DoctorDashboard.tsx
frontend/src/pages/dashboard/ReceptionistDashboard.tsx
frontend/src/pages/dashboard/NurseDashboard.tsx
frontend/src/pages/dashboard/PharmacistDashboard.tsx
frontend/src/pages/dashboard/LabTechDashboard.tsx
frontend/src/pages/dashboard/PatientDashboard.tsx
frontend/src/pages/analytics/ReportsPage.tsx
```

### Acceptance Criteria
- Admin dashboard shows all metrics from actual database queries.
- Doctor dashboard shows today's appointments, pending encounters, waiting queue.
- Pharmacist dashboard shows pending prescriptions, stock alerts.
- Lab tech dashboard shows pending orders.
- Receptionist dashboard shows today's appointments, check-in queue.
- Patient dashboard shows upcoming appointments, recent records.
- Revenue chart uses real payment data.
- Appointment chart uses real appointment data.
- Bed occupancy uses real bed status data.
- Empty states shown when no data exists.
- Loading skeletons while data is being fetched.
- Date range filters work on report pages.

---

## Milestone 12 — Integration, Testing, and Polish

### Goal
Verify all end-to-end workflows, fix regressions, add missing states, ensure responsive design, and run comprehensive tests.

### Prerequisites
Milestones 0-11 complete.

### End-to-End Workflows to Verify

1. **Full patient journey:** Register → book appointment → check in → consultation → prescribe → dispense → invoice → pay.
2. **Lab workflow:** Consultation → order tests → collect samples → enter results → verify → view in patient record.
3. **Admission workflow:** Admit → bed assignment → treatment → discharge → bed freed → bed charges billed.
4. **Inventory workflow:** Receive stock → update inventory → dispense → low-stock alert → restock.
5. **Appointment changes:** Create → reschedule → cancel with reason → notification sent.
6. **Invoice lifecycle:** Draft → issue → partial payment → full payment → status updates.
7. **Role-based access:** Login as each role → verify dashboard → verify accessible/inaccessible pages.

### Polish Tasks
1. Review all forms for consistent validation messages.
2. Verify loading states on all pages.
3. Verify empty states on all list pages.
4. Test responsive layout on mobile (< 640px) and tablet (768px).
5. Verify all print pages render cleanly.
6. Check all status badge colors and text.
7. Verify breadcrumb navigation on all pages.
8. Check keyboard navigation (Tab through forms, Enter to submit).
9. Review all toast messages for clarity.
10. Verify sidebar collapse/expand behavior.

### Tests to Run
```powershell
cd backend && python -m pytest tests/ -v --tb=short
```

All test categories from TEST_PLAN.md.

### Acceptance Criteria
- All 7 end-to-end workflows complete without errors.
- All tests pass.
- No console errors or warnings in browser.
- Responsive layout works at all breakpoints.
- All buttons, forms, and navigation elements are functional.

---

## Milestone 13 — Final Demo Readiness

### Goal
Prepare for final demonstration with clean seed data, documentation, and verification.

### Steps
1. Reset database and run fresh seed.
2. Verify all demo accounts log in correctly.
3. Walk through primary demo scenarios.
4. Update `README.md` with final instructions.
5. Create `docs/DEMO_GUIDE.md` with:
   - Demo account credentials.
   - Suggested demo walkthrough order.
   - Screenshots of key screens.
   - Known limitations.
6. Run `git status` — ensure no untracked secrets or temporary files.
7. Final `git commit` with clean state.

### Demo Account Credentials Table

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@medflow.com | Admin@123 |
| Doctor (Cardiology) | dr.patel@medflow.com | Doctor@123 |
| Doctor (Orthopedics) | dr.sharma@medflow.com | Doctor@123 |
| Receptionist | reception@medflow.com | Reception@123 |
| Nurse | nurse.kumar@medflow.com | Nurse@123 |
| Pharmacist | pharma@medflow.com | Pharma@123 |
| Lab Technician | lab@medflow.com | Lab@123 |
| Patient | patient.rahul@medflow.com | Patient@123 |

### Final Deliverables
- Working application with all modules.
- Seed data covering all entity types.
- Complete documentation in `docs/`.
- Automated tests with passing results.
- Demo guide with walkthrough instructions.

### Acceptance Criteria (Definition of Done)
All 19 items from the master prompt's "Definition of Done" section must be satisfied. See Section 14 of the original requirements.
