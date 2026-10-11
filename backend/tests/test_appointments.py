from datetime import date, datetime, timedelta
import asyncio
from concurrent.futures import ThreadPoolExecutor
import pytest
from tests.conftest import make_auth_headers


@pytest.mark.asyncio
async def test_appointment_creation_success(client):
    """Admin or Receptionist can book an appointment for an existing patient and eligible doctor."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    payload = {
        "patient_id": 1,
        "doctor_id": 1,
        "scheduled_date": tomorrow,
        "scheduled_time": "10:00",
        "end_time": "10:30",
        "type": "consultation",
        "reason": "Cardiology consultation",
        "notes": "Patient experiencing occasional dizziness",
    }
    resp = await client.post("/api/appointments", headers=headers, json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["appointment_uid"].startswith("APT-")
    assert data["patient_id"] == 1
    assert data["doctor_id"] == 1
    assert data["scheduled_date"] == tomorrow
    assert data["scheduled_time"] == "10:00"
    assert data["end_time"] == "10:30"
    assert data["status"] == "scheduled"
    assert data["type"] == "consultation"
    assert "patient" in data
    assert "doctor" in data


@pytest.mark.asyncio
async def test_appointment_creation_unknown_references(client):
    """Booking with non-existent patient or doctor returns 404 Not Found."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    # Unknown patient
    resp_pat = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 9999,
            "doctor_id": 1,
            "scheduled_date": tomorrow,
            "scheduled_time": "10:00",
        },
    )
    assert resp_pat.status_code == 404
    assert resp_pat.json()["detail"]["code"] == "PATIENT_NOT_FOUND"

    # Unknown doctor
    resp_doc = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 1,
            "doctor_id": 9999,
            "scheduled_date": tomorrow,
            "scheduled_time": "10:00",
        },
    )
    assert resp_doc.status_code == 404
    assert resp_doc.json()["detail"]["code"] == "DOCTOR_NOT_FOUND"


@pytest.mark.asyncio
async def test_appointment_invalid_intervals(client):
    """Intervals where end is before or equal to start, or outside working hours are rejected."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    # End before start
    resp_reversed = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 1,
            "doctor_id": 1,
            "scheduled_date": tomorrow,
            "scheduled_time": "11:00",
            "end_time": "10:30",
        },
    )
    assert resp_reversed.status_code == 400
    assert resp_reversed.json()["detail"]["code"] == "INVALID_INTERVAL"

    # Outside working hours (doctor availability is 09:00 - 18:00)
    resp_night = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 1,
            "doctor_id": 1,
            "scheduled_date": tomorrow,
            "scheduled_time": "20:00",
            "end_time": "20:30",
        },
    )
    assert resp_night.status_code == 400
    assert resp_night.json()["detail"]["code"] == "OUTSIDE_WORKING_HOURS"


@pytest.mark.asyncio
async def test_overlapping_appointments_rejected(client):
    """Overlapping active appointments for the same doctor are rejected with 409 Conflict."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    target_date = (date.today() + timedelta(days=2)).isoformat()

    # First booking: 10:00 to 11:00
    res1 = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 1,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res1.status_code == 201

    # Overlapping case A: Exact same slot (10:00 - 11:00)
    res_exact = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 2,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "10:00",
            "end_time": "11:00",
        },
    )
    assert res_exact.status_code == 409
    assert res_exact.json()["detail"]["code"] == "DOCTOR_SLOT_OCCUPIED"

    # Overlapping case B: Starts inside (10:30 - 11:30)
    res_partial = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 2,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "10:30",
            "end_time": "11:30",
        },
    )
    assert res_partial.status_code == 409

    # Overlapping case C: Envelops existing (09:30 - 11:30)
    res_envelop = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 2,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "09:30",
            "end_time": "11:30",
        },
    )
    assert res_envelop.status_code == 409


@pytest.mark.asyncio
async def test_non_overlapping_and_adjacent_slots_succeed(client):
    """Adjacent half-open intervals [09:30, 10:00) and [10:00, 10:30) do not conflict."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    target_date = (date.today() + timedelta(days=3)).isoformat()

    res1 = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 1,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "09:30",
            "end_time": "10:00",
        },
    )
    assert res1.status_code == 201

    # Right-adjacent slot starts exactly when first ends: 10:00
    res2 = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 2,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "10:00",
            "end_time": "10:30",
        },
    )
    assert res2.status_code == 201

    # Left-adjacent slot ends exactly when first starts: 09:30
    res3 = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 2,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "09:00",
            "end_time": "09:30",
        },
    )
    assert res3.status_code == 201


@pytest.mark.asyncio
async def test_cancelled_appointment_frees_slot(client):
    """A cancelled appointment no longer blocks its time slot for other patients."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    target_date = (date.today() + timedelta(days=4)).isoformat()

    # 1. Book initial appointment
    res1 = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 1,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "14:00",
            "end_time": "14:30",
        },
    )
    assert res1.status_code == 201
    apt_id = res1.json()["id"]

    # 2. Cancel the appointment
    cancel_res = await client.patch(
        f"/api/appointments/{apt_id}/status",
        headers=headers,
        json={
            "status": "cancelled",
            "cancellation_reason": "Patient had an unexpected scheduling conflict",
        },
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"

    # 3. New booking in the exact same slot should now succeed
    res2 = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 2,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "14:00",
            "end_time": "14:30",
        },
    )
    assert res2.status_code == 201
    assert res2.json()["patient_id"] == 2


