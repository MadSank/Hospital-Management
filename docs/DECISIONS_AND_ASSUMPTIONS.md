# Decisions and Assumptions

## 1. Document Overview

This document records the architectural decisions, trade-offs, operating assumptions, alternative evaluations, and scope boundaries established for the **MedFlow Hospital Management System (HMS)**.

Every design choice is intentional, defensible in an academic review, and structured to allow seamless future evolution into an enterprise-grade healthcare platform.

---

## 2. Architecture Decision Records (ADRs)

### ADR-001: Database Engine — SQLite for Initial Scope with PostgreSQL Migration Path

* **Context:** The system must run immediately on a Windows academic evaluation machine without requiring the evaluator or instructor to install, configure, start, and manage a PostgreSQL database service.
* **Decision:** Use SQLite with Write-Ahead Logging (`PRAGMA journal_mode=WAL;`) and foreign key enforcement (`PRAGMA foreign_keys=ON;`) for initial development and demonstration.
* **Rationale:**
  * Zero-friction setup: Python includes `sqlite3` natively in standard library.
  * Single-file database (`backend/medflow.db`): Trivial to backup, inspect, reset, and distribute with the submission.
  * SQLAlchemy ORM abstractions isolate dialect-specific SQL, ensuring all models, relationships, and queries remain standard relational SQL.
* **Trade-Offs & Mitigations:**
  * *Concurrency limitation:* SQLite handles one writer at a time. Mitigated by WAL mode (allows concurrent readers while writing), connection pooling with `NullPool` or small timeout configurations, and the single-evaluator workload profile.
  * *Missing types:* SQLite does not natively support `UUID`, `BOOLEAN`, or `JSON`. Mitigated by SQLAlchemy type decorators (`String(36)` for UUID, `Integer/Boolean` abstraction, `Text/JSON` serializers).
* **Migration Path:**
  * Changing `DATABASE_URL` in `.env` to `postgresql+asyncpg://user:pass@localhost:5432/medflow_db` is the only application code change required. Alembic migrations are structured to run cleanly against PostgreSQL without schema redesign.

---

### ADR-002: Backend Framework — FastAPI with Pydantic v2

* **Context:** The backend requires high-performance asynchronous request handling, strict clinical data validation, automatic OpenAPI/Swagger documentation, and clean dependency injection.
* **Decision:** Standardize on FastAPI (Python 3.12+) paired with Pydantic v2 and SQLAlchemy 2.0 (asyncio).
* **Alternatives Considered:**
  * *Django + Django REST Framework:* Provides an admin panel out of the box, but synchronous ORM defaults, heavy monolithic boilerplate, and rigid conventions make fine-grained API contracts and modern async workflows cumbersome.
  * *Flask:* Lightweight, but requires assembling disparate third-party libraries for validation, serialization, async support, and OpenAPI documentation, leading to fragile custom glue code.
  * *Express.js / NestJS:* Node.js is available, but Python was chosen for its healthcare analytics ecosystem, superior data-seeding libraries (`Faker`), and ease of future ML/clinical decision support integration.
* **Consequences:**
  * Built-in interactive API documentation at `/docs` (Swagger UI) and `/redoc` impresses academic evaluators.
  * Pydantic v2 provides compile-time-like validation speeds with C-based pydantic-core, catching malformed medical payloads before they reach the database.

---

### ADR-003: Frontend Architecture — React 18 with Vite (SPA)

* **Context:** The hospital staff dashboard requires instantaneous navigation between patient records, appointment schedules, clinical charts, and billing invoices without full-page reloads.
* **Decision:** Build a single-page application (SPA) using React 18, Vite 5, React Router v6, and native modern browser APIs.
* **Alternatives Considered:**
  * *Next.js (App Router / SSR):* Server-side rendering adds Node.js server dependencies, complex hybrid runtime environments, SSR hydration mismatch risks, and unnecessary overhead for an authenticated enterprise intranet portal where public SEO is irrelevant.
  * *Vanilla JavaScript / Multi-Page App (MPA):* Becomes difficult to maintain as state complexity increases (e.g., active patient context, clinical vitals live preview, tabbed patient charts).
