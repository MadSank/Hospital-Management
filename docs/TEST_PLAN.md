# Test Plan

## 1. Testing Stack

| Tool | Purpose |
|------|---------|
| **pytest** | Backend test runner and assertions |
| **httpx** | Async test client for FastAPI |
| **pytest-asyncio** | Async test support |
| **factory-boy** (optional) | Test fixture factories |
| **Vitest** | Frontend unit test runner (if time permits) |
| **React Testing Library** | Component testing (if time permits) |

> **Priority:** Backend API tests are the primary focus. Frontend tests are stretch goals for Milestone 12.

## 2. Test Database Strategy

- Tests use a **separate in-memory SQLite database** (`sqlite:///:memory:`).
- Each test module gets a fresh database with all migrations applied.
- A shared `conftest.py` provides:
  - `db_session`: A database session scoped per test function (rolled back after each test).
  - `client`: An `httpx.AsyncClient` configured to use the test database.
  - `auth_headers(role)`: Helper that creates a user with the given role and returns JWT auth headers.
  - Seed fixtures: roles, departments, sample users, patients, medicines, lab tests, wards, beds.

### conftest.py Structure

```python
# backend/tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.utils.security import create_access_token

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")

def auth_headers(user_id: int, role: str) -> dict:
    token = create_access_token({"sub": str(user_id), "role": role})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def seed_roles(db_session):
    """Create all 7 roles in the test database."""
    ...

@pytest.fixture
def seed_admin(db_session, seed_roles):
    """Create an admin user."""
    ...
```

## 3. Test Categories and Cases

### 3.1 Authentication Tests (`test_auth.py`)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Login with valid credentials | 200, returns JWT and user info |
| 2 | Login with wrong password | 401, error message |
| 3 | Login with non-existent email | 401, error message (same as wrong password) |
| 4 | Login with disabled account | 403, account disabled message |
| 5 | Access /api/auth/me with valid token | 200, returns user profile |
| 6 | Access /api/auth/me without token | 401 |
| 7 | Access /api/auth/me with expired token | 401 |
| 8 | Access /api/auth/me with malformed token | 401 |
| 9 | Change password with correct current | 200, success |
| 10 | Change password with wrong current | 400, error |
| 11 | Change password with weak new password | 422, validation error |

### 3.2 Patient Tests (`test_patients.py`)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | List patients as admin | 200, paginated list |
| 2 | List patients as patient | 403 |
| 3 | Create patient with valid data | 201, patient with UID |
| 4 | Create patient with missing required fields | 422 |
| 5 | Create patient with duplicate phone | 409 |
| 6 | Get patient detail as admin | 200, full profile |
| 7 | Get patient detail as different patient | 403 |
| 8 | Get patient detail as own patient | 200 |
| 9 | Update patient as receptionist | 200 |
| 10 | Update patient as pharmacist | 403 |
| 11 | Search patients by name | 200, filtered results |
| 12 | Filter patients by gender | 200, filtered results |
| 13 | Patient list pagination | Correct page/total/pages |
| 14 | Create patient with emergency contacts | 201, contacts saved |
| 15 | Get patient encounters list | 200, encounter history |

### 3.3 Appointment Tests (`test_appointments.py`)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Book appointment in available slot | 201 |
| 2 | Book appointment in occupied slot | 409, conflict |
| 3 | Book appointment outside doctor availability | 400 |
| 4 | Book appointment in the past | 400 |
| 5 | Book duplicate for same patient at same time | 409 |
| 6 | Cancel appointment with reason | 200, status cancelled |
| 7 | Cancel without reason | 400 |
| 8 | Check in scheduled appointment | 200, status checked_in |
| 9 | Check in cancelled appointment | 400, invalid transition |
| 10 | Complete without going through in_progress | 400 |
| 11 | Valid lifecycle: scheduled→checked_in→in_progress→completed | All 200 |
| 12 | No-show from scheduled | 200 |
| 13 | Reschedule appointment | 200, new time set |
| 14 | Patient books own appointment | 201 |
| 15 | Patient books appointment for another patient | 403 |
| 16 | Today's appointments for doctor | Only doctor's appointments |
| 17 | Queue returns only checked-in patients | Correct filtering |

