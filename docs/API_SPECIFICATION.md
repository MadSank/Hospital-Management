# API Specification

## 1. Conventions

### Base URL
```
http://localhost:8000/api
```

### Authentication
All endpoints except `POST /api/auth/login` require a JWT bearer token:
```
Authorization: Bearer <access_token>
```

### Request/Response Format
- Content-Type: `application/json`
- All dates: ISO 8601 (`2026-01-15`)
- All datetimes: ISO 8601 with timezone (`2026-01-15T10:30:00Z`)
- All times: 24-hour format (`09:30`)
- All monetary values: String representation of decimal (`"150.00"`) in responses
- All IDs: Integer (internal), String UID (display: `PAT-0001`)

### Pagination
All list endpoints support pagination:
```
GET /api/patients?page=1&per_page=20
```

Response includes:
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "per_page": 20,
  "pages": 8
}
```

### Filtering & Sorting
```
GET /api/patients?search=john&sort_by=last_name&sort_order=asc&status=active
```

### Error Response Format
```json
{
  "detail": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "field": "field_name",
    "context": {}
  }
}
```

For validation errors (422):
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## 2. Authentication (`/api/auth`)

### POST `/api/auth/login`
**Auth:** None  
**Roles:** Any

**Request:**
```json
{
  "email": "admin@medflow.com",
  "password": "Admin@123"
}
```

**Response 200:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "admin@medflow.com",
    "role": "admin",
    "role_display": "Administrator",
    "full_name": "System Administrator",
    "is_active": true
  }
}
```

**Errors:** 401 (invalid credentials), 403 (account disabled)

---

### GET `/api/auth/me`
**Auth:** Required  
**Roles:** Any

**Response 200:**
```json
{
  "id": 1,
  "email": "admin@medflow.com",
  "role": "admin",
  "role_display": "Administrator",
  "full_name": "System Administrator",
  "is_active": true,
  "profile_id": null,
  "staff_id": null,
  "patient_id": null
}
```

---

### POST `/api/auth/change-password`
**Auth:** Required  
**Roles:** Any

**Request:**
```json
{
  "current_password": "Admin@123",
  "new_password": "NewAdmin@456"
}
```

**Response 200:** `{ "message": "Password changed successfully" }`  
**Errors:** 400 (current password incorrect), 422 (weak password)

---

## 3. Patients (`/api/patients`)

### GET `/api/patients`
**Auth:** Required  
**Roles:** Admin, Doctor, Receptionist, Nurse

**Query params:** `search`, `gender`, `blood_group`, `is_active`, `page`, `per_page`, `sort_by`, `sort_order`

**Response 200:**
```json
{
  "items": [
    {
      "id": 1,
      "patient_uid": "PAT-0001",
      "first_name": "Rahul",
      "last_name": "Sharma",
      "date_of_birth": "1990-05-15",
      "gender": "male",
      "blood_group": "B+",
      "phone": "+91-9876543210",
      "email": "rahul.sharma@email.com",
      "city": "Mumbai",
      "is_active": true,
      "created_at": "2026-01-10T08:00:00Z"
    }
  ],
  "total": 20,
  "page": 1,
  "per_page": 20,
  "pages": 1
}
```

---

### GET `/api/patients/{id}`
**Auth:** Required  
**Roles:** Admin, Doctor (assigned), Receptionist, Nurse (assigned), Patient (own)

**Response 200:**
```json
{
  "id": 1,
  "patient_uid": "PAT-0001",
  "first_name": "Rahul",
  "last_name": "Sharma",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "blood_group": "B+",
  "phone": "+91-9876543210",
  "email": "rahul.sharma@email.com",
  "address": "123 Marine Drive",
  "city": "Mumbai",
  "state": "Maharashtra",
  "zip_code": "400001",
  "allergies": "Penicillin, Dust",
  "medical_history": "Type 2 Diabetes (2020)",
  "notes": "",
  "is_active": true,
  "emergency_contacts": [
    {
      "id": 1,
      "name": "Priya Sharma",
      "relationship": "Spouse",
      "phone": "+91-9876543211"
    }
  ],
  "created_at": "2026-01-10T08:00:00Z",
  "updated_at": "2026-01-10T08:00:00Z"
}
```

---

### POST `/api/patients`
**Auth:** Required  
**Roles:** Admin, Receptionist

