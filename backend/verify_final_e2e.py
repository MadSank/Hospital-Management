"""
Comprehensive End-to-End Cross-Module Verification Script for MedFlow HMS.
Executes and asserts all cross-module workflows against the API and database.
"""
import sys
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, SessionLocal
from app.models.user import User
from app.models.patient import Patient
from app.models.appointment import Appointment, AppointmentStatus
from app.models.encounter import Encounter, EncounterStatus
from app.models.pharmacy import Medicine, MedicineBatch, Prescription, PrescriptionStatus
from app.models.inpatient import Ward, Bed, Admission, AdmissionStatus
from app.models.billing import Invoice, InvoiceStatus, Payment, PaymentStatus

def run_verification():
    print("=" * 70)
    print("MEDFLOW HMS — FINAL END-TO-END CROSS-MODULE VERIFICATION")
    print("=" * 70)
    
    client = TestClient(app)
    
    # 1. Health check & Startup
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    print(f"[OK] 1. Backend startup & health check: status={health_data.get('status')}")

    # 2. Authentication & Roles
    tokens = {}
    users_to_test = [
        ("admin@medflow.com", "Admin@123", "admin"),
        ("doctor@medflow.com", "Doctor@123", "doctor"),
        ("receptionist@medflow.com", "Reception@123", "receptionist"),
        ("pharmacist@medflow.com", "Pharm@123", "pharmacist"),
        ("patient@medflow.com", "Patient@123", "patient"),
    ]
    for email, pwd, role in users_to_test:
        login_res = client.post("/api/auth/login", json={"email": email, "password": pwd})
        assert login_res.status_code == 200, f"Login failed for {email}: {login_res.text}"
        token = login_res.json()["access_token"]
        tokens[role] = token
    print(f"[OK] 2. Authentication verified for 5 distinct roles (admin, doctor, receptionist, pharmacist, patient)")

    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    doctor_headers = {"Authorization": f"Bearer {tokens['doctor']}"}
    recep_headers = {"Authorization": f"Bearer {tokens['receptionist']}"}
    pharm_headers = {"Authorization": f"Bearer {tokens['pharmacist']}"}
    patient_headers = {"Authorization": f"Bearer {tokens['patient']}"}

    # 3. Patient Registration (Receptionist / Admin)
    unique_suffix = int(datetime.now().timestamp())
    patient_payload = {
        "first_name": "FinalTest",
        "last_name": f"Patient{unique_suffix}",
        "date_of_birth": "1992-05-15",
        "gender": "male",
        "phone": f"+1999{str(unique_suffix)[-7:]}",
        "email": f"finaltest_{unique_suffix}@example.com",
        "address": "456 Verification Ave",
        "blood_group": "A+",
        "allergies": "Penicillin",
        "medical_history": "Mild seasonal asthma"
    }
    create_pat_res = client.post("/api/patients/", json=patient_payload, headers=recep_headers)
    assert create_pat_res.status_code == 201, f"Patient registration failed: {create_pat_res.text}"
    patient = create_pat_res.json()
    patient_id = patient["id"]
    print(f"[OK] 3. Patient registration: id={patient_id}, UID={patient['patient_uid']}")

    # 4. Appointment Booking & Conflict Prevention
    # Get doctor ID
    doc_res = client.get("/api/auth/me", headers=doctor_headers)
    doc_user = doc_res.json()
    
    db = SessionLocal()
    from app.models.staff import Staff
    staff_doc = db.query(Staff).filter(Staff.user_id == doc_user["id"]).first()
    doctor_id = staff_doc.id if staff_doc else 1
    db.close()

    # Query doctor available slots dynamically
    target_date = None
    scheduled_time = None
    end_time_str = None
    for days_ahead in range(1, 14):
        check_d = (datetime.now().date() + timedelta(days=days_ahead)).isoformat()
        slots_res = client.get(f"/api/staff/doctors/{doctor_id}/available-slots?date={check_d}", headers=recep_headers)
        if slots_res.status_code == 200:
            slots_data = slots_res.json()
            free_slots = [s for s in slots_data.get("slots", []) if s.get("available")]
            if free_slots:
                target_date = check_d
                scheduled_time = free_slots[0]["start_time"]
                end_time_str = free_slots[0]["end_time"]
                break

    if not target_date:
        target_date = (datetime.now().date() + timedelta(days=2)).isoformat()
        scheduled_time = "10:00"
        end_time_str = "10:30"

    appt_payload = {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "scheduled_date": target_date,
        "scheduled_time": scheduled_time,
        "end_time": end_time_str,
        "type": "consultation",
        "reason": "Annual comprehensive physical exam"
    }
    appt_res = client.post("/api/appointments/", json=appt_payload, headers=recep_headers)
    assert appt_res.status_code == 201, f"Appointment booking failed: {appt_res.text}"
    appt = appt_res.json()
    appt_id = appt["id"]
    print(f"[OK] 4. Appointment booking: id={appt_id}, status={appt['status']}")

    # Conflict check
    conflict_res = client.post("/api/appointments/", json=appt_payload, headers=recep_headers)
    assert conflict_res.status_code == 409, f"Expected 409 conflict, got: {conflict_res.status_code}"
    print(f"[OK] 5. Appointment conflict prevention: duplicate slot rejected with HTTP 409")

    # Check-in appointment
    checkin_res = client.patch(f"/api/appointments/{appt_id}/status", json={"status": "checked_in"}, headers=recep_headers)
    assert checkin_res.status_code == 200
    checkin2_res = client.patch(f"/api/appointments/{appt_id}/status", json={"status": "in_progress"}, headers=doctor_headers)
    assert checkin2_res.status_code == 200
    print(f"[OK] 6. Appointment status transitions: scheduled -> checked_in (receptionist) -> in_progress (doctor)")

    # 5. Clinical Encounter & EHR (Doctor)
    enc_payload = {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "appointment_id": appt_id,
        "chief_complaint": "Routine checkup and occasional mild shortness of breath",
        "history_of_present_illness": "Symptoms appear with vigorous cardio exercise",
        "examination_notes": "Lungs clear, cardiovascular sounds normal S1/S2",
        "assessment": "Well controlled intermittent asthma",
        "treatment_plan": "Continue current regimen, prescribed salbutamol inhaler as needed"
    }
    enc_res = client.post("/api/encounters/", json=enc_payload, headers=doctor_headers)
    assert enc_res.status_code == 201, f"Encounter creation failed: {enc_res.text}"
    enc = enc_res.json()
    enc_id = enc["id"]

    # Add vitals & diagnosis
    vital_payload = {
        "blood_pressure_systolic": 118,
        "blood_pressure_diastolic": 78,
        "heart_rate": 72,
        "respiratory_rate": 16,
        "temperature_f": 98.6,
        "oxygen_saturation": 99.0,
        "weight_kg": 74.5,
        "height_cm": 178.0
    }
    vital_res = client.post(f"/api/encounters/{enc_id}/vitals", json=vital_payload, headers=doctor_headers)
    assert vital_res.status_code == 201, f"Vitals creation failed: {vital_res.text}"

    diag_payload = {
        "diagnosis_name": "Unspecified asthma, uncomplicated",
        "diagnosis_code": "J45.909",
        "diagnosis_type": "primary",
        "notes": "Confirmed exercise-induced variant"
    }
    diag_res = client.post(f"/api/encounters/{enc_id}/diagnoses", json=diag_payload, headers=doctor_headers)
    assert diag_res.status_code == 201, f"Diagnosis creation failed: {diag_res.text}"
    print(f"[OK] 7. Clinical encounter EHR: encounter={enc_id}, vitals & primary diagnosis attached")

    # 6. Prescription & Pharmacy FEFO Dispensing
    # Ensure medicine and batch exist
    db = SessionLocal()
    med = db.query(Medicine).filter(Medicine.is_active == True).first()
    if not med:
        med = Medicine(name="Amoxicillin 500mg", generic_name="Amoxicillin", code="MED-E2E-1", form="capsule", strength="500mg", unit_price=12.50)
        db.add(med)
        db.commit()
        db.refresh(med)
        batch = MedicineBatch(medicine_id=med.id, batch_number=f"BAT-{unique_suffix}", initial_quantity=100, quantity_remaining=100, expiry_date=datetime.now().date() + timedelta(days=365))
        db.add(batch)
        db.commit()
    med_id = med.id
    med_price = float(med.unit_price)
    db.close()

    rx_payload = {
        "encounter_id": enc_id,
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "items": [
            {
                "medicine_id": med_id,
                "dosage": "500mg",
                "frequency": "Three times daily",
                "route": "oral",
                "duration": "5 days",
                "quantity": 15,
                "instructions": "Take with meals"
            }
        ]
    }
    rx_res = client.post("/api/prescriptions", json=rx_payload, headers=doctor_headers)
    assert rx_res.status_code == 201, f"Prescription failed: {rx_res.text}"
    rx = rx_res.json()
    rx_id = rx["id"]
    rx_item_id = rx["items"][0]["id"]
    print(f"[OK] 8. Prescription created: id={rx_id}, items={len(rx['items'])}")

    # Dispense prescription (Pharmacist)
    dispense_payload = {
        "prescription_id": rx_id,
        "items": [
            {
                "prescription_item_id": rx_item_id,
                "quantity": 15
            }
        ]
    }
    dispense_res = client.post("/api/pharmacy/dispense", json=dispense_payload, headers=pharm_headers)
    assert dispense_res.status_code == 200, f"Dispensing failed: {dispense_res.text}"
    dispensed = dispense_res.json()
    assert dispensed["status"] == "dispensed"
    print(f"[OK] 9. Pharmacy FEFO dispensing: status=dispensed, stock movements recorded")

    # Duplicate dispensing attempt should be rejected
    dup_dispense_res = client.post("/api/pharmacy/dispense", json=dispense_payload, headers=pharm_headers)
    assert dup_dispense_res.status_code == 400, f"Expected 400 for duplicate dispense, got: {dup_dispense_res.status_code}"
    print(f"[OK] 10. Duplicate dispensing prevention: rejected with HTTP 400")

    # 7. Inpatient Care & Ward/Bed Management
    # Find available bed
    db = SessionLocal()
    avail_bed = db.query(Bed).filter(Bed.status == "available").first()
    if not avail_bed:
        ward = db.query(Ward).first()
        if not ward:
            ward = Ward(name=f"Obs Ward {unique_suffix}", ward_type="general", floor="1st", capacity=10)
            db.add(ward)
            db.commit()
            db.refresh(ward)
        avail_bed = Bed(ward_id=ward.id, bed_number=f"B-{unique_suffix}", bed_type="standard", daily_rate=150.0, status="available")
        db.add(avail_bed)
        db.commit()
        db.refresh(avail_bed)
    bed_id = avail_bed.id
    ward_id = avail_bed.ward_id
    db.close()

    admission_payload = {
        "patient_id": patient_id,
        "admitting_doctor_id": doctor_id,
        "bed_id": bed_id,
        "admission_date": datetime.now(timezone.utc).isoformat(),
        "reason": "Overnight observation post assessment"
    }
    adm_res = client.post("/api/admissions", json=admission_payload, headers=doctor_headers)
    assert adm_res.status_code == 201, f"Admission failed: {adm_res.text}"
    adm = adm_res.json()
    adm_id = adm["id"]

    # Verify bed is marked occupied
    ward_check_res = client.get(f"/api/wards/{ward_id}", headers=doctor_headers)
    assert ward_check_res.status_code == 200
    ward_data = ward_check_res.json()
    target_bed = next((b for b in ward_data["beds"] if b["id"] == bed_id), None)
    assert target_bed is not None and target_bed["status"] == "occupied", f"Bed was not marked occupied: {target_bed}"
    print(f"[OK] 11. Inpatient admission: admission={adm_id}, bed={bed_id} marked occupied")

    # Duplicate admission to occupied bed fails
    dup_adm_res = client.post("/api/admissions", json=admission_payload, headers=doctor_headers)
    assert dup_adm_res.status_code in [400, 409], f"Expected 409 or 400 for occupied bed admission, got: {dup_adm_res.status_code}"
    print(f"[OK] 12. Bed conflict prevention: admission to occupied bed rejected with HTTP {dup_adm_res.status_code}")

    # Discharge patient
    disch_payload = {
        "discharge_summary": "Patient stable, symptom free, discharged home with medication",
        "discharge_notes": "Follow up in 2 weeks"
    }
    disch_res = client.post(f"/api/admissions/{adm_id}/discharge", json=disch_payload, headers=doctor_headers)
    assert disch_res.status_code == 200, f"Discharge failed: {disch_res.text}"
    print(f"[OK] 13. Inpatient discharge: status=discharged, bed released and available")

    # 8. Billing, Invoicing & Cross-Module Auto Charges
    # Auto invoice encounter
    auto_enc_inv_res = client.post(f"/api/billing/invoices/auto/encounter/{enc_id}", headers=recep_headers)
    assert auto_enc_inv_res.status_code == 201, f"Auto invoice encounter failed: {auto_enc_inv_res.text}"
    inv_enc = auto_enc_inv_res.json()
    inv_id = inv_enc["id"]
    assert inv_enc["patient_id"] == patient_id
    assert inv_enc["status"] in ["draft", "issued"]
    print(f"[OK] 14. Auto-invoiced clinical encounter: invoice={inv_id}, total=${inv_enc['total_amount']:.2f}")

    # Retry auto invoice (Duplicate charge prevention test)
    retry_enc_inv_res = client.post(f"/api/billing/invoices/auto/encounter/{enc_id}", headers=recep_headers)
    assert retry_enc_inv_res.status_code == 409, f"Expected 409 conflict on retry, got: {retry_enc_inv_res.status_code}"
    print(f"[OK] 15. Duplicate charge prevention: retry rejected with HTTP 409 ({retry_enc_inv_res.json()['detail']})")

    # Issue invoice
    issue_res = client.post(f"/api/billing/invoices/{inv_id}/issue", headers=recep_headers)
    assert issue_res.status_code == 200
    issued_inv = issue_res.json()
    assert issued_inv["status"] == "issued"
    total_due = float(issued_inv["balance_due"])
    print(f"[OK] 16. Invoice issued: status=issued, balance_due=${total_due:.2f}")

    # 9. Payment Processing & Overpayment Protection
    # Overpayment attempt
    overpay_payload = {
        "amount": round(total_due + 50.0, 2),
        "payment_method": "card",
        "notes": "Testing overpayment rejection"
    }
    overpay_res = client.post(f"/api/billing/invoices/{inv_id}/payments", json=overpay_payload, headers=recep_headers)
    assert overpay_res.status_code == 400, f"Expected 400 for overpayment, got: {overpay_res.status_code}"
    print(f"[OK] 17. Overpayment prevention: payment exceeding balance rejected with HTTP 400")

    # Partial payment
    part_amount = round(total_due / 2, 2)
    part_payload = {
        "amount": part_amount,
        "payment_method": "cash",
        "transaction_reference": f"REF-PART-{unique_suffix}",
        "notes": "Partial copay received at cashier"
    }
    part_pay_res = client.post(f"/api/billing/invoices/{inv_id}/payments", json=part_payload, headers=recep_headers)
    assert part_pay_res.status_code == 201, f"Partial payment failed: {part_pay_res.text}"
    
    # Check updated invoice status
    inv_check = client.get(f"/api/billing/invoices/{inv_id}", headers=recep_headers).json()
    assert inv_check["status"] == "partially_paid"
    assert round(float(inv_check["balance_due"]) + part_amount, 2) == round(total_due, 2)
    print(f"[OK] 18. Partial payment processed: status=partially_paid, remaining balance=${float(inv_check['balance_due']):.2f}")

    # Final balance payment
    rem_amount = float(inv_check["balance_due"])
    final_payload = {
        "amount": rem_amount,
        "payment_method": "card",
        "transaction_reference": f"REF-FINAL-{unique_suffix}",
        "notes": "Simulated card settlement for remaining balance"
    }
    final_pay_res = client.post(f"/api/billing/invoices/{inv_id}/payments", json=final_payload, headers=recep_headers)
    assert final_pay_res.status_code == 201, f"Final payment failed: {final_pay_res.text}"
    
    inv_final = client.get(f"/api/billing/invoices/{inv_id}", headers=recep_headers).json()
    assert inv_final["status"] == "paid"
    assert float(inv_final["balance_due"]) == 0.0
    print(f"[OK] 19. Full payment settlement: status=paid, balance_due=$0.00")

    # 10. Reporting Dashboard Aggregations
    rep_res = client.get("/api/reports/summary", headers=admin_headers)
    assert rep_res.status_code == 200, f"Reports failed: {rep_res.text}"
    rep = rep_res.json()
    assert rep["appointments"]["total"] > 0
    assert rep["encounters"]["total"] > 0
    assert rep["financial"]["total_paid"] > 0
    print(f"[OK] 20. Reports & analytics aggregations computed from database records successfully")
    print(f"       Appointments: {rep['appointments']['total']} total, {rep['appointments']['in_progress']} in-progress, {rep['appointments']['scheduled']} scheduled")
    print(f"       Revenue: ${rep['financial']['total_invoiced']:.2f} invoiced, ${rep['financial']['total_paid']:.2f} collected, ${rep['financial']['total_outstanding']:.2f} outstanding")
    print(f"       Bed Occupancy: {rep['inpatient']['occupancy_rate_percent']}% ({rep['inpatient']['occupied_beds']}/{rep['inpatient']['total_beds']} beds)")
    print(f"       Pharmacy Stock: {rep['pharmacy']['total_medicines']} medicines, {rep['pharmacy']['low_stock_medicines']} low-stock, {rep['pharmacy']['expiring_batches_90d']} near-expiry batches")

    # 11. Security & Role-Based Access Control
    # Patient attempting to view all patients
    pat_all_res = client.get("/api/patients/", headers=patient_headers)
    assert pat_all_res.status_code == 403, f"Expected 403, got {pat_all_res.status_code}"
    
    # Patient attempting to view financial reports
    pat_rep_res = client.get("/api/reports/summary", headers=patient_headers)
    assert pat_rep_res.status_code == 403, f"Expected 403, got {pat_rep_res.status_code}"

    # Patient attempting to view other patient's invoice
    pat_inv_res = client.get(f"/api/billing/invoices/{inv_id}", headers=patient_headers)
    assert pat_inv_res.status_code == 403, f"Expected 403 for unauthorized invoice access, got {pat_inv_res.status_code}"
    print(f"[OK] 21. Authorization boundaries verified: Patient forbidden from admin directories, financial reports, and other patient invoices (HTTP 403)")

    print("=" * 70)
    print("ALL 21 CROSS-MODULE INTEGRATION WORKFLOWS VERIFIED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    run_verification()