### 3.4 Encounter Tests (`test_encounters.py`)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Create encounter as doctor | 201 |
| 2 | Create encounter as nurse | 403 |
| 3 | Create encounter with appointment link | Appointment → in_progress |
| 4 | Create encounter for appointment that already has one | 409 |
| 5 | Add vitals as nurse | 201 |
| 6 | Add vitals as pharmacist | 403 |
| 7 | Add diagnosis as doctor | 201 |
| 8 | Complete encounter | Status completed, appointment completed |
| 9 | Get encounter detail with vitals and diagnoses | 200, nested data |
| 10 | Patient views own encounter | 200 |
| 11 | Patient views other's encounter | 403 |

### 3.5 Prescription Tests (`test_prescriptions.py`)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Create prescription with items | 201, items linked |
| 2 | Create prescription as non-doctor | 403 |
| 3 | Prescription references valid medicines | Items have medicine names |
| 4 | Get prescription print data | 200, formatted data |
| 5 | Patient views own prescriptions | 200 |
| 6 | Patient views other's prescriptions | 403 |
| 7 | Pharmacist views all pending prescriptions | 200 |

### 3.6 Pharmacy Tests (`test_pharmacy.py`)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Create medicine | 201 |
| 2 | Add batch to medicine | 201, stock movement created |
| 3 | Dispense prescription with sufficient stock | 200 |
| 4 | Dispense with insufficient stock | 400 |
| 5 | Dispense already-dispensed prescription | 409 |
| 6 | Batch quantity_remaining decrements correctly | Exact match |
| 7 | Stock movement recorded on dispense | Movement type = dispensed |
| 8 | Low-stock alert triggered | Alert in response |
| 9 | Near-expiry alert for batch expiring in 30 days | Alert in response |
| 10 | Negative inventory prevention | quantity_remaining >= 0 |
| 11 | Dispense partial prescription | Status = partially_dispensed |
| 12 | Dispense remaining items | Status = dispensed |
| 13 | Non-pharmacist cannot dispense | 403 |

### 3.7 Laboratory Tests (`test_laboratory.py`)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Create lab order from encounter | 201 |
| 2 | Collect samples for order | Status → sample_collected |
| 3 | Enter result for order item | 201, result saved |
| 4 | Abnormal flag auto-set when result out of range | is_abnormal = True |
| 5 | Normal result not flagged | is_abnormal = False |
| 6 | Verify result | verified_by and verified_at set |
| 7 | All items verified → order completed | Status = completed |
| 8 | Lab report data for completed order | 200, all results |
| 9 | Patient cannot see in-progress results | 403 or filtered out |
| 10 | Patient can see completed results | 200 |
| 11 | Non-lab-tech cannot enter results | 403 |

### 3.8 Billing Tests (`test_billing.py`)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Create invoice with items | 201, totals calculated |
| 2 | Subtotal = sum of (qty × unit_price) | Exact decimal match |
| 3 | Tax calculated correctly | Exact decimal match |
| 4 | Discount applied correctly | Exact decimal match |
| 5 | Total = subtotal - discount + tax | Exact decimal match |
| 6 | Issue draft invoice | Status → issued |
| 7 | Record full payment | Status → paid |
| 8 | Record partial payment | Status → partially_paid |
| 9 | Overpayment rejected | 400 |
| 10 | Payment on draft invoice rejected | 409 |
| 11 | Payment on cancelled invoice rejected | 409 |
| 12 | Multiple partial payments update balance correctly | paid_amount matches sum |
| 13 | Patient views own invoice | 200 |
| 14 | Patient views other's invoice | 403 |

### 3.9 Ward and Admission Tests (`test_wards.py`)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Create ward with beds | 201 |
| 2 | Admit patient to available bed | 201, bed → occupied |
| 3 | Admit to occupied bed | 409 |
| 4 | Admit patient with active admission | 409 |
| 5 | Transfer patient to new bed | Old bed freed, new bed occupied |
| 6 | Discharge patient | Bed → available, admission → discharged |
| 7 | Discharge generates bed charge duration | Days calculated correctly |
| 8 | Set bed to maintenance | Status updated |
| 9 | Admit to maintenance bed | 409 |
| 10 | Bed occupancy stats | Correct counts |

