from datetime import datetime
import pytest
from tests.conftest import make_auth_headers


@pytest.mark.asyncio
async def test_ward_and_bed_creation(client):
    """Admin can create a ward and add beds with custom rates and types."""
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")

    # 1. Create Ward
    ward_payload = {
        "name": "Surgical Recovery Ward",
        "ward_type": "general",
        "floor": "Floor 4",
        "capacity": 8,
    }
    ward_resp = await client.post("/api/wards", headers=admin_headers, json=ward_payload)
    assert ward_resp.status_code == 201
    ward_data = ward_resp.json()
    assert ward_data["name"] == "Surgical Recovery Ward"
    ward_id = ward_data["id"]

    # 2. Add Beds
    bed_resp = await client.post(
        f"/api/wards/{ward_id}/beds",
        headers=admin_headers,
        json={"bed_number": "SR-01", "bed_type": "electric", "daily_rate": 75.0},
    )
    assert bed_resp.status_code == 201
    bed_data = bed_resp.json()
    assert bed_data["bed_number"] == "SR-01"
    assert bed_data["status"] == "available"
    assert bed_data["daily_rate"] == 75.0

    # 3. Duplicate bed number in same ward rejected
    dup_bed = await client.post(
        f"/api/wards/{ward_id}/beds",
        headers=admin_headers,
        json={"bed_number": "SR-01", "bed_type": "standard", "daily_rate": 50.0},
    )
    assert dup_bed.status_code == 409

    # 4. Get ward with beds
    ward_detail = await client.get(f"/api/wards/{ward_id}", headers=admin_headers)
    assert ward_detail.status_code == 200
    assert len(ward_detail.json()["beds"]) == 1
    assert ward_detail.json()["available_beds"] == 1


@pytest.mark.asyncio
async def test_admission_and_bed_conflict_prevention(client):
    """Bed conflict prevention: an occupied bed cannot be assigned to another admission."""
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    doc_headers = make_auth_headers(user_id=2, role="doctor", email="doctor@medflow.com")

    # Create ward with 1 bed
    ward_resp = await client.post(
        "/api/wards",
        headers=admin_headers,
        json={"name": "Cardiac Observation Unit", "ward_type": "icu", "capacity": 2},
    )
    ward_id = ward_resp.json()["id"]

    bed_resp = await client.post(
        f"/api/wards/{ward_id}/beds",
        headers=admin_headers,
        json={"bed_number": "COU-01", "bed_type": "icu", "daily_rate": 150.0},
    )
    bed_id = bed_resp.json()["id"]

    # 1. Admit patient 1 into bed COU-01
    adm_payload = {
        "patient_id": 1,
        "bed_id": bed_id,
        "admitting_doctor_id": 1,
        "reason": "Unstable cardiac rhythm observation",
    }
    adm_resp = await client.post("/api/admissions", headers=doc_headers, json=adm_payload)
    assert adm_resp.status_code == 201
    adm_data = adm_resp.json()
    assert adm_data["admission_uid"].startswith("ADM-")
    assert adm_data["status"] == "admitted"
    assert adm_data["bed_number"] == "COU-01"

    # Bed status should now be 'occupied'
    ward_check = await client.get(f"/api/wards/{ward_id}", headers=doc_headers)
    assert ward_check.json()["beds"][0]["status"] == "occupied"
    assert ward_check.json()["available_beds"] == 0

    # 2. Conflict attempt: Admit patient 2 into the same occupied bed -> 409 Conflict
    conflict_adm = {
        "patient_id": 2,
        "bed_id": bed_id,
        "admitting_doctor_id": 1,
        "reason": "Another admission attempt",
    }
    conf_resp = await client.post("/api/admissions", headers=doc_headers, json=conflict_adm)
    assert conf_resp.status_code == 409

    # 3. Conflict attempt: Patient 1 already admitted cannot be admitted again elsewhere -> 409 Conflict
    bed2_resp = await client.post(
        f"/api/wards/{ward_id}/beds",
        headers=admin_headers,
        json={"bed_number": "COU-02", "bed_type": "icu", "daily_rate": 150.0},
    )
    bed2_id = bed2_resp.json()["id"]

    double_adm = {
        "patient_id": 1,
        "bed_id": bed2_id,
        "admitting_doctor_id": 1,
        "reason": "Second admission for same patient",
    }
    double_resp = await client.post("/api/admissions", headers=doc_headers, json=double_adm)
    assert double_resp.status_code == 409


@pytest.mark.asyncio
async def test_patient_transfer_and_discharge_workflow(client):
    """Patient transfer updates both beds and creates new admission; discharge releases bed."""
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    doc_headers = make_auth_headers(user_id=2, role="doctor", email="doctor@medflow.com")

    # Create ward with 2 beds
    w_resp = await client.post(
        "/api/wards",
        headers=admin_headers,
        json={"name": "Step-down Care", "ward_type": "general", "capacity": 4},
    )
    w_id = w_resp.json()["id"]

    b1_resp = await client.post(f"/api/wards/{w_id}/beds", headers=admin_headers, json={"bed_number": "SD-101", "daily_rate": 60.0})
    b1_id = b1_resp.json()["id"]
    b2_resp = await client.post(f"/api/wards/{w_id}/beds", headers=admin_headers, json={"bed_number": "SD-102", "daily_rate": 60.0})
    b2_id = b2_resp.json()["id"]

    # 1. Initial admission in Bed 1
    adm_resp = await client.post(
        "/api/admissions",
        headers=doc_headers,
        json={"patient_id": 1, "bed_id": b1_id, "admitting_doctor_id": 1, "reason": "Post-op care"},
    )
    adm_id = adm_resp.json()["id"]

    # 2. Transfer patient to Bed 2
    transfer_payload = {"new_bed_id": b2_id, "reason": "Patient requested window view bed"}
    trans_resp = await client.post(f"/api/admissions/{adm_id}/transfer", headers=doc_headers, json=transfer_payload)
    assert trans_resp.status_code == 200
    new_adm_data = trans_resp.json()
    assert new_adm_data["bed_id"] == b2_id
    assert new_adm_data["status"] == "admitted"
    new_adm_id = new_adm_data["id"]

    # Check bed statuses: Bed 1 is now available, Bed 2 is occupied
    w_state = await client.get(f"/api/wards/{w_id}", headers=doc_headers)
    beds_map = {b["bed_number"]: b["status"] for b in w_state.json()["beds"]}
    assert beds_map["SD-101"] == "available"
    assert beds_map["SD-102"] == "occupied"

    # Old admission is now 'transferred'
    old_adm = await client.get(f"/api/admissions/{adm_id}", headers=doc_headers)
    assert old_adm.json()["status"] == "transferred"

    # 3. Discharge patient from new admission
    discharge_payload = {
        "discharge_summary": "Patient fully recovered, surgical wound healed cleanly",
        "discharge_notes": "Suture removal scheduled in 5 days",
    }
    disc_resp = await client.post(f"/api/admissions/{new_adm_id}/discharge", headers=doc_headers, json=discharge_payload)
    assert disc_resp.status_code == 200
    assert disc_resp.json()["status"] == "discharged"

    # Bed 2 is now available again
    w_state_after = await client.get(f"/api/wards/{w_id}", headers=doc_headers)
    beds_after = {b["bed_number"]: b["status"] for b in w_state_after.json()["beds"]}
    assert beds_after["SD-102"] == "available"
    assert w_state_after.json()["available_beds"] == 2
