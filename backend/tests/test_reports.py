import pytest
from httpx import AsyncClient
from tests.conftest import make_auth_headers


@pytest.mark.asyncio
async def test_dashboard_report_summary_success(client: AsyncClient, db_session):
    admin_headers = make_auth_headers(user_id=1, role="admin", email="admin@medflow.com")
    resp = await client.get("/api/v1/reports/summary", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert "appointments" in data
    assert "encounters" in data
    assert "patients" in data
    assert "inpatient" in data
    assert "pharmacy" in data
    assert "financial" in data
    assert "revenue_by_method" in data

    # Check structural fields
    assert isinstance(data["appointments"]["total"], int)
    assert isinstance(data["patients"]["total"], int)
    assert isinstance(data["inpatient"]["total_beds"], int)
    assert isinstance(data["inpatient"]["occupancy_rate_percent"], (int, float))
    assert isinstance(data["pharmacy"]["total_medicines"], int)
    assert isinstance(data["financial"]["total_invoiced"], (int, float))
    assert isinstance(data["financial"]["total_paid"], (int, float))
    assert isinstance(data["financial"]["total_outstanding"], (int, float))


@pytest.mark.asyncio
async def test_dashboard_report_forbidden_for_patient(client: AsyncClient, db_session):
    patient_headers = make_auth_headers(user_id=3, role="patient", email="patient@medflow.com")
    resp = await client.get("/api/v1/reports/summary", headers=patient_headers)
    assert resp.status_code == 403