@pytest.mark.asyncio
async def test_rescheduling_without_self_conflict(client):
    """Rescheduling an appointment to a new time excludes itself from conflict checks."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    target_date = (date.today() + timedelta(days=5)).isoformat()

    res1 = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 1,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "11:00",
            "end_time": "11:30",
        },
    )
    assert res1.status_code == 201
    apt_id = res1.json()["id"]

    # Shift by 15 minutes (overlaps with original [11:00, 11:30), but it's the SAME appointment)
    resched = await client.put(
        f"/api/appointments/{apt_id}",
        headers=headers,
        json={
            "scheduled_date": target_date,
            "scheduled_time": "11:15",
            "end_time": "11:45",
            "reason": "Doctor delayed slightly",
        },
    )
    assert resched.status_code == 200
    assert resched.json()["scheduled_time"] == "11:15"
    assert resched.json()["end_time"] == "11:45"


@pytest.mark.asyncio
async def test_rescheduling_into_occupied_slot_fails(client):
    """Rescheduling an appointment into another active appointment's slot returns 409 Conflict."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    target_date = (date.today() + timedelta(days=6)).isoformat()

    # Appointment A: 10:00 - 10:30
    res_a = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 1,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "10:00",
            "end_time": "10:30",
        },
    )
    assert res_a.status_code == 201

    # Appointment B: 15:00 - 15:30
    res_b = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 2,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "15:00",
            "end_time": "15:30",
        },
    )
    assert res_b.status_code == 201
    apt_b_id = res_b.json()["id"]

    # Try rescheduling B into A's slot
    resched_fail = await client.put(
        f"/api/appointments/{apt_b_id}",
        headers=headers,
        json={
            "scheduled_date": target_date,
            "scheduled_time": "10:15",
            "end_time": "10:45",
        },
    )
    assert resched_fail.status_code == 409
    assert resched_fail.json()["detail"]["code"] == "DOCTOR_SLOT_OCCUPIED"


