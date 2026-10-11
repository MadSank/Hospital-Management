from datetime import date, datetime, timedelta
import pytest
from tests.conftest import make_auth_headers


@pytest.mark.asyncio
async def test_medicine_and_batch_lifecycle(client):
    """Admin/Pharmacist can create medicines, receive batches, and track stock movements."""
    pharm_headers = make_auth_headers(user_id=6, role="pharmacist", email="pharmacist@medflow.com")

    # 1. Create medicine
    med_payload = {
        "name": "Ciprofloxacin",
        "generic_name": "Ciprofloxacin HCl",
        "category": "Antibiotic",
        "form": "tablet",
        "strength": "500mg",
        "manufacturer": "Bayer",
        "unit_price": 15.0,
        "reorder_level": 30,
    }
    med_resp = await client.post("/api/pharmacy/medicines", headers=pharm_headers, json=med_payload)
    assert med_resp.status_code == 201
    med_data = med_resp.json()
    assert med_data["medicine_uid"].startswith("MED-")
    assert med_data["total_stock"] == 0
    med_id = med_data["id"]

    # 2. Add batch
    expiry = (date.today() + timedelta(days=200)).isoformat()
    batch_payload = {
        "batch_number": "BTH-CIP-001",
        "quantity_received": 100,
        "expiry_date": expiry,
        "supplier": "PharmaDirect",
        "cost_per_unit": 9.5,
    }
    batch_resp = await client.post(f"/api/pharmacy/medicines/{med_id}/batches", headers=pharm_headers, json=batch_payload)
    assert batch_resp.status_code == 201
    batch_data = batch_resp.json()
    assert batch_data["quantity_remaining"] == 100

    # 3. List medicines - verify stock total updated
    list_resp = await client.get("/api/pharmacy/medicines", headers=pharm_headers, params={"search": "Ciprofloxacin"})
    assert list_resp.status_code == 200
    meds = list_resp.json()
    assert len(meds) >= 1
    assert meds[0]["total_stock"] == 100

    # 4. Check stock movements audit
    mv_resp = await client.get("/api/pharmacy/stock-movements", headers=pharm_headers, params={"medicine_id": med_id})
    assert mv_resp.status_code == 200
    movements = mv_resp.json()
    assert len(movements) == 1
    assert movements[0]["movement_type"] == "receipt"
    assert movements[0]["quantity"] == 100


@pytest.mark.asyncio
async def test_prescription_and_dispense_workflow(client):
    """Doctor creates prescription; Pharmacist dispenses with stock deduction and validation."""
    doc_headers = make_auth_headers(user_id=2, role="doctor", email="doctor@medflow.com")
    pharm_headers = make_auth_headers(user_id=6, role="pharmacist", email="pharmacist@medflow.com")

    # Setup: create encounter and medicine with batch
    enc_resp = await client.post(
        "/api/encounters",
        headers=doc_headers,
        json={"patient_id": 1, "doctor_id": 1, "chief_complaint": "Bacterial pharyngitis"},
    )
    enc_id = enc_resp.json()["id"]

    med_resp = await client.post(
        "/api/pharmacy/medicines",
        headers=pharm_headers,
        json={"name": "Amoxicillin Test", "form": "capsule", "unit_price": 10.0, "reorder_level": 20},
    )
    med_id = med_resp.json()["id"]

    batch_resp = await client.post(
        f"/api/pharmacy/medicines/{med_id}/batches",
        headers=pharm_headers,
        json={"batch_number": "BTH-DISP-01", "quantity_received": 50, "expiry_date": (date.today() + timedelta(days=365)).isoformat()},
    )
    batch_id = batch_resp.json()["id"]

    # 1. Create prescription
    pre_payload = {
        "encounter_id": enc_id,
        "patient_id": 1,
        "doctor_id": 1,
        "items": [
            {
                "medicine_id": med_id,
                "dosage": "500mg",
                "frequency": "3 times daily",
                "route": "oral",
                "duration": "7 days",
                "quantity": 21,
                "instructions": "Take after meals",
            }
        ],
    }
    pre_resp = await client.post("/api/prescriptions", headers=doc_headers, json=pre_payload)
    assert pre_resp.status_code == 201
    pre_data = pre_resp.json()
    assert pre_data["status"] == "pending"
    pre_id = pre_data["id"]
    item_id = pre_data["items"][0]["id"]

    # 2. Reject dispensing excessive quantity (> remaining needed)
    excess_dispense = {
        "prescription_id": pre_id,
        "items": [{"prescription_item_id": item_id, "quantity": 999, "batch_id": batch_id}],
    }
    rej_resp = await client.post("/api/pharmacy/dispense", headers=pharm_headers, json=excess_dispense)
    assert rej_resp.status_code == 400

    # 3. Dispense full requested quantity (21 units)
    valid_dispense = {
        "prescription_id": pre_id,
        "items": [{"prescription_item_id": item_id, "quantity": 21, "batch_id": batch_id}],
    }
    disp_resp = await client.post("/api/pharmacy/dispense", headers=pharm_headers, json=valid_dispense)
    assert disp_resp.status_code == 200
    disp_data = disp_resp.json()
    assert disp_data["status"] == "dispensed"
    assert disp_data["items"][0]["is_dispensed"] is True
    assert disp_data["items"][0]["dispensed_quantity"] == 21

    # 4. Verify batch remaining is 50 - 21 = 29
    med_check = await client.get("/api/pharmacy/medicines", headers=pharm_headers, params={"search": "Amoxicillin Test"})
    assert med_check.json()[0]["total_stock"] == 29

    # 5. Cannot dispense already fully dispensed prescription
    dup_disp = await client.post("/api/pharmacy/dispense", headers=pharm_headers, json=valid_dispense)
    assert dup_disp.status_code == 400


@pytest.mark.asyncio
async def test_pharmacy_stock_alerts(client):
    """Stock alerts endpoint correctly reports low stock and expiring items."""
    pharm_headers = make_auth_headers(user_id=6, role="pharmacist", email="pharmacist@medflow.com")

    # Create low-stock medicine
    med_resp = await client.post(
        "/api/pharmacy/medicines",
        headers=pharm_headers,
        json={"name": "Low Stock Medicine", "form": "tablet", "unit_price": 5.0, "reorder_level": 50},
    )
    med_id = med_resp.json()["id"]

    # Add small batch expiring soon (in 30 days)
    await client.post(
        f"/api/pharmacy/medicines/{med_id}/batches",
        headers=pharm_headers,
        json={"batch_number": "BTH-LOW-01", "quantity_received": 10, "expiry_date": (date.today() + timedelta(days=30)).isoformat()},
    )

    alerts_resp = await client.get("/api/pharmacy/stock-alerts", headers=pharm_headers)
    assert alerts_resp.status_code == 200
    data = alerts_resp.json()
    assert "low_stock" in data
    assert "expiring_soon" in data

    # Verify our medicine is flagged in low_stock
    low_names = [it["medicine_name"] for it in data["low_stock"]]
    assert "Low Stock Medicine" in low_names

    # Verify batch is flagged in expiring_soon
    exp_batches = [it["batch_number"] for it in data["expiring_soon"]]
    assert "BTH-LOW-01" in exp_batches