* **Consequences:**
  * Lightning-fast Hot Module Replacement (HMR) during development via Vite.
  * Static build output (`frontend/dist`) can be served directly by FastAPI or any static web server for deployment.

---

### ADR-004: Styling Architecture — Vanilla CSS Design System with CSS Custom Properties

* **Context:** The UI must look premium, modern, accessible, and clean without looking like a cookie-cutter CSS framework demo, while adhering to the workspace web application development guidelines.
* **Decision:** Implement a centralized design system using pure Vanilla CSS, semantic HTML5 elements, CSS Custom Properties (variables), CSS Grid, and Flexbox (`frontend/src/styles/design-system.css`).
* **Alternatives Considered:**
  * *Tailwind CSS:* Adds build-step dependencies, configuration files, cryptic utility class clutter in JSX components, and requires explicit version confirmation.
  * *Bootstrap / Material UI (MUI):* Renders generic, dated, heavy component trees with difficult customization and large bundle footprints.
* **Consequences:**
  * Full control over cohesive design tokens (colors, elevation shadows, border radii, typography scale, spacing units).
  * Seamless native dark/light theme switching via `data-theme` attribute toggling without class renaming.
  * Zero runtime CSS-in-JS performance penalty.

---

### ADR-005: Authentication & Authorization — Stateless JWT with Role-Based Access Control (RBAC)

* **Context:** Hospital personnel have strictly defined legal roles (Doctor, Nurse, Receptionist, Pharmacist, Lab Technician, Billing Officer, Hospital Administrator, Patient).
* **Decision:** Implement standard JWT (JSON Web Tokens) with Argon2/bcrypt password hashing, short-lived access tokens (15-60 min), and secure refresh tokens. Enforce RBAC via FastAPI route dependencies and React route guard wrappers.
* **Role Hierarchy:**
  * `ADMIN`: System configuration, user provisioning, audit log inspection, hospital statistics.
  * `DOCTOR`: Clinical encounters, diagnosis entry, prescription writing, lab test orders, patient history viewing.
  * `NURSE`: Vitals recording, triage assessment, inpatient bed allocation, medication administration logs.
  * `RECEPTIONIST`: Patient registration, appointment scheduling, token generation, queue management.
  * `PHARMACIST`: Prescription fulfillment, drug inventory management, stock dispensation.
  * `BILLING_OFFICER`: Invoice generation, payment receipting, discount approvals, financial summaries.
  * `PATIENT`: Self-service portal to view personal medical history, past prescriptions, invoices, and schedule appointments.
* **Consequences:**
  * Clean separation of concerns. Unauthorized access attempts return HTTP `403 Forbidden` and log audit events.

---

### ADR-006: Monorepo Directory Organization

* **Context:** All code and documentation must reside inside the authoritative root `D:\hopital managment`.
* **Decision:** Organize the project as a cohesive dual-tier monorepo:
  ```text
  hopital managment/
  ├── backend/          # FastAPI application, models, migrations, seeds, tests
  ├── frontend/         # Vite + React application, components, state, styles
  ├── docs/             # Complete architectural and planning specifications
  └── scripts/          # PowerShell cross-platform lifecycle scripts
  ```
* **Rationale:** Eliminates multi-repository synchronization headaches, simplifies Git version control, and allows single-command startup scripts (`dev.ps1`, `setup.ps1`).

---

### ADR-007: Real-Time Updates — Graceful Polling with WebSockets Hook

* **Context:** Reception waiting queues and doctor consultation rooms need live status updates (e.g., patient checked in, called into room).
* **Decision:** Implement intelligent short-interval HTTP polling (with `SWR`-like stale-while-revalidate pattern or standard 5-10 second intervals) as the primary resilient mechanism, with a modular WebSocket service structure prepared for instant live push.
* **Rationale:** Polling is 100% reliable across all network proxies, localhost Windows firewall configurations, and browser variants without WebSocket handshake failures or reconnection state bugs during academic presentations.

---

## 3. Core System Assumptions

### 3.1. Development & Runtime Environment