**Request:**
```json
{
  "first_name": "Rahul",
  "last_name": "Sharma",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "blood_group": "B+",
  "phone": "+91-9876543210",
  "email": "rahul.sharma@email.com",
  "address": "123 Marine Drive",
  "city": "Mumbai",
  "state": "Maharashtra",
  "zip_code": "400001",
  "allergies": "Penicillin, Dust",
  "medical_history": "Type 2 Diabetes (2020)",
  "emergency_contacts": [
    {
      "name": "Priya Sharma",
      "relationship": "Spouse",
      "phone": "+91-9876543211"
    }
  ],
  "create_login": false
}
```

**Validation:**
- `first_name`: required, 1-100 chars
- `last_name`: required, 1-100 chars
- `date_of_birth`: required, must be in the past
- `gender`: required, one of `male`, `female`, `other`
- `blood_group`: optional, one of `A+`, `A-`, `B+`, `B-`, `O+`, `O-`, `AB+`, `AB-`
- `phone`: required, valid phone format
- `email`: optional, valid email format

**Response 201:** Full patient object  
**Errors:** 400 (validation), 409 (duplicate phone/email)

---

### PUT `/api/patients/{id}`
**Auth:** Required  
**Roles:** Admin, Receptionist, Patient (own limited fields)

**Request:** Same as POST (partial update allowed)  
**Response 200:** Updated patient object  
**Errors:** 400, 404, 403

---

### GET `/api/patients/{id}/encounters`
**Auth:** Required  
**Roles:** Admin, Doctor (assigned), Nurse (assigned), Patient (own)

**Response 200:** Paginated list of encounters for the patient.

---

### GET `/api/patients/{id}/appointments`
**Auth:** Required  
**Roles:** Admin, Doctor (assigned), Receptionist, Nurse (assigned), Patient (own)

**Response 200:** Paginated list of appointments for the patient.

---

### GET `/api/patients/{id}/invoices`
**Auth:** Required  
**Roles:** Admin, Receptionist, Patient (own)

**Response 200:** Paginated list of invoices for the patient.

---

## 4. Staff (`/api/staff`)

### GET `/api/staff`
**Auth:** Required  
**Roles:** Admin

**Query params:** `search`, `department_id`, `role`, `is_active`, `page`, `per_page`

**Response 200:** Paginated list of staff members with department and role info.

---

### GET `/api/staff/{id}`
**Auth:** Required  
**Roles:** Admin, Self

**Response 200:** Full staff profile with department, role, and availability.

---

### POST `/api/staff`
**Auth:** Required  
**Roles:** Admin

**Request:**
```json
{
  "email": "dr.patel@medflow.com",
  "password": "Doctor@123",
  "role": "doctor",
  "first_name": "Amit",
  "last_name": "Patel",
  "department_id": 1,
  "specialty": "Interventional Cardiology",
  "qualification": "MD, DM Cardiology",
  "phone": "+91-9876543220",
  "hire_date": "2025-06-01"
}
```

**Response 201:** Full staff object  
**Errors:** 400, 409 (duplicate email)

---

### PUT `/api/staff/{id}`
**Auth:** Required  
**Roles:** Admin

**Response 200:** Updated staff object.

---

## 5. Departments (`/api/departments`)

### GET `/api/departments`
**Auth:** Required  
**Roles:** Any authenticated

**Response 200:** List of departments with doctor counts.

---

### POST `/api/departments`
**Auth:** Required  
**Roles:** Admin

**Request:** `{ "name": "Cardiology", "description": "Heart and vascular care" }`  
**Response 201:** Department object  
**Errors:** 409 (duplicate name)

---

### PUT `/api/departments/{id}`
**Auth:** Required  
**Roles:** Admin

---

## 6. Doctor Availability (`/api/staff/{doctor_id}/availability`)

### GET `/api/staff/{doctor_id}/availability`
**Auth:** Required  
**Roles:** Any authenticated

**Response 200:**
```json
[
  {
    "id": 1,
    "day_of_week": 0,
    "day_name": "Monday",
    "start_time": "09:00",
    "end_time": "13:00",
    "slot_duration_minutes": 30,
    "is_active": true
  }
]
```

---

### GET `/api/staff/{doctor_id}/available-slots?date=2026-01-15`
**Auth:** Required  
**Roles:** Any authenticated

