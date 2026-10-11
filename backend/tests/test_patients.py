from datetime import date, timedelta
import pytest
from tests.conftest import make_auth_headers


@pytest.mark.asyncio
async def test_list_patients_as_admin(client):
    """Admin can list patients with pagination and metadata."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    resp = await client.get("/api/patients", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "per_page" in data
    assert "pages" in data


@pytest.mark.asyncio
async def test_list_patients_forbidden_for_patient_role(client):
    """Patient role cannot list all hospital patients."""
    headers = make_auth_headers(user_id=3, role="patient", email="patient@medflow.com")
    resp = await client.get("/api/patients", headers=headers)
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "FORBIDDEN_ROLE"


@pytest.mark.asyncio
async def test_create_patient_success(client):
    """Admin can create a new patient with emergency contacts and receives generated MRN."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    payload = {
        "first_name": "Kavita",
        "last_name": "Krishnan",
        "date_of_birth": "1994-07-20",
        "gender": "female",
        "blood_group": "O+",
        "phone": "+91-9876549999",
        "email": "kavita.k@example.com",
        "address": "504 Palm Grove",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "zip_code": "600001",
        "allergies": "None",
        "medical_history": "None",
        "emergency_contacts": [
            {
                "name": "Ramesh Krishnan",
                "relationship": "Father",
                "phone": "+91-9876548888",
            }
        ],
    }
    resp = await client.post("/api/patients", headers=headers, json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["first_name"] == "Kavita"
    assert data["last_name"] == "Krishnan"
    assert data["patient_uid"].startswith("PAT-")
    assert len(data["emergency_contacts"]) == 1
    assert data["emergency_contacts"][0]["name"] == "Ramesh Krishnan"


@pytest.mark.asyncio
async def test_create_patient_duplicate_phone_rejected(client):
    """Submitting an existing phone number returns 409 Conflict."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    payload = {
        "first_name": "Test1",
        "last_name": "Duplicate",
        "date_of_birth": "1990-01-01",
        "gender": "male",
        "phone": "+91-9999999991",
    }
    res1 = await client.post("/api/patients", headers=headers, json=payload)
    assert res1.status_code == 201

    # Attempt second patient with identical phone
    res2 = await client.post("/api/patients", headers=headers, json=payload)
    assert res2.status_code == 409
    assert res2.json()["detail"]["code"] == "DUPLICATE_PHONE"


@pytest.mark.asyncio
async def test_create_patient_duplicate_email_rejected(client):
    """Submitting an existing email returns 409 Conflict."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    payload1 = {
        "first_name": "Alpha",
        "last_name": "One",
        "date_of_birth": "1992-02-02",
        "gender": "male",
        "phone": "+91-9999999992",
        "email": "shared@example.com",
    }
    payload2 = {
        "first_name": "Beta",
        "last_name": "Two",
        "date_of_birth": "1993-03-03",
        "gender": "female",
        "phone": "+91-9999999993",
        "email": "shared@example.com",
    }
    res1 = await client.post("/api/patients", headers=headers, json=payload1)
    assert res1.status_code == 201

    res2 = await client.post("/api/patients", headers=headers, json=payload2)
    assert res2.status_code == 409
    assert res2.json()["detail"]["code"] == "DUPLICATE_EMAIL"