1. **Host Operating System:** Windows 10/11 x64 running PowerShell 7 or Windows PowerShell 5.1.
2. **Runtime Toolchains:**
   * Python 3.12+ (verified 3.13.14 available on host) with `pip` and `venv`.
   * Node.js v20+ (verified v24.15.0 available on host) with `npm` and `npx`.
3. **Network & Ports:**
   * Backend API server: `http://localhost:8000`
   * Frontend Dev server: `http://localhost:5173`
   * Both ports are assumed available without conflicting background processes.
4. **Internet Connectivity:** Internet access is required during initial `pip install` and `npm install` package resolution. Once packages are installed, the application runs 100% offline without any cloud connectivity.
5. **No Paid Dependencies:** No paid third-party APIs (Stripe, Twilio, SendGrid, OpenAI, AWS) are required. All SMS/email notifications and payment gateways are cleanly mocked with local loggers and simulated confirmation dialogs.

---

### 3.2. Clinical & Operational Model

1. **Hospital Classification:** The application models a multi-specialty regional hospital with Outpatient Departments (OPD), Inpatient Wards (IPD), Emergency Triage, Diagnostic Services, Pharmacy, and Central Billing.
2. **Patient Identifier Scheme:** Each patient receives a deterministic, human-readable Medical Record Number (MRN) format: `MRN-YYYY-XXXXX` (e.g., `MRN-2026-00101`).
3. **Single Active Encounter Rule:** A patient can have at most one active clinical encounter (Consultation or Admission) at any given point in time to prevent conflicting clinical interventions.
4. **Prescription Immutability:** Once a prescription is dispensed by the pharmacy, it becomes an immutable legal medical record. Any corrections require a new amendment or cancellation entry with clinical notes.
5. **Synthetic Medical Data:** All sample data (patients, doctors, diagnoses, vitals, invoices) generated by seed scripts is entirely synthetic and compliant with simulated privacy standards.

---

## 4. Alternatives Considered and Rejected

| Area | Option Considered | Decision | Rationale for Rejection |
|------|-------------------|----------|-------------------------|
| **Database** | PostgreSQL / MySQL | Rejected for dev | Requires external daemon installation, Windows service setup, and credential management on student/evaluator machines. |
| **Database** | MongoDB / NoSQL | Rejected | Hospital workflows are intrinsically relational (foreign key integrity between patients, visits, bills, and prescriptions is non-negotiable). |
| **Backend** | Django + DRF | Rejected | Synchronous ORM bottleneck, heavy boilerplate, complex default auth models that resist custom medical role schemes. |
| **Frontend** | Next.js 14+ | Rejected | Server-side rendering overhead, unnecessary complexity for internal authenticated dashboard, potential Node server deployment issues. |
| **CSS** | Tailwind CSS | Rejected | Adds external build tooling, excessive utility class clutter, violates project preference for bespoke design tokens. |
| **CSS** | Bootstrap / Ant Design | Rejected | Generic appearance, rigid styling overrides, dated visual identity for academic showcase. |
| **State** | Redux Toolkit | Rejected | Excessive boilerplate for the required application scope; React Context + custom hooks provide clean, lightweight, maintainable state. |
| **Architecture** | Microservices | Rejected | Severe anti-pattern for an academic single-machine deployment; introduces distributed transaction failures, network latency, and operational complexity. |

---

## 5. Scope Boundaries and Deferred Features

### 5.1. Explicitly In-Scope (Milestones 1–7)

* **Authentication & Profiles:** Multi-role login, role-based dashboard redirection, password management, session persistence.
* **Patient Management:** Full demographic registration, MRN generation, emergency contacts, medical history tags, insurance details, search/filter table.
* **Appointment & Scheduling:** Doctor weekly schedule templates, slot booking, conflict prevention, cancellation/rescheduling, status tracking (`SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`).
* **Clinical Consultations & EHR:** Queue management, triage vitals recording (BP, HR, RR, Temp, SpO2, BMI), Chief Complaint, ICD-10 compatible diagnosis entry, clinical notes, digital prescriptions.
* **Pharmacy & Inventory:** Drug catalog, batch number and expiry tracking, minimum stock reorder alerts, prescription fulfillment workflow, stock decrementing.
* **Billing & Invoicing:** Automated itemized invoice creation from consultations, pharmacy, and bed charges; payment recording (Cash, Card, Insurance); receipt generation; printable thermal/A4 invoice views.
* **Reporting & Analytics:** Hospital KPI cards (Daily Revenue, Bed Occupancy, Patient Footfall, Top Diagnoses), interactive charts, audit logs, seed data reset utility.