Returns available time slots for a specific date, excluding already-booked slots.

**Response 200:**
```json
{
  "doctor_id": 1,
  "date": "2026-01-15",
  "slots": [
    { "start_time": "09:00", "end_time": "09:30", "available": true },
    { "start_time": "09:30", "end_time": "10:00", "available": false },
    { "start_time": "10:00", "end_time": "10:30", "available": true }
  ]
}
```

---

### POST `/api/staff/{doctor_id}/availability`
**Auth:** Required  
**Roles:** Admin, Doctor (own)

---

## 7. Appointments (`/api/appointments`)

### GET `/api/appointments`
**Auth:** Required  
**Roles:** Admin (all), Doctor (own), Receptionist (all), Nurse (all), Patient (own)

**Query params:** `date`, `date_from`, `date_to`, `doctor_id`, `patient_id`, `status`, `type`, `search`, `page`, `per_page`

**Response 200:** Paginated list with patient name, doctor name, status badge.

---

### GET `/api/appointments/{id}`
**Auth:** Required  
**Roles:** Admin, Doctor (own), Receptionist, Nurse, Patient (own)

**Response 200:** Full appointment object with nested patient and doctor summary.

---

### POST `/api/appointments`
**Auth:** Required  
**Roles:** Admin, Doctor, Receptionist, Patient (own)

**Request:**
```json
{
  "patient_id": 1,
  "doctor_id": 3,
  "scheduled_date": "2026-01-20",
  "scheduled_time": "10:00",
  "type": "consultation",
  "reason": "Annual checkup"
}
```

`end_time` is auto-calculated from the doctor's `slot_duration_minutes`.

**Validation:**
- Date must be today or future.
- Time must fall within the doctor's availability for the given day of week.
- No overlapping appointment for the same doctor (non-cancelled).
- Patient must not have another appointment at the same time.

**Response 201:** Appointment object  
**Side effects:** Notification created for patient and doctor  
**Errors:** 400 (validation), 409 (conflict)

---

### PATCH `/api/appointments/{id}/status`
**Auth:** Required  
**Roles:** Varies by transition

**Request:**
```json
{
  "status": "checked_in"
}
```

**Valid transitions:**
| From | To | Allowed Roles |
|------|----|---------------|
| scheduled | checked_in | Admin, Receptionist, Nurse |
| scheduled | cancelled | Admin, Receptionist, Doctor, Patient (own) |
| checked_in | in_progress | Admin, Doctor (own) |
| in_progress | completed | Admin, Doctor (own) |
| scheduled | no_show | Admin, Receptionist |

Cancellation requires `cancellation_reason` in request body.

**Response 200:** Updated appointment  
**Errors:** 400 (invalid transition), 403 (not authorized)

---

### PUT `/api/appointments/{id}`
**Auth:** Required  
**Roles:** Admin, Receptionist, Doctor (own)

Reschedule: update `scheduled_date`, `scheduled_time`, `doctor_id`.
Same conflict validation as creation.

**Side effects:** Notification created for patient and doctor about reschedule.

---

### GET `/api/appointments/today`
**Auth:** Required  
**Roles:** Admin, Doctor (own), Receptionist, Nurse

**Response 200:** List of today's appointments, ordered by time.

---

### GET `/api/appointments/queue`
**Auth:** Required  
**Roles:** Admin, Receptionist, Nurse, Doctor (own)

Returns checked-in patients waiting to be seen, ordered by check-in time.

---

## 8. Encounters (`/api/encounters`)

### POST `/api/encounters`
**Auth:** Required  
**Roles:** Doctor

**Request:**
```json
{
  "patient_id": 1,
  "appointment_id": 5,
  "chief_complaint": "Chest pain and shortness of breath",
  "history_of_present_illness": "Patient reports intermittent chest pain for 2 weeks",
  "examination_notes": "Heart sounds normal, lungs clear",
  "assessment": "Suspected angina, requires further evaluation",
  "treatment_plan": "Prescribe nitroglycerin, order ECG and stress test"
}
```

If `appointment_id` is provided, the appointment status is automatically set to `in_progress`.

**Response 201:** Encounter object  
**Errors:** 400, 403, 409 (appointment already has encounter)

---

