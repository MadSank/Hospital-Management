# MedFlow Hospital Management System (HMS)

> **Academic Healthcare Informatics Platform**  
> Built with FastAPI, SQLite (WAL mode), SQLAlchemy 2.0, React 18, TypeScript, and Vite.

---

## 1. System Overview

MedFlow HMS is an enterprise-patterned clinical and hospital administration platform designed for high-fidelity academic evaluation. It features asynchronous REST APIs, strict schema validation via Pydantic v2, an in-memory test harness, and a bespoke medical design system.

---

## 2. Prerequisites

The application runs natively on Windows 10/11 without requiring Docker or WSL:

* **Python:** 3.12+ (verified on host with Python 3.13.14)
* **Node.js:** v20+ (verified on host with Node v24.15.0)
* **npm:** 10+ (verified on host with npm 11.12.1)
* **Shell:** Windows PowerShell 5.1 or PowerShell 7+

---

## 3. Quick-Start (One-Command Setup)

Run the automated setup script from the project root:

```powershell
.\scripts\setup.ps1
```

This script will:
1. Create the backend Python virtual environment (`backend/.venv`).
2. Install all required Python packages.
3. Apply database migrations to head via Alembic (`backend/alembic`).
4. Seed the database with roles and demo user accounts (`backend/seed.py`).
5. Install all frontend npm dependencies and compile the TypeScript build.

---

## 4. Launching Development Servers

Run the startup script:

```powershell
.\scripts\start.ps1
```

Or start the servers manually in separate terminal windows:

### Terminal 1 — Backend API (FastAPI)
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```
* **API Base URL:** `http://localhost:8000/api`
* **Interactive Swagger UI:** `http://localhost:8000/docs`
* **ReDoc Documentation:** `http://localhost:8000/redoc`
* **Health Check:** `http://localhost:8000/health`

### Terminal 2 — Frontend Application (Vite + React)
```powershell
cd frontend
npm run dev
```
* **Web Application:** `http://localhost:5173`

---

## 5. Pre-Seeded Demo Accounts for Evaluation

The database is pre-seeded with synthetic accounts representing each institutional role:

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Administrator** | `admin@medflow.com` | `Admin@123` | System management, user provisioning, audit inspection |
| **Doctor** | `doctor@medflow.com` | `Doctor@123` | Consultations, triage vitals, diagnoses, prescriptions |
| **Receptionist** | `receptionist@medflow.com` | `Reception@123` | Patient registration, scheduling, front desk intake |
| **Nurse** | `nurse@medflow.com` | `Nurse@123` | Triage assessment, inpatient bed monitoring |
| **Pharmacist** | `pharmacist@medflow.com` | `Pharm@123` | Prescription dispensing, medicine inventory |
| **Lab Technician** | `lab@medflow.com` | `Lab@123` | Diagnostic investigations, lab order results |
| **Patient** | `patient@medflow.com` | `Patient@123` | Patient self-service portal, medical history |
| **Disabled Account** | `disabled@medflow.com` | `Disabled@123` | Test account to verify rejection of deactivated users |

*Note: The login page includes one-click quick-fill pills for testing these roles directly.*

---

## 6. Database Management

* **Database Engine:** SQLite with Write-Ahead Logging (`WAL`), foreign key enforcement, and a 30-second busy timeout.
* **Migration Tool:** Alembic (`backend/alembic`).

### Common Database Commands:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1

# Apply migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "describe_changes"

# Reseed database
python seed.py
```

### Full Database Reset:
To purge the database file and recreate clean migrations + seed data:
```powershell
.\scripts\reset-db.ps1
```

---

## 7. Running Automated Tests

A comprehensive test suite verifies authentication, token expiration, disabled accounts, and role authorization using an isolated in-memory SQLite database:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest tests/ -v --tb=short
```

---

## 8. Environment Variables

All configuration is managed via `.env` files. Templates are provided at `.env.example` and `backend/.env.example`.

| Variable | Description | Default |
|---|---|---|
| `ENVIRONMENT` | Runtime mode (`development`, `production`) | `development` |
| `DEBUG` | Verbose debug logging | `True` |
| `API_V1_STR` | API route prefix | `/api` |
| `PROJECT_NAME` | Display system name | `MedFlow Hospital Management System` |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./medflow.db` |
| `SECRET_KEY` | JWT signing secret key | *(configured in .env)* |
| `ALGORITHM` | JWT hashing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifespan | `480` (8 hours) |
| `CORS_ORIGINS` | Permitted browser origins | `["http://localhost:5173"]` |

---

## 9. Security & Limitations

* **Passwords:** Hashed with `bcrypt` (12 rounds) and never stored in plaintext.
* **Tokens:** Signed JSON Web Tokens (JWT) with standard expiration and user identity claims.
* **Academic Scope:** The system runs locally using SQLite. All medical patient records, encounters, and doctor profiles are strictly synthetic.