---

### 5.2. Explicitly Deferred / Out-of-Scope (Future Evolution)

To maintain high polish, zero bugs, and realistic project scope, the following capabilities are deferred, with clean architectural extension points prepared:

1. **DICOM / PACS Medical Imaging Integration:**
   * *Status:* Deferred.
   * *Mitigation in v1:* Patient clinical records support standard document/image file attachments (PDF, PNG, JPEG) with file size validation.
2. **Live External Insurance Clearinghouse (HL7 / EDI 837):**
   * *Status:* Deferred.
   * *Mitigation in v1:* Realistic internal insurance claim generator modeling policy numbers, coverage percentages, co-pays, and claim adjudication statuses (`PENDING`, `APPROVED`, `REJECTED`).
3. **Hardware Device Integrations (Barcode Scanners, Biometric Sensors):**
   * *Status:* Deferred.
   * *Mitigation in v1:* Software-based keyboard/camera barcode string entry inputs and instant search lookup.
4. **Telemedicine / WebRTC Video Calling:**
   * *Status:* Deferred to v2.
   * *Mitigation in v1:* Appointment entity includes `consultation_type` enum (`IN_PERSON`, `TELEHEALTH`) and a placeholder meeting link field.
5. **AI / LLM Clinical Diagnostics:**
   * *Status:* Explicitly excluded per project specification.
   * *Mitigation:* The system uses deterministic clinical business rules, standard ICD-10 diagnosis codes, and structured form validation.

---

## 6. Risk Registry and Mitigation Strategies

| Risk ID | Risk Description | Severity | Probability | Mitigation Strategy |
|---------|------------------|----------|-------------|---------------------|
| **RSK-01** | SQLite database file locking under concurrent requests | Medium | Low | Enable WAL mode; configure 30s busy timeout in SQLite connection URI; single-evaluator usage pattern. |
| **RSK-02** | Python 3.13 package binary wheel compatibility | Medium | Low | Strict version pinning in `backend/requirements.txt` using pure-Python or pre-compiled wheels tested on Python 3.12/3.13. |
| **RSK-03** | Port conflict (8000 or 5173 occupied on host machine) | Low | Medium | Environment variable override support (`PORT`, `VITE_PORT`); startup script checks port availability and displays helpful error. |
| **RSK-04** | Windows PowerShell script execution policy restrictions | Medium | High | Startup scripts documented with `powershell -ExecutionPolicy Bypass -File ./scripts/dev.ps1` fallback command. |
| **RSK-05** | Evaluator presentation failure due to empty database | High | Low | Robust database seeder (`python -m backend.seeds.seed_all`) populates 50+ realistic patients, 12 doctors, appointments, inventory, and historical bills automatically. |
| **RSK-06** | Browser zoom or viewport mismatch on demonstration screen | Low | Medium | Responsive fluid CSS design system tested from 1280px (laptop) up to 2560px (4K monitor) with clean CSS Grid layouts. |

---

## 7. Reversibility and Evolution Roadmap

1. **Upgrading to PostgreSQL:**
   * Install `asyncpg` and `psycopg2-binary`.
   * Update `DATABASE_URL` in `backend/.env`.
   * Run `alembic upgrade head`. Zero model alterations required.
2. **Containerization with Docker:**
   * Multi-stage `Dockerfile` for backend (Python slim) and frontend (Nginx alpine).
   * `docker-compose.yml` linking FastAPI, PostgreSQL, and Nginx reverse proxy on port 80.
3. **Production Deployment:**
   * Frontend: Build static assets via `npm run build` and serve via CDN or Nginx.
   * Backend: Run with Gunicorn + Uvicorn workers (`gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app`).