### PUT `/api/encounters/{id}`
**Auth:** Required  
**Roles:** Doctor (own encounters only)

---

### PATCH `/api/encounters/{id}/complete`
**Auth:** Required  
**Roles:** Doctor (own)

Sets status to `completed`. Also sets associated appointment to `completed`.

---

### GET `/api/encounters/{id}`
**Auth:** Required  
**Roles:** Admin, Doctor (own or assigned), Nurse (assigned), Patient (own)

**Response 200:** Full encounter with vitals, diagnoses, prescriptions, lab orders.

---

## 9. Vitals (`/api/encounters/{encounter_id}/vitals`)

### POST `/api/encounters/{encounter_id}/vitals`
**Auth:** Required  
**Roles:** Doctor, Nurse

**Request:**
```json
{
  "temperature_f": 98.6,
  "blood_pressure_systolic": 120,
  "blood_pressure_diastolic": 80,
  "heart_rate": 72,
  "respiratory_rate": 16,
  "oxygen_saturation": 98.0,
  "weight_kg": 75.5,
  "height_cm": 170.0,
  "notes": ""
}
```

**Response 201:** Vitals object with `recorded_by` auto-set.

---

## 10. Diagnoses (`/api/encounters/{encounter_id}/diagnoses`)

### POST `/api/encounters/{encounter_id}/diagnoses`
**Auth:** Required  
**Roles:** Doctor

**Request:**
```json
{
  "diagnosis_name": "Unstable Angina",
  "diagnosis_code": "I20.0",
  "diagnosis_type": "primary",
  "notes": "Based on ECG findings and clinical presentation"
}
```

---

## 11. Prescriptions (`/api/prescriptions`)

### POST `/api/prescriptions`
**Auth:** Required  
**Roles:** Doctor

**Request:**
```json
{
  "encounter_id": 1,
  "patient_id": 1,
  "items": [
    {
      "medicine_id": 5,
      "dosage": "500mg",
      "frequency": "3 times daily",
      "route": "oral",
      "duration": "7 days",
      "quantity": 21,
      "instructions": "Take after meals"
    }
  ],
  "notes": "Complete the full course of antibiotics"
}
```

**Response 201:** Prescription with items and medicine names  
**Side effects:** Notification to pharmacist

---

### GET `/api/prescriptions`
**Auth:** Required  
**Roles:** Admin, Doctor (own), Pharmacist (all pending), Nurse, Patient (own)

**Query params:** `patient_id`, `status`, `date_from`, `date_to`, `page`, `per_page`

---

### GET `/api/prescriptions/{id}`
**Auth:** Required  
**Roles:** Admin, Doctor (own), Pharmacist, Nurse, Patient (own)

**Response 200:** Full prescription with items, medicine details, dispensing status.

---

### GET `/api/prescriptions/{id}/print`
**Auth:** Required  
**Roles:** Admin, Doctor (own), Pharmacist, Patient (own)

**Response 200:** Print-optimized prescription data (doctor info, patient info, items, date).

---

## 12. Pharmacy (`/api/pharmacy`)

### GET `/api/pharmacy/medicines`
**Auth:** Required  
**Roles:** Admin, Pharmacist, Doctor

**Query params:** `search`, `category`, `form`, `is_active`, `low_stock` (boolean), `page`, `per_page`

---

### POST `/api/pharmacy/medicines`
**Auth:** Required  
**Roles:** Admin, Pharmacist

**Request:**
```json
{
  "name": "Amoxicillin",
  "generic_name": "Amoxicillin Trihydrate",
  "category": "Antibiotic",
  "form": "capsule",
  "strength": "500mg",
  "manufacturer": "Cipla Ltd",
  "unit_price": "25.00",
  "reorder_level": 100
}
```

---

### POST `/api/pharmacy/medicines/{id}/batches`
**Auth:** Required  
**Roles:** Admin, Pharmacist

**Request:**
```json
{
  "batch_number": "BTH-2026-001",
  "quantity_received": 500,
  "expiry_date": "2027-06-30",
  "received_date": "2026-01-15",
  "supplier": "MedSupply Corp",
  "cost_per_unit": "18.00"
}
```

**Side effects:** Stock movement record created (`receipt` type).

---

### POST `/api/pharmacy/dispense`
**Auth:** Required  
**Roles:** Pharmacist