### 3.10 Security Tests (`test_security.py`)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | All protected endpoints reject unauthenticated requests | 401 |
| 2 | Patient cannot access admin endpoints | 403 |
| 3 | Receptionist cannot access doctor-only endpoints | 403 |
| 4 | Lab tech cannot dispense medicine | 403 |
| 5 | Nurse cannot create prescriptions | 403 |
| 6 | Patient accessing another patient's records | 403 |
| 7 | Doctor accessing non-assigned patient records | 403 |
| 8 | SQL injection in search parameter | Parameterized, no injection |
| 9 | XSS payload in text field | Stored safely, not executed |
| 10 | Invalid appointment status transition | 400 |
| 11 | Expired JWT token | 401 |
| 12 | Tampered JWT token | 401 |

## 4. Test Execution

### Commands

```powershell
# Run all backend tests
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest tests/ -v --tb=short

# Run specific test file
python -m pytest tests/test_auth.py -v

# Run specific test
python -m pytest tests/test_auth.py::test_login_success -v

# Run with coverage report
python -m pytest tests/ -v --cov=app --cov-report=term-missing

# Run only security tests
python -m pytest tests/test_security.py -v
```

### Test Dependencies (add to requirements.txt)
```
pytest>=8.0
pytest-asyncio>=0.23
httpx>=0.27
pytest-cov>=5.0
```

## 5. Manual Verification Checklist

For each milestone, verify these manually in the browser:

- [ ] Page loads without console errors
- [ ] Forms validate on submit (show inline errors)
- [ ] Forms validate on blur (immediate feedback)
- [ ] Submit button shows loading state
- [ ] Success toast appears after successful operation
- [ ] Error toast appears after failed operation
- [ ] Tables paginate correctly
- [ ] Search filters update table in real-time (debounced)
- [ ] Status badges show correct colors
- [ ] Navigation breadcrumbs are accurate
- [ ] Back button works correctly
- [ ] Page refreshing preserves logged-in state
- [ ] Logout clears all state

## 6. Test Data Fixtures

### Sample Users for Testing

```python
ADMIN_USER = {"email": "test.admin@medflow.com", "password": "Test@123", "role": "admin"}
DOCTOR_USER = {"email": "test.doctor@medflow.com", "password": "Test@123", "role": "doctor"}
RECEPTIONIST_USER = {"email": "test.reception@medflow.com", "password": "Test@123", "role": "receptionist"}
NURSE_USER = {"email": "test.nurse@medflow.com", "password": "Test@123", "role": "nurse"}
PHARMACIST_USER = {"email": "test.pharma@medflow.com", "password": "Test@123", "role": "pharmacist"}
LAB_TECH_USER = {"email": "test.lab@medflow.com", "password": "Test@123", "role": "lab_technician"}
PATIENT_USER = {"email": "test.patient@medflow.com", "password": "Test@123", "role": "patient"}
```

### Sample Patient Data

```python
SAMPLE_PATIENT = {
    "first_name": "Test",
    "last_name": "Patient",
    "date_of_birth": "1990-01-15",
    "gender": "male",
    "blood_group": "O+",
    "phone": "+91-9999999999",
    "email": "test.patient@example.com",
    "address": "123 Test Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zip_code": "400001"
}
```

### Sample Medicine Data

```python
SAMPLE_MEDICINE = {
    "name": "Test Amoxicillin",
    "generic_name": "Amoxicillin",
    "category": "Antibiotic",
    "form": "capsule",
    "strength": "500mg",
    "unit_price": "25.00",
    "reorder_level": 50
}
```

## 7. Continuous Testing Protocol

During implementation, after each milestone:

1. Run `pytest tests/ -v` — all tests must pass.
2. If a new test fails, fix the issue before proceeding to the next milestone.
3. If an existing test breaks (regression), investigate and fix before proceeding.
4. Add new tests for the milestone's features.
5. Run manual verification checklist for the milestone's UI changes.
6. Report test results in the milestone completion report.