@pytest.mark.asyncio
async def test_invalid_status_transitions_rejected(client):
    """Invalid appointment lifecycle transitions are rejected with HTTP 400."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    target_date = (date.today() + timedelta(days=7)).isoformat()

    res = await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 1,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "16:00",
            "end_time": "16:30",
        },
    )
    assert res.status_code == 201
    apt_id = res.json()["id"]

    # scheduled cannot directly jump to completed without check-in/in-progress
    res_jump = await client.patch(
        f"/api/appointments/{apt_id}/status",
        headers=headers,
        json={"status": "completed"},
    )
    assert res_jump.status_code == 400
    assert res_jump.json()["detail"]["code"] == "INVALID_STATUS_TRANSITION"

    # Cancel the appointment
    cancel_res = await client.patch(
        f"/api/appointments/{apt_id}/status",
        headers=headers,
        json={"status": "cancelled", "cancellation_reason": "Patient requested cancellation"},
    )
    assert cancel_res.status_code == 200

    # Cannot transition a cancelled appointment back to scheduled or in_progress
    res_reactivate = await client.patch(
        f"/api/appointments/{apt_id}/status",
        headers=headers,
        json={"status": "scheduled"},
    )
    assert res_reactivate.status_code == 400
    assert res_reactivate.json()["detail"]["code"] == "INVALID_STATUS_TRANSITION"


@pytest.mark.asyncio
async def test_appointment_lifecycle_progression(client):
    """Appointment moves cleanly through scheduled -> checked_in -> in_progress -> completed."""
    reception_headers = make_auth_headers(user_id=4, role="receptionist", email="receptionist@medflow.com")
    doctor_headers = make_auth_headers(user_id=2, role="doctor", email="doctor@medflow.com")
    target_date = (date.today() + timedelta(days=8)).isoformat()

    # 1. Book (Receptionist)
    res = await client.post(
        "/api/appointments",
        headers=reception_headers,
        json={
            "patient_id": 1,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "09:00",
            "end_time": "09:30",
        },
    )
    assert res.status_code == 201
    apt_id = res.json()["id"]

    # 2. Check-in (Receptionist)
    res_checkin = await client.patch(
        f"/api/appointments/{apt_id}/status",
        headers=reception_headers,
        json={"status": "checked_in"},
    )
    assert res_checkin.status_code == 200
    assert res_checkin.json()["status"] == "checked_in"

    # 3. In Progress (Doctor)
    res_inp = await client.patch(
        f"/api/appointments/{apt_id}/status",
        headers=doctor_headers,
        json={"status": "in_progress"},
    )
    assert res_inp.status_code == 200
    assert res_inp.json()["status"] == "in_progress"

    # 4. Completed (Doctor)
    res_comp = await client.patch(
        f"/api/appointments/{apt_id}/status",
        headers=doctor_headers,
        json={"status": "completed"},
    )
    assert res_comp.status_code == 200
    assert res_comp.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_patient_self_booking_and_boundary_rules(client):
    """Patient role can book for self, but cannot book for another patient."""
    # User ID 3 is patient@medflow.com linked to Patient ID 1
    patient_headers = make_auth_headers(user_id=3, role="patient", email="patient@medflow.com")
    target_date = (date.today() + timedelta(days=9)).isoformat()

    # Booking for self (patient_id 1) -> 201 Created
    res_self = await client.post(
        "/api/appointments",
        headers=patient_headers,
        json={
            "patient_id": 1,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "12:00",
            "end_time": "12:30",
        },
    )
    assert res_self.status_code == 201

    # Attempt booking for patient_id 2 (not self) -> 403 Forbidden
    res_other = await client.post(
        "/api/appointments",
        headers=patient_headers,
        json={
            "patient_id": 2,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "13:00",
            "end_time": "13:30",
        },
    )
    assert res_other.status_code == 403
    assert res_other.json()["detail"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_available_slots_endpoint(client):
    """Available slots query returns accurate slots reflecting existing bookings."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    target_date = (date.today() + timedelta(days=10)).isoformat()

    # Book a slot at 10:00 - 10:30
    await client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patient_id": 1,
            "doctor_id": 1,
            "scheduled_date": target_date,
            "scheduled_time": "10:00",
            "end_time": "10:30",
        },
    )

    # Fetch slots
    resp = await client.get(
        f"/api/staff/doctors/1/available-slots?date={target_date}",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "slots" in data
    assert len(data["slots"]) > 0

    # The 10:00 slot must have available == False
    slot_10 = next((s for s in data["slots"] if s["start_time"] == "10:00"), None)
    assert slot_10 is not None
    assert slot_10["available"] is False

    # The 10:30 slot must have available == True
    slot_1030 = next((s for s in data["slots"] if s["start_time"] == "10:30"), None)
    assert slot_1030 is not None
    assert slot_1030["available"] is True


@pytest.mark.asyncio
async def test_appointment_queue_and_today_endpoints(client):
    """Queue and Today endpoints return correct lists according to date and check-in status."""
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    today = date.today().isoformat()

    # Book today appointment
    res = await client.post(
        "/api/appointments",
        headers=admin_headers,
        json={
            "patient_id": 1,
            "doctor_id": 1,
            "scheduled_date": today,
            "scheduled_time": "09:30",
            "end_time": "10:00",
            "reason": "Morning check",
        },
    )
    assert res.status_code == 201
    apt_id = res.json()["id"]

    # Check today's appointments
    today_res = await client.get("/api/appointments/today", headers=admin_headers)
    assert today_res.status_code == 200
    today_list = today_res.json()
    assert any(a["id"] == apt_id for a in today_list)

    # Check queue before check-in: not in queue
    q_before = await client.get("/api/appointments/queue", headers=admin_headers)
    assert not any(a["id"] == apt_id for a in q_before.json())

    # Check-in
    await client.patch(
        f"/api/appointments/{apt_id}/status",
        headers=admin_headers,
        json={"status": "checked_in"},
    )

    # Check queue after check-in: present!
    q_after = await client.get("/api/appointments/queue", headers=admin_headers)
    assert any(a["id"] == apt_id for a in q_after.json())


@pytest.mark.asyncio
async def test_concurrent_booking_attempts(client):
    """Two concurrent requests attempting to book the exact same slot result in exactly one success and one conflict."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    target_date = (date.today() + timedelta(days=12)).isoformat()

    payload_a = {
        "patient_id": 1,
        "doctor_id": 1,
        "scheduled_date": target_date,
        "scheduled_time": "15:00",
        "end_time": "15:30",
        "reason": "Concurrent candidate A",
    }
    payload_b = {
        "patient_id": 2,
        "doctor_id": 1,
        "scheduled_date": target_date,
        "scheduled_time": "15:00",
        "end_time": "15:30",
        "reason": "Concurrent candidate B",
    }

    # Fire both concurrently with asyncio.gather
    res1, res2 = await asyncio.gather(
        client.post("/api/appointments", headers=headers, json=payload_a),
        client.post("/api/appointments", headers=headers, json=payload_b),
    )

    statuses = [res1.status_code, res2.status_code]
    assert 201 in statuses
    assert 409 in statuses