**Request:**
```json
{
  "prescription_id": 1,
  "items": [
    {
      "prescription_item_id": 1,
      "quantity": 21,
      "batch_id": 3
    }
  ]
}
```

**Validation:**
- Prescription must be `pending` or `partially_dispensed`.
- Batch must have sufficient `quantity_remaining`.
- Quantity must not exceed prescribed quantity minus already dispensed.

**Side effects:**
- Update batch `quantity_remaining`.
- Create stock movement (`dispensed`).
- Update prescription item `dispensed_quantity` and `is_dispensed`.
- Update prescription `status`.
- Create notification for patient.
- If medicine stock falls below `reorder_level`, create alert notification for pharmacists.

**Response 200:** Updated prescription  
**Errors:** 400 (insufficient stock), 409 (already fully dispensed)

---

### GET `/api/pharmacy/stock-alerts`
**Auth:** Required  
**Roles:** Admin, Pharmacist

**Response 200:**
```json
{
  "low_stock": [
    {
      "medicine_id": 5,
      "name": "Amoxicillin 500mg",
      "current_stock": 30,
      "reorder_level": 100
    }
  ],
  "expiring_soon": [
    {
      "medicine_id": 3,
      "name": "Paracetamol 500mg",
      "batch_number": "BTH-2025-010",
      "expiry_date": "2026-02-15",
      "quantity_remaining": 200
    }
  ]
}
```

`expiring_soon` = batches expiring within 90 days.

---

### GET `/api/pharmacy/stock-movements`
**Auth:** Required  
**Roles:** Admin, Pharmacist

**Query params:** `medicine_id`, `movement_type`, `date_from`, `date_to`, `page`, `per_page`

---

## 13. Laboratory (`/api/laboratory`)

### GET `/api/laboratory/tests`
**Auth:** Required  
**Roles:** Any authenticated

**Response 200:** List of available lab tests with prices and categories.

---

### POST `/api/laboratory/orders`
**Auth:** Required  
**Roles:** Doctor

**Request:**
```json
{
  "encounter_id": 1,
  "patient_id": 1,
  "priority": "routine",
  "clinical_notes": "Rule out infection",
  "items": [
    { "lab_test_id": 1 },
    { "lab_test_id": 5 }
  ]
}
```

**Response 201:** Lab order with items  
**Side effects:** Notification to lab technicians

---

### GET `/api/laboratory/orders`
**Auth:** Required  
**Roles:** Admin, Doctor (own orders), Lab Technician (all), Nurse, Patient (own)

**Query params:** `patient_id`, `status`, `priority`, `date_from`, `date_to`, `page`, `per_page`

---

### POST `/api/laboratory/orders/{order_id}/collect-sample`
**Auth:** Required  
**Roles:** Lab Technician, Nurse

**Request:**
```json
{
  "items": [
    {
      "lab_order_item_id": 1,
      "sample_type": "blood",
      "notes": "Fasting sample"
    }
  ]
}
```

**Side effects:** Update order status to `sample_collected`; create sample records.

---

### POST `/api/laboratory/orders/{order_id}/items/{item_id}/result`
**Auth:** Required  
**Roles:** Lab Technician

**Request:**
```json
{
  "result_value": "12.5",
  "result_numeric": 12.5,
  "unit": "g/dL",
  "notes": "Within normal range"
}
```

`is_abnormal` and `abnormal_flag` are auto-calculated by comparing `result_numeric` against the test's `normal_range_min` and `normal_range_max`.

---

### POST `/api/laboratory/orders/{order_id}/items/{item_id}/verify`
**Auth:** Required  
**Roles:** Doctor, Lab Technician (senior)

Sets `verified_by` and `verified_at`. When all items are verified, order status → `completed`.

**Side effects:** Notification to ordering doctor and patient.

---

### GET `/api/laboratory/orders/{order_id}/report`
**Auth:** Required  
**Roles:** Admin, Doctor (ordering), Lab Technician, Patient (own, only when completed)

**Response 200:** Print-optimized lab report data.

---

## 14. Wards & Beds (`/api/wards`)

### GET `/api/wards`
**Auth:** Required  
**Roles:** Admin, Doctor, Receptionist, Nurse

**Response 200:** List of wards with bed counts and occupancy.

---

### GET `/api/wards/{id}/beds`
**Auth:** Required  
**Roles:** Admin, Doctor, Receptionist, Nurse

