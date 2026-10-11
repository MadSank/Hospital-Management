from datetime import date
import pytest
from httpx import AsyncClient
from app.models.encounter import Encounter
from app.models.inpatient import Admission, Bed, Ward
from app.models.patient import Patient
from app.models.pharmacy import Medicine, Prescription, PrescriptionItem
from tests.conftest import make_auth_headers


@pytest.mark.asyncio
async def test_manual_invoice_creation_and_calculation(client: AsyncClient, db_session):
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    patient = db_session.query(Patient).first()

    payload = {
        "patient_id": patient.id,
        "discount_amount": 10.0,
        "tax_amount": 5.0,
        "notes": "Diagnostic and Consultation package",
        "items": [
            {
                "item_type": "consultation",
                "description": "General Physician Consultation",
                "quantity": 1,
                "unit_price": 50.0,
            },
            {
                "item_type": "lab_test",
                "description": "Complete Blood Count (CBC)",
                "quantity": 2,
                "unit_price": 25.0,
            },
        ],
        "auto_issue": False,
    }

    resp = await client.post("/api/v1/billing/invoices", json=payload, headers=admin_headers)
    assert resp.status_code == 201
    data = resp.json()

    assert data["invoice_uid"].startswith("INV-")
    assert data["subtotal"] == 100.0  # 50 + (2 * 25)
    assert data["discount_amount"] == 10.0
    assert data["tax_amount"] == 5.0
    assert data["total_amount"] == 95.0  # 100 - 10 + 5
    assert data["paid_amount"] == 0.0
    assert data["balance_due"] == 95.0
    assert data["status"] == "draft"
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_issue_invoice_and_payment_flow(client: AsyncClient, db_session):
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    patient = db_session.query(Patient).first()

    # 1. Create a draft invoice
    payload = {
        "patient_id": patient.id,
        "items": [
            {
                "item_type": "procedure",
                "description": "Minor Wound Dressing",
                "quantity": 1,
                "unit_price": 80.0,
            }
        ],
        "auto_issue": False,
    }
    create_res = await client.post("/api/v1/billing/invoices", json=payload, headers=admin_headers)
    assert create_res.status_code == 201
    inv_id = create_res.json()["id"]

    # 2. Attempt payment on draft invoice -> should be rejected with 409
    pay_payload = {
        "amount": 40.0,
        "payment_method": "cash",
    }
    draft_pay_res = await client.post(f"/api/v1/billing/invoices/{inv_id}/payments", json=pay_payload, headers=admin_headers)
    assert draft_pay_res.status_code == 409
    detail_val = draft_pay_res.json()["detail"]
    assert "draft" in (detail_val if isinstance(detail_val, str) else detail_val.get("message", "")).lower()

    # 3. Issue the invoice
    issue_res = await client.post(f"/api/v1/billing/invoices/{inv_id}/issue", headers=admin_headers)
    assert issue_res.status_code == 200
    assert issue_res.json()["status"] == "issued"

    # 4. Partial payment
    part_res = await client.post(f"/api/v1/billing/invoices/{inv_id}/payments", json={"amount": 30.0, "payment_method": "cash"}, headers=admin_headers)
    assert part_res.status_code == 201

    # Check updated invoice status
    inv_check = await client.get(f"/api/v1/billing/invoices/{inv_id}", headers=admin_headers)
    assert inv_check.json()["status"] == "partially_paid"
    assert inv_check.json()["paid_amount"] == 30.0
    assert inv_check.json()["balance_due"] == 50.0

    # 5. Overpayment attempt (paying $60 when balance is $50)
    over_res = await client.post(f"/api/v1/billing/invoices/{inv_id}/payments", json={"amount": 60.0, "payment_method": "card"}, headers=admin_headers)
    assert over_res.status_code == 400
    assert "exceeds outstanding balance" in over_res.json()["detail"]

    # 6. Settle remaining $50.00
    full_res = await client.post(f"/api/v1/billing/invoices/{inv_id}/payments", json={"amount": 50.0, "payment_method": "card"}, headers=admin_headers)
    assert full_res.status_code == 201

    inv_final = await client.get(f"/api/v1/billing/invoices/{inv_id}", headers=admin_headers)
    assert inv_final.json()["status"] == "paid"
    assert inv_final.json()["balance_due"] == 0.0

    # 7. Additional payment on paid invoice rejected
    excess_res = await client.post(f"/api/v1/billing/invoices/{inv_id}/payments", json={"amount": 10.0, "payment_method": "cash"}, headers=admin_headers)
    assert excess_res.status_code == 400
    assert "fully paid" in excess_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_auto_invoice_from_encounter_and_duplicate_prevention(client: AsyncClient, db_session):
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    patient = db_session.query(Patient).first()

    # Create encounter
    enc = Encounter(
        encounter_uid="ENC-TEST-99",
        patient_id=patient.id,
        doctor_id=1,
        chief_complaint="Chest pressure",
        status="completed",
    )
    db_session.add(enc)
    db_session.commit()
    db_session.refresh(enc)

    # Auto generate invoice
    gen_res = await client.post(f"/api/v1/billing/invoices/auto/encounter/{enc.id}", headers=admin_headers)
    assert gen_res.status_code == 201
    data = gen_res.json()
    assert data["encounter_id"] == enc.id
    assert data["status"] == "issued"
    assert data["total_amount"] == 50.0
    assert len(data["items"]) == 1
    assert data["items"][0]["item_type"] == "consultation"

    # Retry auto generate for same encounter -> duplicate prevention 409
    dup_res = await client.post(f"/api/v1/billing/invoices/auto/encounter/{enc.id}", headers=admin_headers)
    assert dup_res.status_code == 409
    assert "already exists" in dup_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_auto_invoice_from_prescription_and_admission(client: AsyncClient, db_session):
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    patient = db_session.query(Patient).first()

    # 1. Test Prescription Auto Invoice
    med = Medicine(
        medicine_uid="MED-BILL-01",
        name="Amoxicillin 500mg",
        generic_name="Amoxicillin",
        category="Antibiotic",
        form="capsule",
        strength="500mg",
        manufacturer="Apex",
        unit_price=12.0,
        reorder_level=10,
    )
    db_session.add(med)
    db_session.commit()

    enc = Encounter(
        encounter_uid="ENC-PRE-BILL",
        patient_id=patient.id,
        doctor_id=1,
        chief_complaint="Infection",
        status="completed",
    )
    db_session.add(enc)
    db_session.commit()

    pres = Prescription(
        prescription_uid="PRE-BILL-01",
        patient_id=patient.id,
        doctor_id=1,
        encounter_id=enc.id,
        status="dispensed",
    )
    db_session.add(pres)
    db_session.commit()

    p_item = PrescriptionItem(
        prescription_id=pres.id,
        medicine_id=med.id,
        dosage="500mg",
        frequency="TID",
        duration="7 days",
        quantity=10,
    )
    db_session.add(p_item)
    db_session.commit()

    pres_inv_res = await client.post(f"/api/v1/billing/invoices/auto/prescription/{pres.id}", headers=admin_headers)
    assert pres_inv_res.status_code == 201
    p_inv_data = pres_inv_res.json()
    assert p_inv_data["prescription_id"] == pres.id
    assert p_inv_data["total_amount"] == 120.0  # 10 * 12.0
    assert p_inv_data["status"] == "issued"

    # Retry duplicate check
    dup_pres = await client.post(f"/api/v1/billing/invoices/auto/prescription/{pres.id}", headers=admin_headers)
    assert dup_pres.status_code == 409

    # 2. Test Admission Auto Invoice
    ward = Ward(name="Recovery Ward", ward_type="general", floor="Floor 1", capacity=5)
    db_session.add(ward)
    db_session.commit()

    bed = Bed(ward_id=ward.id, bed_number="REC-01", bed_type="standard", daily_rate=75.0, status="available")
    db_session.add(bed)
    db_session.commit()

    adm = Admission(
        admission_uid="ADM-BILL-01",
        patient_id=patient.id,
        bed_id=bed.id,
        admitting_doctor_id=1,
        status="discharged",
        reason="Observation",
    )
    db_session.add(adm)
    db_session.commit()

    adm_inv_res = await client.post(f"/api/v1/billing/invoices/auto/admission/{adm.id}", headers=admin_headers)
    assert adm_inv_res.status_code == 201
    a_inv_data = adm_inv_res.json()
    assert a_inv_data["admission_id"] == adm.id
    assert a_inv_data["total_amount"] == 75.0  # min 1 day * 75.0
    assert a_inv_data["items"][0]["item_type"] == "bed_charge"

    # Retry duplicate check
    dup_adm = await client.post(f"/api/v1/billing/invoices/auto/admission/{adm.id}", headers=admin_headers)
    assert dup_adm.status_code == 409


