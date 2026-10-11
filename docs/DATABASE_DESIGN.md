# Database Design

## 1. Overview

- **RDBMS:** SQLite 3 with WAL mode enabled
- **ORM:** SQLAlchemy 2.0 (declarative mapping)
- **Migrations:** Alembic
- **Naming Convention:** snake_case for tables and columns
- **ID Strategy:** Auto-increment integer PKs + human-readable display IDs (e.g., `PAT-0001`)
- **Timestamps:** All tables include `created_at` and `updated_at` (UTC)
- **Soft Delete:** `is_active` boolean flag where appropriate (users, medicines); hard delete for transient data (notifications)
- **Monetary Values:** `DECIMAL(10, 2)` — stored as Python `Decimal`, never `float`

## 2. Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o| Patient : "patient_user"
    User ||--o| Staff : "staff_user"
    User }o--|| Role : "has_role"
    
    Staff }o--|| Department : "belongs_to"
    DoctorAvailability }o--|| Staff : "doctor"
    
    Patient ||--o{ EmergencyContact : "has"
    Patient ||--o{ Appointment : "patient"
    Staff ||--o{ Appointment : "doctor"
    
    Appointment ||--o| Encounter : "from_appointment"
    Patient ||--o{ Encounter : "patient"
    Staff ||--o{ Encounter : "doctor"
    
    Encounter ||--o{ Vitals : "has"
    Encounter ||--o{ Diagnosis : "has"
    Encounter ||--o{ Prescription : "from"
    Encounter ||--o{ LabOrder : "from"
    
    Prescription ||--o{ PrescriptionItem : "contains"
    PrescriptionItem }o--|| Medicine : "for_medicine"
    
    Medicine ||--o{ MedicineBatch : "has_batches"
    Medicine ||--o{ StockMovement : "movements"
    
    LabOrder ||--o{ LabOrderItem : "contains"
    LabOrderItem }o--|| LabTest : "test_type"
    LabOrderItem ||--o| LabSample : "sample"
    LabOrderItem ||--o| LabResult : "result"
    
    Ward ||--o{ Bed : "contains"
    Bed ||--o{ Admission : "assigned"
    Patient ||--o{ Admission : "patient"
    Staff ||--o{ Admission : "admitting_doctor"
    
    Patient ||--o{ Invoice : "patient"
    Invoice ||--o{ InvoiceItem : "contains"
    Invoice ||--o{ Payment : "payments"
    
    User ||--o{ Notification : "recipient"
    User ||--o{ AuditLog : "actor"
```

## 3. Table Definitions

### 3.1 `roles`

Stores the fixed set of application roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Primary key |
| name | VARCHAR(50) | UNIQUE, NOT NULL | Role name: `admin`, `doctor`, `receptionist`, `nurse`, `pharmacist`, `lab_technician`, `patient` |
| display_name | VARCHAR(100) | NOT NULL | Human-readable: "Administrator", "Doctor", etc. |
| description | TEXT | | Role description |
| created_at | DATETIME | NOT NULL, DEFAULT UTC_NOW | |

**Indexes:** UNIQUE on `name`

---

### 3.2 `users`

Authentication identity. Every person who logs in has exactly one user record.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | Primary key |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| role_id | INTEGER | FK → roles.id, NOT NULL | User's role |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft disable |
| last_login_at | DATETIME | | Last successful login |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:** UNIQUE on `email`; INDEX on `role_id`

---

### 3.3 `patients`

Patient demographic and medical profile. Linked 1:1 with a `users` record (optional — patient may not have a login).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| user_id | INTEGER | FK → users.id, UNIQUE, NULLABLE | Login account (optional) |
| patient_uid | VARCHAR(20) | UNIQUE, NOT NULL | Display ID: `PAT-0001` |
| first_name | VARCHAR(100) | NOT NULL | |
| last_name | VARCHAR(100) | NOT NULL | |
| date_of_birth | DATE | NOT NULL | |
| gender | VARCHAR(20) | NOT NULL | `male`, `female`, `other` |
| blood_group | VARCHAR(5) | | `A+`, `B-`, `O+`, `AB+`, etc. |
| phone | VARCHAR(20) | NOT NULL | |
| email | VARCHAR(255) | | Contact email (may differ from login) |
| address | TEXT | | |
| city | VARCHAR(100) | | |
| state | VARCHAR(100) | | |
| zip_code | VARCHAR(20) | | |
| allergies | TEXT | | Comma-separated or free text |
| medical_history | TEXT | | Relevant past conditions |
| notes | TEXT | | Administrative notes |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:** UNIQUE on `patient_uid`; INDEX on `last_name, first_name`; INDEX on `phone`

---

### 3.4 `emergency_contacts`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| patient_id | INTEGER | FK → patients.id, NOT NULL | |
| name | VARCHAR(200) | NOT NULL | |
| relationship | VARCHAR(50) | NOT NULL | |
| phone | VARCHAR(20) | NOT NULL | |
| created_at | DATETIME | NOT NULL | |

---

### 3.5 `departments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| name | VARCHAR(100) | UNIQUE, NOT NULL | e.g., "Cardiology", "Orthopedics" |
| description | TEXT | | |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

---

### 3.6 `staff`

Staff profile. Linked 1:1 with a `users` record.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| user_id | INTEGER | FK → users.id, UNIQUE, NOT NULL | |
| staff_uid | VARCHAR(20) | UNIQUE, NOT NULL | `STF-0001` |
| first_name | VARCHAR(100) | NOT NULL | |
| last_name | VARCHAR(100) | NOT NULL | |
| department_id | INTEGER | FK → departments.id, NULLABLE | |
| specialty | VARCHAR(100) | | Doctor specialty |
| qualification | VARCHAR(200) | | Degrees/certifications |
| phone | VARCHAR(20) | NOT NULL | |
| hire_date | DATE | | |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:** INDEX on `department_id`; INDEX on `last_name, first_name`

---

### 3.7 `doctor_availability`

Weekly recurring schedule slots for doctors.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| doctor_id | INTEGER | FK → staff.id, NOT NULL | Must be a doctor role |
| day_of_week | INTEGER | NOT NULL, CHECK 0-6 | 0=Monday, 6=Sunday |
| start_time | TIME | NOT NULL | |
| end_time | TIME | NOT NULL | |
| slot_duration_minutes | INTEGER | NOT NULL, DEFAULT 30 | |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| created_at | DATETIME | NOT NULL | |

**Constraints:** CHECK `end_time > start_time`; UNIQUE on `(doctor_id, day_of_week, start_time)`

---

### 3.8 `appointments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| appointment_uid | VARCHAR(20) | UNIQUE, NOT NULL | `APT-0001` |
| patient_id | INTEGER | FK → patients.id, NOT NULL | |
| doctor_id | INTEGER | FK → staff.id, NOT NULL | |
| scheduled_date | DATE | NOT NULL | |
| scheduled_time | TIME | NOT NULL | |
| end_time | TIME | NOT NULL | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'scheduled' | See lifecycle below |
| type | VARCHAR(50) | NOT NULL, DEFAULT 'consultation' | `consultation`, `follow_up`, `emergency` |
| reason | TEXT | | Reason for visit |
| cancellation_reason | TEXT | | If cancelled |
| notes | TEXT | | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Status lifecycle:** `scheduled` → `checked_in` → `in_progress` → `completed` | `cancelled` | `no_show`

**Indexes:** INDEX on `(doctor_id, scheduled_date, scheduled_time)` for conflict detection; INDEX on `(patient_id, scheduled_date)`; INDEX on `status`

**Constraint:** No two non-cancelled appointments for the same doctor with overlapping time ranges on the same date (enforced in service layer due to SQLite limitations).

---

### 3.9 `encounters`

A clinical visit/consultation record.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| encounter_uid | VARCHAR(20) | UNIQUE, NOT NULL | `ENC-0001` |
| patient_id | INTEGER | FK → patients.id, NOT NULL | |
| doctor_id | INTEGER | FK → staff.id, NOT NULL | |
| appointment_id | INTEGER | FK → appointments.id, NULLABLE, UNIQUE | May be a walk-in |
| encounter_date | DATETIME | NOT NULL | |
| chief_complaint | TEXT | | Primary symptoms |
| history_of_present_illness | TEXT | | |
| examination_notes | TEXT | | Physical examination |
| assessment | TEXT | | Doctor's assessment |
| treatment_plan | TEXT | | |
| follow_up_date | DATE | | |
| follow_up_notes | TEXT | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'in_progress' | `in_progress`, `completed` |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

---

### 3.10 `vitals`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| encounter_id | INTEGER | FK → encounters.id, NOT NULL | |
| recorded_by | INTEGER | FK → staff.id, NOT NULL | Nurse or doctor |
| temperature_f | DECIMAL(5,2) | | Fahrenheit |
| blood_pressure_systolic | INTEGER | | mmHg |
| blood_pressure_diastolic | INTEGER | | mmHg |
| heart_rate | INTEGER | | bpm |
| respiratory_rate | INTEGER | | breaths/min |
| oxygen_saturation | DECIMAL(5,2) | | SpO2 % |
| weight_kg | DECIMAL(5,2) | | |
| height_cm | DECIMAL(5,2) | | |
| notes | TEXT | | |
| recorded_at | DATETIME | NOT NULL | |
| created_at | DATETIME | NOT NULL | |

---

### 3.11 `diagnoses`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| encounter_id | INTEGER | FK → encounters.id, NOT NULL | |
| diagnosis_code | VARCHAR(20) | | ICD-10 code (optional for academic) |
| diagnosis_name | VARCHAR(255) | NOT NULL | |
| diagnosis_type | VARCHAR(20) | NOT NULL, DEFAULT 'primary' | `primary`, `secondary` |
| notes | TEXT | | |
| created_at | DATETIME | NOT NULL | |

---

### 3.12 `prescriptions`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| prescription_uid | VARCHAR(20) | UNIQUE, NOT NULL | `PRE-0001` |
| encounter_id | INTEGER | FK → encounters.id, NOT NULL | |
| patient_id | INTEGER | FK → patients.id, NOT NULL | |
| doctor_id | INTEGER | FK → staff.id, NOT NULL | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | `pending`, `dispensed`, `partially_dispensed`, `cancelled` |
| notes | TEXT | | |
| prescribed_date | DATETIME | NOT NULL | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

---

### 3.13 `prescription_items`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| prescription_id | INTEGER | FK → prescriptions.id, NOT NULL | |
| medicine_id | INTEGER | FK → medicines.id, NOT NULL | |
| dosage | VARCHAR(50) | NOT NULL | e.g., "500mg" |
| frequency | VARCHAR(50) | NOT NULL | e.g., "3 times daily" |
| route | VARCHAR(50) | NOT NULL, DEFAULT 'oral' | `oral`, `iv`, `im`, `topical`, `inhaled` |
| duration | VARCHAR(50) | NOT NULL | e.g., "7 days" |
| quantity | INTEGER | NOT NULL | Total units to dispense |
| instructions | TEXT | | e.g., "Take after meals" |
| is_dispensed | BOOLEAN | NOT NULL, DEFAULT FALSE | |
| dispensed_quantity | INTEGER | NOT NULL, DEFAULT 0 | |
| created_at | DATETIME | NOT NULL | |

---

### 3.14 `medicines`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| medicine_uid | VARCHAR(20) | UNIQUE, NOT NULL | `MED-0001` |
| name | VARCHAR(200) | NOT NULL | |
| generic_name | VARCHAR(200) | | |
| category | VARCHAR(100) | | e.g., "Antibiotic", "Analgesic" |
| form | VARCHAR(50) | NOT NULL | `tablet`, `capsule`, `syrup`, `injection`, `cream`, `drops` |
| strength | VARCHAR(50) | | e.g., "500mg", "250mg/5ml" |
| manufacturer | VARCHAR(200) | | |
| unit_price | DECIMAL(10,2) | NOT NULL | Price per unit |
| reorder_level | INTEGER | NOT NULL, DEFAULT 50 | Low-stock alert threshold |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:** INDEX on `name`; INDEX on `category`

---

### 3.15 `medicine_batches`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| medicine_id | INTEGER | FK → medicines.id, NOT NULL | |
| batch_number | VARCHAR(50) | NOT NULL | |
| quantity_received | INTEGER | NOT NULL | |
| quantity_remaining | INTEGER | NOT NULL | |
| expiry_date | DATE | NOT NULL | |
| received_date | DATE | NOT NULL | |
| supplier | VARCHAR(200) | | |
| cost_per_unit | DECIMAL(10,2) | | Purchase cost |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Constraints:** CHECK `quantity_remaining >= 0`; UNIQUE on `(medicine_id, batch_number)`

---

### 3.16 `stock_movements`

Immutable audit trail of all inventory changes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| medicine_id | INTEGER | FK → medicines.id, NOT NULL | |
| batch_id | INTEGER | FK → medicine_batches.id, NULLABLE | |
| movement_type | VARCHAR(20) | NOT NULL | `receipt`, `dispensed`, `adjustment`, `expired`, `returned` |
| quantity | INTEGER | NOT NULL | Positive for in, negative for out |
| reference_type | VARCHAR(50) | | `prescription`, `manual_adjustment` |
| reference_id | INTEGER | | FK to source record |
| performed_by | INTEGER | FK → users.id, NOT NULL | |
| notes | TEXT | | |
| created_at | DATETIME | NOT NULL | |

---

### 3.17 `lab_tests`

Catalog of available laboratory tests.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| test_code | VARCHAR(20) | UNIQUE, NOT NULL | `LT-001` |
| name | VARCHAR(200) | NOT NULL | |
| category | VARCHAR(100) | | `hematology`, `biochemistry`, `microbiology`, `radiology` |
| description | TEXT | | |
| price | DECIMAL(10,2) | NOT NULL | |
| normal_range_min | DECIMAL(10,4) | | |
| normal_range_max | DECIMAL(10,4) | | |
| unit | VARCHAR(50) | | e.g., "mg/dL", "cells/μL" |
| turnaround_hours | INTEGER | DEFAULT 24 | Expected time |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

---

### 3.18 `lab_orders`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| order_uid | VARCHAR(20) | UNIQUE, NOT NULL | `LBO-0001` |
| encounter_id | INTEGER | FK → encounters.id, NOT NULL | |
| patient_id | INTEGER | FK → patients.id, NOT NULL | |
| ordered_by | INTEGER | FK → staff.id, NOT NULL | Doctor |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'ordered' | See lifecycle |
| priority | VARCHAR(20) | NOT NULL, DEFAULT 'routine' | `routine`, `urgent`, `stat` |
| clinical_notes | TEXT | | |
| ordered_at | DATETIME | NOT NULL | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Status lifecycle:** `ordered` → `sample_collected` → `processing` → `completed` | `cancelled`

---

### 3.19 `lab_order_items`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| lab_order_id | INTEGER | FK → lab_orders.id, NOT NULL | |
| lab_test_id | INTEGER | FK → lab_tests.id, NOT NULL | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'ordered' | Per-item status |
| created_at | DATETIME | NOT NULL | |

---

### 3.20 `lab_samples`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| lab_order_item_id | INTEGER | FK → lab_order_items.id, UNIQUE, NOT NULL | |
| sample_uid | VARCHAR(20) | UNIQUE, NOT NULL | `SAM-0001` |
| sample_type | VARCHAR(50) | | `blood`, `urine`, `stool`, `swab`, `tissue` |
| collected_by | INTEGER | FK → staff.id, NOT NULL | |
| collected_at | DATETIME | NOT NULL | |
| notes | TEXT | | |
| created_at | DATETIME | NOT NULL | |

---

### 3.21 `lab_results`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| lab_order_item_id | INTEGER | FK → lab_order_items.id, UNIQUE, NOT NULL | |
| result_value | VARCHAR(255) | | Numeric or text result |
| result_numeric | DECIMAL(10,4) | | For numeric comparison |
| unit | VARCHAR(50) | | |
| is_abnormal | BOOLEAN | DEFAULT FALSE | Auto-flagged against reference range |
| abnormal_flag | VARCHAR(20) | | `high`, `low`, `critical_high`, `critical_low` |
| notes | TEXT | | |
| performed_by | INTEGER | FK → staff.id, NOT NULL | Lab tech |
| verified_by | INTEGER | FK → staff.id, NULLABLE | Reviewing doctor/tech |
| performed_at | DATETIME | NOT NULL | |
| verified_at | DATETIME | | |
| created_at | DATETIME | NOT NULL | |

---

### 3.22 `wards`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| name | VARCHAR(100) | UNIQUE, NOT NULL | e.g., "General Ward A" |
| ward_type | VARCHAR(50) | NOT NULL | `general`, `private`, `icu`, `pediatric`, `maternity` |
| floor | VARCHAR(20) | | |
| capacity | INTEGER | NOT NULL | Total beds |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

---

### 3.23 `beds`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| ward_id | INTEGER | FK → wards.id, NOT NULL | |
| bed_number | VARCHAR(20) | NOT NULL | |
| bed_type | VARCHAR(50) | NOT NULL, DEFAULT 'standard' | `standard`, `electric`, `icu`, `crib` |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'available' | `available`, `occupied`, `maintenance`, `reserved` |
| daily_rate | DECIMAL(10,2) | NOT NULL | |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Constraints:** UNIQUE on `(ward_id, bed_number)`

---

### 3.24 `admissions`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| admission_uid | VARCHAR(20) | UNIQUE, NOT NULL | `ADM-0001` |
| patient_id | INTEGER | FK → patients.id, NOT NULL | |
| bed_id | INTEGER | FK → beds.id, NOT NULL | |
| admitting_doctor_id | INTEGER | FK → staff.id, NOT NULL | |
| admission_date | DATETIME | NOT NULL | |
| discharge_date | DATETIME | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'admitted' | `admitted`, `transferred`, `discharged` |
| reason | TEXT | NOT NULL | |
| discharge_summary | TEXT | | |
| discharge_notes | TEXT | | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Status lifecycle:** `admitted` → `transferred` (new admission created) | `discharged`

---

### 3.25 `invoices`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| invoice_uid | VARCHAR(20) | UNIQUE, NOT NULL | `INV-0001` |
| patient_id | INTEGER | FK → patients.id, NOT NULL | |
| subtotal | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | Sum of items |
| discount_amount | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | |
| tax_amount | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | |
| total_amount | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | subtotal - discount + tax |
| paid_amount | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | Sum of payments |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'draft' | `draft`, `issued`, `partially_paid`, `paid`, `cancelled` |
| discount_percent | DECIMAL(5,2) | DEFAULT 0 | |
| tax_percent | DECIMAL(5,2) | DEFAULT 0 | |
| notes | TEXT | | |
| issued_date | DATETIME | | |
| due_date | DATE | | |
| created_by | INTEGER | FK → users.id, NOT NULL | |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

---

### 3.26 `invoice_items`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| invoice_id | INTEGER | FK → invoices.id, NOT NULL | |
| item_type | VARCHAR(50) | NOT NULL | `consultation`, `lab_test`, `medicine`, `bed_charge`, `procedure`, `other` |
| description | VARCHAR(255) | NOT NULL | |
| reference_type | VARCHAR(50) | | Source entity type |
| reference_id | INTEGER | | Source entity ID |
| quantity | INTEGER | NOT NULL, DEFAULT 1 | |
| unit_price | DECIMAL(10,2) | NOT NULL | |
| total_price | DECIMAL(10,2) | NOT NULL | quantity × unit_price |
| created_at | DATETIME | NOT NULL | |

---

### 3.27 `payments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| payment_uid | VARCHAR(20) | UNIQUE, NOT NULL | `PAY-0001` |
| invoice_id | INTEGER | FK → invoices.id, NOT NULL | |
| amount | DECIMAL(10,2) | NOT NULL | |
| payment_method | VARCHAR(50) | NOT NULL | `cash`, `card`, `bank_transfer`, `insurance` |
| payment_date | DATETIME | NOT NULL | |
| reference_number | VARCHAR(100) | | Transaction ref |
| received_by | INTEGER | FK → users.id, NOT NULL | |
| notes | TEXT | | |
| created_at | DATETIME | NOT NULL | |

**Constraint:** CHECK `amount > 0`

---

### 3.28 `notifications`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| user_id | INTEGER | FK → users.id, NOT NULL | Recipient |
| title | VARCHAR(255) | NOT NULL | |
| message | TEXT | NOT NULL | |
| type | VARCHAR(50) | NOT NULL | `appointment`, `lab_result`, `pharmacy`, `system`, `alert` |
| reference_type | VARCHAR(50) | | Entity type for deep link |
| reference_id | INTEGER | | Entity ID for deep link |
| is_read | BOOLEAN | NOT NULL, DEFAULT FALSE | |
| created_at | DATETIME | NOT NULL | |

**Indexes:** INDEX on `(user_id, is_read, created_at)`

---

### 3.29 `audit_logs`

Immutable audit trail. No UPDATE or DELETE allowed on this table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO | |
| user_id | INTEGER | FK → users.id, NULLABLE | NULL for system events |
| action | VARCHAR(50) | NOT NULL | `login`, `login_failed`, `create`, `update`, `delete`, `dispense`, `discharge`, etc. |
| entity_type | VARCHAR(50) | NOT NULL | `patient`, `appointment`, `prescription`, etc. |
| entity_id | INTEGER | | |
| details | TEXT | | JSON string with change metadata |
| ip_address | VARCHAR(45) | | |
| created_at | DATETIME | NOT NULL | |

**Indexes:** INDEX on `(entity_type, entity_id)`; INDEX on `(user_id, created_at)`; INDEX on `action`

---

## 4. Concurrency and Transaction Strategy

### SQLite WAL Mode

Enable WAL (Write-Ahead Logging) at database connection time:

```python
# In database.py
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
```

### Critical Transaction Boundaries

#### Appointment Booking
1. Within a single transaction:
   - Query for conflicting appointments (same doctor, overlapping time, non-cancelled status).
   - If no conflict, INSERT the new appointment.
   - CREATE a notification for the patient and doctor.
2. If conflict detected, return 409 CONFLICT.

#### Pharmacy Dispensing
1. Within a single transaction:
   - Verify prescription status is `pending` or `partially_dispensed`.
   - Check batch stock (`quantity_remaining >= requested`).
   - UPDATE `medicine_batches.quantity_remaining` (decrement).
   - INSERT `stock_movements` record.
   - UPDATE `prescription_items.is_dispensed` and `dispensed_quantity`.
   - UPDATE `prescription.status` based on all items.
2. If insufficient stock, return 400 with details.

#### Bed Allocation
1. Within a single transaction:
   - Verify bed status is `available`.
   - UPDATE bed status to `occupied`.
   - INSERT admission record.
2. If bed is not available, return 409 CONFLICT.

#### Payment Recording
1. Within a single transaction:
   - Verify invoice exists and is not cancelled.
   - Verify payment amount <= remaining balance.
   - INSERT payment record.
   - UPDATE `invoice.paid_amount`.
   - UPDATE `invoice.status` (if `paid_amount >= total_amount`, set to `paid`; else `partially_paid`).
2. Prevent duplicate payments via idempotency key or UI-level double-click protection.

#### Invoice Generation
1. Within a single transaction:
   - Calculate all line items from encounters, prescriptions, lab orders, bed charges.
   - INSERT invoice and all invoice_items.
   - Calculate and set `subtotal`, `tax_amount`, `discount_amount`, `total_amount`.
2. All monetary calculations use Python `Decimal`, never `float`.

## 5. UID Generation Strategy

Display UIDs (e.g., `PAT-0001`) are generated in Python:

```python
def generate_uid(prefix: str, sequence: int) -> str:
    return f"{prefix}-{sequence:04d}"
```

The sequence is derived from `MAX(id) + 1` for the table, queried within the creation transaction. This is sufficient for a single-user academic system.

## 6. Seed Data Strategy

The `seed.py` script creates:

| Entity | Count | Notes |
|--------|-------|-------|
| Roles | 7 | Fixed set |
| Admin user | 1 | admin@medflow.com / Admin@123 |
| Departments | 8 | Cardiology, Orthopedics, Pediatrics, etc. |
| Doctors | 6 | 2-3 per department, with availability |
| Nurses | 4 | Across departments |
| Receptionists | 2 | |
| Pharmacists | 2 | |
| Lab Technicians | 2 | |
| Patients | 20 | With emergency contacts |
| Medicines | 30 | Common medications with batches |
| Lab Tests | 15 | Common diagnostic tests |
| Wards | 4 | General, Private, ICU, Pediatric |
| Beds | 20 | 5 per ward |
| Sample appointments | 15 | Various statuses |
| Sample encounters | 8 | With vitals and diagnoses |
| Sample prescriptions | 5 | |
| Sample invoices | 5 | Various payment states |

All demo passwords follow the pattern: `[Role]@123` (e.g., `Doctor@123`, `Patient@123`).

> ⚠️ **These are demo credentials only.** A production system would require unique, strong passwords and a secure onboarding process.

## 7. Migration Strategy

### Initial Setup
```powershell
cd backend
python -m alembic init alembic    # One-time
python -m alembic revision --autogenerate -m "initial schema"
python -m alembic upgrade head
python seed.py
```

### Adding New Migrations
```powershell
cd backend
python -m alembic revision --autogenerate -m "description of change"
python -m alembic upgrade head
```

### Database Reset
```powershell
# Delete the database file and re-run migrations + seed
del backend\medflow.db
cd backend
python -m alembic upgrade head
python seed.py
```

## 8. PostgreSQL Migration Path

When migrating to PostgreSQL:

1. Update `.env`: change `DATABASE_URL` from `sqlite:///./medflow.db` to `postgresql://user:pass@host:port/medflow`.
2. Install `psycopg2-binary` via pip.
3. Replace SQLite-specific PRAGMA with PostgreSQL equivalents (none needed — SQLAlchemy handles it).
4. Re-run `alembic upgrade head` against the PostgreSQL database.
5. Run `seed.py` to populate.

SQLAlchemy type mappings that need attention:
- `BOOLEAN` → native in both (SQLite stores as INTEGER, PostgreSQL as BOOL).
- `DECIMAL` → native in both.
- `DATETIME` → native in both.
- `TEXT` → native in both.
- `JSON` for audit log details → Use `Text` with JSON serialization for SQLite compatibility; swap to native `JSON` column type for PostgreSQL.
