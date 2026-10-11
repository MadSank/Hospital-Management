from datetime import date, datetime, timedelta
import pytest
from tests.conftest import make_auth_headers


@pytest.mark.asyncio
async def test_encounter_creation_success(client):
    """Doctor can create clinical encounter with vitals and ICD-10 diagnosis."""
    doc_headers = make_auth_headers(user_id=2, role="doctor", email="doctor@medflow.com")
    payload = {
        "patient_id": 1,
        "doctor_id": 1,
        "chief_complaint": "Persistent cough and mild fever for 4 days",
        "history_of_present_illness": "Productive cough with yellowish sputum.",
        "examination_notes": "Chest auscultation reveals mild bilateral wheezing.",
        "assessment": "Acute bronchitis",
        "treatment_plan": "Prescribe bronchodilator and supportive care.",
        "follow_up_date": (date.today() + timedelta(days=7)).isoformat(),
        "vitals": {
            "temperature_f": 99.8,
            "blood_pressure_systolic": 120,
            "blood_pressure_diastolic": 80,
            "heart_rate": 84,
            "respiratory_rate": 18,
            "oxygen_saturation": 97.5,
            "weight_kg": 72.0,
            "height_cm": 172.0,
        },
        "diagnoses": [
            {
                "diagnosis_name": "Acute bronchitis",
                "diagnosis_code": "J20.9",
                "diagnosis_type": "primary",
                "notes": "Probable viral etiology",
            }
        ],
    }

    resp = await client.post("/api/encounters", headers=doc_headers, json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["encounter_uid"].startswith("ENC-")
    assert data["patient_id"] == 1
    assert data["doctor_id"] == 1
    assert data["status"] == "in_progress"
    assert len(data["vitals"]) == 1
    assert data["vitals"][0]["temperature_f"] == 99.8
    assert len(data["diagnoses"]) == 1
    assert data["diagnoses"][0]["diagnosis_code"] == "J20.9"


@pytest.mark.asyncio
async def test_encounter_linked_to_appointment_lifecycle(client):
    """Encounter linked to an appointment updates appointment status to in_progress then completed."""
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    doc_headers = make_auth_headers(user_id=2, role="doctor", email="doctor@medflow.com")

    # 1. Book appointment
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    apt_resp = await client.post(
        "/api/appointments",
        headers=admin_headers,
        json={
            "patient_id": 1,
            "doctor_id": 1,
            "scheduled_date": tomorrow,
            "scheduled_time": "09:00",
            "end_time": "09:30",
            "type": "consultation",
        },
    )
    assert apt_resp.status_code == 201
    apt_id = apt_resp.json()["id"]

    # 2. Create encounter linked to appointment
    enc_resp = await client.post(
        "/api/encounters",
        headers=doc_headers,
        json={
            "patient_id": 1,
            "appointment_id": apt_id,
            "chief_complaint": "Follow up consultation",
        },
    )
    assert enc_resp.status_code == 201
    enc_data = enc_resp.json()
    enc_id = enc_data["id"]

    # Check appointment transitioned to in_progress
    get_apt = await client.get(f"/api/appointments/{apt_id}", headers=doc_headers)
    assert get_apt.status_code == 200
    assert get_apt.json()["status"] == "in_progress"

    # 3. Duplicate encounter for same appointment rejected
    dup_resp = await client.post(
        "/api/encounters",
        headers=doc_headers,
        json={
            "patient_id": 1,
            "appointment_id": apt_id,
            "chief_complaint": "Duplicate attempt",
        },
    )
    assert dup_resp.status_code == 409

    # 4. Complete encounter
    comp_resp = await client.patch(f"/api/encounters/{enc_id}/complete", headers=doc_headers)
    assert comp_resp.status_code == 200
    assert comp_resp.json()["status"] == "completed"

    # Appointment should also be completed
    get_apt_again = await client.get(f"/api/appointments/{apt_id}", headers=doc_headers)
    assert get_apt_again.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_patient_access_boundaries_on_encounters(client):
    """Patient can view own encounter, but is forbidden from other patients' encounters."""
    doc_headers = make_auth_headers(user_id=2, role="doctor", email="doctor@medflow.com")
    # Patient 1 (Rahul Sharma, user_id=3)
    patient_headers = make_auth_headers(user_id=3, role="patient", email="patient@medflow.com")

    # Create encounter for patient 1
    enc_resp1 = await client.post(
        "/api/encounters",
        headers=doc_headers,
        json={
            "patient_id": 1,
            "doctor_id": 1,
            "chief_complaint": "Routine health checkup",
        },
    )
    assert enc_resp1.status_code == 201
    enc1_id = enc_resp1.json()["id"]

    # Create encounter for patient 2
    enc_resp2 = await client.post(
        "/api/encounters",
        headers=doc_headers,
        json={
            "patient_id": 2,
            "doctor_id": 1,
            "chief_complaint": "Knee pain evaluation",
        },
    )
    assert enc_resp2.status_code == 201
    enc2_id = enc_resp2.json()["id"]

    # Patient can view own encounter
    view_own = await client.get(f"/api/encounters/{enc1_id}", headers=patient_headers)
    assert view_own.status_code == 200
    assert view_own.json()["patient_id"] == 1

    # Patient forbidden from viewing patient 2's encounter
    view_other = await client.get(f"/api/encounters/{enc2_id}", headers=patient_headers)
    assert view_other.status_code == 403


@pytest.mark.asyncio
async def test_add_vitals_and_diagnoses_endpoints(client):
    """Nurse and Doctor can record vitals and diagnoses on an existing encounter."""
    nurse_headers = make_auth_headers(user_id=5, role="nurse", email="nurse@medflow.com")
    doc_headers = make_auth_headers(user_id=2, role="doctor", email="doctor@medflow.com")

    # Create encounter
    enc_resp = await client.post(
        "/api/encounters",
        headers=doc_headers,
        json={"patient_id": 1, "doctor_id": 1, "chief_complaint": "Initial assessment"},
    )
    enc_id = enc_resp.json()["id"]

    # Nurse adds vitals
    vitals_resp = await client.post(
        f"/api/encounters/{enc_id}/vitals",
        headers=nurse_headers,
        json={
            "temperature_f": 98.6,
            "blood_pressure_systolic": 118,
            "blood_pressure_diastolic": 78,
            "heart_rate": 72,
            "oxygen_saturation": 99.0,
            "notes": "Pre-consultation triage",
        },
    )
    assert vitals_resp.status_code == 201
    assert vitals_resp.json()["heart_rate"] == 72

    # Doctor adds secondary diagnosis
    diag_resp = await client.post(
        f"/api/encounters/{enc_id}/diagnoses",
        headers=doc_headers,
        json={
            "diagnosis_name": "Essential Hypertension",
            "diagnosis_code": "I10",
            "diagnosis_type": "secondary",
        },
    )
    assert diag_resp.status_code == 201
    assert diag_resp.json()["diagnosis_code"] == "I10"