@pytest.mark.asyncio
async def test_patient_invoice_boundaries(client: AsyncClient, db_session):
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    patient_headers = make_auth_headers(user_id=3, role="patient", email="patient@medflow.com")

    # Patient 1 is Rahul Sharma (linked to patient_token_headers)
    p1 = db_session.query(Patient).filter(Patient.patient_uid == "PAT-0001").first()

    # Create another patient
    p2 = Patient(
        patient_uid="PAT-DIFF-99",
        first_name="Other",
        last_name="Patient",
        date_of_birth=date(1990, 1, 1),
        gender="male",
        phone="+91-9999999999",
        email="other.patient@example.com",
    )
    db_session.add(p2)
    db_session.commit()

    # Invoice for Patient 2
    inv2_res = await client.post(
        "/api/v1/billing/invoices",
        json={
            "patient_id": p2.id,
            "items": [{"item_type": "consultation", "description": "Consultation", "quantity": 1, "unit_price": 50.0}],
            "auto_issue": True,
        },
        headers=admin_headers,
    )
    inv2_id = inv2_res.json()["id"]

    # Invoice for Patient 1
    inv1_res = await client.post(
        "/api/v1/billing/invoices",
        json={
            "patient_id": p1.id,
            "items": [{"item_type": "consultation", "description": "Consultation", "quantity": 1, "unit_price": 50.0}],
            "auto_issue": True,
        },
        headers=admin_headers,
    )
    inv1_id = inv1_res.json()["id"]

    # Patient 1 views their own invoice -> 200
    own_res = await client.get(f"/api/v1/billing/invoices/{inv1_id}", headers=patient_headers)
    assert own_res.status_code == 200
    assert own_res.json()["patient_id"] == p1.id

    # Patient 1 attempts to view Patient 2's invoice -> 403 Forbidden
    other_res = await client.get(f"/api/v1/billing/invoices/{inv2_id}", headers=patient_headers)
    assert other_res.status_code == 403

    # Patient cannot create invoices directly -> 403
    create_attempt = await client.post(
        "/api/v1/billing/invoices",
        json={"patient_id": p1.id, "items": [{"item_type": "other", "description": "x", "quantity": 1, "unit_price": 10.0}]},
        headers=patient_headers,
    )
    assert create_attempt.status_code == 403