**Response 200:** List of beds with status (available, occupied, maintenance).

---

### POST `/api/wards`
**Auth:** Required  
**Roles:** Admin

---

### POST `/api/wards/{ward_id}/beds`
**Auth:** Required  
**Roles:** Admin, Nurse

---

### PATCH `/api/wards/{ward_id}/beds/{bed_id}/status`
**Auth:** Required  
**Roles:** Admin, Nurse

**Request:** `{ "status": "maintenance" }`  
**Validation:** Cannot set to `available` if there's an active admission.

---

## 15. Admissions (`/api/admissions`)

### POST `/api/admissions`
**Auth:** Required  
**Roles:** Admin, Doctor, Receptionist, Nurse

**Request:**
```json
{
  "patient_id": 1,
  "bed_id": 5,
  "admitting_doctor_id": 3,
  "reason": "Post-surgery observation",
  "admission_date": "2026-01-20T14:00:00Z"
}
```

**Validation:**
- Bed must be `available`.
- Patient must not have an active admission already.

**Side effects:**
- Bed status → `occupied`.
- Notification to patient and doctor.

**Response 201:** Admission object  
**Errors:** 409 (bed occupied or patient already admitted)

---

### POST `/api/admissions/{id}/transfer`
**Auth:** Required  
**Roles:** Admin, Doctor, Nurse

**Request:** `{ "new_bed_id": 8, "reason": "Transfer to ICU" }`

**Side effects:**
- Old bed → `available`.
- New bed → `occupied`.
- Old admission status → `transferred`.
- New admission created.

---

### POST `/api/admissions/{id}/discharge`
**Auth:** Required  
**Roles:** Admin, Doctor

**Request:**
```json
{
  "discharge_summary": "Patient recovered well post appendectomy",
  "discharge_notes": "Follow up in 1 week"
}
```

**Side effects:**
- Bed status → `available`.
- Admission status → `discharged`.
- `discharge_date` set.
- Notification to patient.
- Auto-generate invoice for bed charges (days × daily_rate).

---

### GET `/api/admissions`
**Auth:** Required  
**Roles:** Admin, Doctor, Receptionist, Nurse

**Query params:** `patient_id`, `status`, `ward_id`, `date_from`, `date_to`, `page`, `per_page`

---

## 16. Billing (`/api/billing`)

### POST `/api/billing/invoices`
**Auth:** Required  
**Roles:** Admin, Receptionist

**Request:**
```json
{
  "patient_id": 1,
  "items": [
    {
      "item_type": "consultation",
      "description": "General Consultation - Dr. Patel",
      "reference_type": "encounter",
      "reference_id": 1,
      "quantity": 1,
      "unit_price": "500.00"
    },
    {
      "item_type": "lab_test",
      "description": "Complete Blood Count",
      "reference_type": "lab_order_item",
      "reference_id": 3,
      "quantity": 1,
      "unit_price": "350.00"
    }
  ],
  "discount_percent": 0,
  "tax_percent": 5,
  "notes": ""
}
```

Calculations:
- `subtotal` = Σ(quantity × unit_price) for all items
- `discount_amount` = subtotal × (discount_percent / 100)
- `tax_amount` = (subtotal - discount_amount) × (tax_percent / 100)
- `total_amount` = subtotal - discount_amount + tax_amount

**Response 201:** Invoice with items and calculated totals.

---

### POST `/api/billing/invoices/{id}/issue`
**Auth:** Required  
**Roles:** Admin, Receptionist

Sets status from `draft` to `issued` and sets `issued_date`.

---

### POST `/api/billing/invoices/{id}/payments`
**Auth:** Required  
**Roles:** Admin, Receptionist

**Request:**
```json
{
  "amount": "500.00",
  "payment_method": "cash",
  "reference_number": "",
  "notes": "Partial payment"
}
```

**Validation:**
- Invoice must be `issued` or `partially_paid`.
- `amount` must be > 0 and <= remaining balance (`total_amount - paid_amount`).

**Side effects:**
- Update `invoice.paid_amount`.
- Update `invoice.status` (`partially_paid` or `paid`).
- Notification to patient.

**Response 201:** Payment object  
**Errors:** 400 (overpayment), 409 (invoice not issued)

---