@pytest.mark.asyncio
async def test_create_patient_invalid_future_dob(client):
    """Submitting a future date of birth fails validation with 422."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    payload = {
        "first_name": "Future",
        "last_name": "Baby",
        "date_of_birth": tomorrow,
        "gender": "male",
        "phone": "+91-9999999994",
    }
    resp = await client.post("/api/patients", headers=headers, json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_patient_invalid_gender(client):
    """Submitting an invalid gender string fails validation with 422."""
    headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    payload = {
        "first_name": "Invalid",
        "last_name": "Gender",
        "date_of_birth": "1990-01-01",
        "gender": "unknown_alien",
        "phone": "+91-9999999995",
    }
    resp = await client.post("/api/patients", headers=headers, json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_patient_unauthorized_roles(client):
    """Doctor and Nurse cannot register new patients directly; only Admin and Receptionist can."""
    doctor_headers = make_auth_headers(user_id=2, role="doctor", email="doctor@medflow.com")
    payload = {
        "first_name": "Doc",
        "last_name": "Patient",
        "date_of_birth": "1990-01-01",
        "gender": "male",
        "phone": "+91-9999999996",
    }
    resp = await client.post("/api/patients", headers=doctor_headers, json=payload)
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "FORBIDDEN_ROLE"


@pytest.mark.asyncio
async def test_get_patient_detail_as_doctor(client):
    """Doctors can view patient demographic and medical details."""
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    payload = {
        "first_name": "Clinical",
        "last_name": "Subject",
        "date_of_birth": "1988-10-10",
        "gender": "female",
        "phone": "+91-9999999997",
        "allergies": "Aspirin",
    }
    create_res = await client.post("/api/patients", headers=admin_headers, json=payload)
    patient_id = create_res.json()["id"]

    doctor_headers = make_auth_headers(user_id=2, role="doctor", email="doctor@medflow.com")
    detail_res = await client.get(f"/api/patients/{patient_id}", headers=doctor_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["first_name"] == "Clinical"
    assert detail_res.json()["allergies"] == "Aspirin"


@pytest.mark.asyncio
async def test_patient_self_access_rules(client):
    """Patient role can view their own record, but is blocked from other patients."""
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")

    # Create patient 1 (unlinked)
    p1_res = await client.post(
        "/api/patients",
        headers=admin_headers,
        json={
            "first_name": "Other",
            "last_name": "Patient",
            "date_of_birth": "1980-01-01",
            "gender": "male",
            "phone": "+91-9999999901",
        },
    )
    p1_id = p1_res.json()["id"]

    # User 3 (patient role) attempting to access Patient 1 record
    patient_headers = make_auth_headers(user_id=3, role="patient", email="patient@medflow.com")
    forbidden_res = await client.get(f"/api/patients/{p1_id}", headers=patient_headers)
    assert forbidden_res.status_code == 403
    assert forbidden_res.json()["detail"]["code"] == "FORBIDDEN_PATIENT_ACCESS"


@pytest.mark.asyncio
async def test_search_and_filter_patients(client):
    """Verify search by name, phone, blood group, and gender."""
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")

    # Seed distinct test patients
    await client.post(
        "/api/patients",
        headers=admin_headers,
        json={
            "first_name": "Sanjay",
            "last_name": "Gupta",
            "date_of_birth": "1985-05-05",
            "gender": "male",
            "blood_group": "AB-",
            "phone": "+91-9870001111",
            "city": "Kolkata",
        },
    )
    await client.post(
        "/api/patients",
        headers=admin_headers,
        json={
            "first_name": "Meera",
            "last_name": "Nambiar",
            "date_of_birth": "1991-06-06",
            "gender": "female",
            "blood_group": "A+",
            "phone": "+91-9870002222",
            "city": "Kochi",
        },
    )

    # Search by first name
    s1 = await client.get("/api/patients?search=Sanjay", headers=admin_headers)
    assert s1.status_code == 200
    assert any(p["first_name"] == "Sanjay" for p in s1.json()["items"])

    # Filter by gender
    s2 = await client.get("/api/patients?gender=female", headers=admin_headers)
    assert s2.status_code == 200
    assert all(p["gender"] == "female" for p in s2.json()["items"])

    # Filter by blood group
    s3 = await client.get("/api/patients?blood_group=AB-", headers=admin_headers)
    assert s3.status_code == 200
    assert any(p["blood_group"] == "AB-" for p in s3.json()["items"])


@pytest.mark.asyncio
async def test_update_patient_information(client):
    """Receptionist updates patient address and emergency contacts."""
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    create_res = await client.post(
        "/api/patients",
        headers=admin_headers,
        json={
            "first_name": "Harish",
            "last_name": "Reddy",
            "date_of_birth": "1975-03-12",
            "gender": "male",
            "phone": "+91-9870003333",
            "city": "Hyderabad",
        },
    )
    p_id = create_res.json()["id"]

    # Receptionist updates city and allergies
    reception_headers = make_auth_headers(user_id=4, role="receptionist", email="receptionist@medflow.com")
    update_res = await client.put(
        f"/api/patients/{p_id}",
        headers=reception_headers,
        json={
            "city": "Secunderabad",
            "allergies": "Ibuprofen",
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["city"] == "Secunderabad"
    assert update_res.json()["allergies"] == "Ibuprofen"


@pytest.mark.asyncio
async def test_archive_patient(client):
    """Archiving a patient marks is_active to False."""
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    create_res = await client.post(
        "/api/patients",
        headers=admin_headers,
        json={
            "first_name": "Archive",
            "last_name": "Target",
            "date_of_birth": "1988-12-12",
            "gender": "other",
            "phone": "+91-9870004444",
        },
    )
    p_id = create_res.json()["id"]

    del_res = await client.delete(f"/api/patients/{p_id}", headers=admin_headers)
    assert del_res.status_code == 200

    # Verify patient is now inactive
    detail_res = await client.get(f"/api/patients/{p_id}", headers=admin_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["is_active"] is False


@pytest.mark.asyncio
async def test_patient_not_found(client):
    """Accessing non-existent patient returns 404."""
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    resp = await client.get("/api/patients/99999", headers=admin_headers)
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "PATIENT_NOT_FOUND"


@pytest.mark.asyncio
async def test_unauthenticated_patient_access_rejected(client):
    """Unauthenticated requests to patient endpoints return 401."""
    resp = await client.get("/api/patients")
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "UNAUTHENTICATED"
