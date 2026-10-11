import asyncio
import os
import sys
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, get_db
from app.main import app
from app.models.user import Role, RoleEnum, User
from app.utils.security import create_access_token, hash_password

TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture
def db_session():
    """Provides a fresh isolated in-memory SQLite database session for each test."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    # Pre-seed essential roles
    roles = [
        Role(name=RoleEnum.ADMIN.value, display_name="Administrator"),
        Role(name=RoleEnum.DOCTOR.value, display_name="Doctor"),
        Role(name=RoleEnum.RECEPTIONIST.value, display_name="Receptionist"),
        Role(name=RoleEnum.NURSE.value, display_name="Nurse"),
        Role(name=RoleEnum.PHARMACIST.value, display_name="Pharmacist"),
        Role(name=RoleEnum.LAB_TECHNICIAN.value, display_name="Lab Technician"),
        Role(name=RoleEnum.PATIENT.value, display_name="Patient"),
    ]
    session.add_all(roles)
    session.commit()

    # Pre-seed standard test users
    admin_role = session.query(Role).filter(Role.name == "admin").first()
    doctor_role = session.query(Role).filter(Role.name == "doctor").first()
    patient_role = session.query(Role).filter(Role.name == "patient").first()
    receptionist_role = session.query(Role).filter(Role.name == "receptionist").first()
    nurse_role = session.query(Role).filter(Role.name == "nurse").first()
    pharmacist_role = session.query(Role).filter(Role.name == "pharmacist").first()

    admin_user = User(
        email="admin@medflow.com",
        password_hash=hash_password("Admin@123"),
        full_name="System Administrator",
        role_id=admin_role.id,
        is_active=True,
    )
    doctor_user = User(
        email="doctor@medflow.com",
        password_hash=hash_password("Doctor@123"),
        full_name="Dr. Amit Patel",
        role_id=doctor_role.id,
        is_active=True,
    )
    patient_user = User(
        email="patient@medflow.com",
        password_hash=hash_password("Patient@123"),
        full_name="Rahul Sharma",
        role_id=patient_role.id,
        is_active=True,
    )
    receptionist_user = User(
        email="receptionist@medflow.com",
        password_hash=hash_password("Reception@123"),
        full_name="Priya Sharma",
        role_id=receptionist_role.id,
        is_active=True,
    )
    nurse_user = User(
        email="nurse@medflow.com",
        password_hash=hash_password("Nurse@123"),
        full_name="Anjali Nair",
        role_id=nurse_role.id,
        is_active=True,
    )
    pharmacist_user = User(
        email="pharmacist@medflow.com",
        password_hash=hash_password("Pharm@123"),
        full_name="Vikram Malhotra",
        role_id=pharmacist_role.id,
        is_active=True,
    )
    disabled_user = User(
        email="disabled@medflow.com",
        password_hash=hash_password("Disabled@123"),
        full_name="Disabled User",
        role_id=patient_role.id,
        is_active=False,
    )
    session.add_all([admin_user, doctor_user, patient_user, receptionist_user, nurse_user, pharmacist_user, disabled_user])
    session.commit()

    from datetime import date, time
    from app.models.patient import Patient
    from app.models.staff import Department, Staff, DoctorAvailability

    dept = Department(name="Cardiology", description="Cardiology Clinic", is_active=True)
    session.add(dept)
    session.commit()

    doctor_staff = Staff(
        user_id=doctor_user.id,
        staff_uid="STF-0001",
        first_name="Amit",
        last_name="Patel",
        department_id=dept.id,
        specialty="Cardiology",
        qualification="MD",
        phone="+91-9876543220",
        is_active=True,
    )
    session.add(doctor_staff)
    session.commit()

    for dow in range(7):
        session.add(
            DoctorAvailability(
                doctor_id=doctor_staff.id,
                day_of_week=dow,
                start_time=time(9, 0),
                end_time=time(18, 0),
                slot_duration_minutes=30,
                is_active=True,
            )
        )
    session.commit()

    test_patient = Patient(
        user_id=patient_user.id,
        patient_uid="PAT-0001",
        first_name="Rahul",
        last_name="Sharma",
        date_of_birth=date(1990, 5, 15),
        gender="male",
        blood_group="B+",
        phone="+91-9876543210",
        email="patient@medflow.com",
        is_active=True,
    )
    test_patient_2 = Patient(
        user_id=None,
        patient_uid="PAT-0002",
        first_name="Anita",
        last_name="Desai",
        date_of_birth=date(1985, 8, 22),
        gender="female",
        blood_group="A+",
        phone="+91-9876543220",
        email="anita@medflow.com",
        is_active=True,
    )
    session.add_all([test_patient, test_patient_2])
    session.commit()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest_asyncio.fixture
async def client(db_session):
    """Provides an AsyncClient connected to the FastAPI app with the test DB session override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def make_auth_headers(user_id: int, role: str, email: str = "") -> dict:
    """Helper to generate Authorization headers with a valid JWT."""
    token = create_access_token({"sub": str(user_id), "role": role, "email": email})
    return {"Authorization": f"Bearer {token}"}