### GET `/api/billing/invoices`
**Auth:** Required  
**Roles:** Admin, Receptionist, Patient (own)

**Query params:** `patient_id`, `status`, `date_from`, `date_to`, `page`, `per_page`

---

### GET `/api/billing/invoices/{id}`
**Auth:** Required  
**Roles:** Admin, Receptionist, Patient (own)

**Response 200:** Full invoice with items, payments, and calculated balances.

---

### GET `/api/billing/invoices/{id}/print`
**Auth:** Required  
**Roles:** Admin, Receptionist, Patient (own)

**Response 200:** Print-optimized invoice/receipt data.

---

## 17. Notifications (`/api/notifications`)

### GET `/api/notifications`
**Auth:** Required  
**Roles:** Any authenticated (own only)

**Query params:** `is_read`, `type`, `page`, `per_page`

**Response 200:** Paginated list of notifications, newest first.

---

### GET `/api/notifications/unread-count`
**Auth:** Required  
**Roles:** Any authenticated

**Response 200:** `{ "count": 5 }`

---

### PATCH `/api/notifications/{id}/read`
**Auth:** Required  
**Roles:** Owner only

**Response 200:** Updated notification.

---

### POST `/api/notifications/mark-all-read`
**Auth:** Required  
**Roles:** Owner only

**Response 200:** `{ "updated": 5 }`

---

## 18. Analytics (`/api/analytics`)

### GET `/api/analytics/dashboard`
**Auth:** Required  
**Roles:** Varies (returns role-appropriate data)

**Response 200 (Admin):**
```json
{
  "overview": {
    "total_patients": 250,
    "total_staff": 22,
    "today_appointments": 15,
    "active_admissions": 8,
    "pending_lab_orders": 5,
    "low_stock_medicines": 3
  },
  "appointments": {
    "today_completed": 8,
    "today_cancelled": 1,
    "today_no_show": 0,
    "today_pending": 6,
    "weekly_trend": [
      { "date": "2026-01-13", "count": 12 },
      { "date": "2026-01-14", "count": 18 }
    ]
  },
  "revenue": {
    "today": "12500.00",
    "this_week": "87500.00",
    "this_month": "350000.00",
    "outstanding": "45000.00"
  },
  "bed_occupancy": {
    "total_beds": 20,
    "occupied": 8,
    "available": 10,
    "maintenance": 2,
    "occupancy_rate": 40.0
  }
}
```

**Response 200 (Doctor):**
```json
{
  "today_appointments": [...],
  "pending_encounters": 2,
  "recent_patients": [...],
  "weekly_appointment_trend": [...]
}
```

**Response 200 (Pharmacist):**
```json
{
  "pending_prescriptions": 5,
  "today_dispensed": 12,
  "low_stock_alerts": [...],
  "expiring_medicines": [...]
}
```

Similar role-specific views for Receptionist, Nurse, Lab Technician, Patient.

---

### GET `/api/analytics/reports/revenue`
**Auth:** Required  
**Roles:** Admin

**Query params:** `date_from`, `date_to`, `group_by` (day, week, month)

---

### GET `/api/analytics/reports/appointments`
**Auth:** Required  
**Roles:** Admin, Receptionist

**Query params:** `date_from`, `date_to`, `doctor_id`, `department_id`

---

### GET `/api/analytics/reports/occupancy`
**Auth:** Required  
**Roles:** Admin, Nurse

---

## 19. Audit Logs (`/api/audit`)

### GET `/api/audit/logs`
**Auth:** Required  
**Roles:** Admin only

**Query params:** `user_id`, `action`, `entity_type`, `entity_id`, `date_from`, `date_to`, `page`, `per_page`

**Response 200:**
```json
{
  "items": [
    {
      "id": 1,
      "user_id": 3,
      "user_email": "dr.patel@medflow.com",
      "user_name": "Dr. Amit Patel",
      "action": "create",
      "entity_type": "prescription",
      "entity_id": 5,
      "details": "{\"patient_id\": 1, \"items_count\": 3}",
      "ip_address": "127.0.0.1",
      "created_at": "2026-01-15T10:30:00Z"
    }
  ],
  "total": 500,
  "page": 1,
  "per_page": 50,
  "pages": 10
}
```

No POST, PUT, or DELETE endpoints. Audit logs are created internally by service methods.
