from datetime import date, datetime, time, timedelta, timezone
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, SessionLocal, engine
from app.models.user import Role, RoleEnum, User
from app.models.patient import Patient, EmergencyContact
from app.models.staff import Department, Staff, DoctorAvailability
from app.models.appointment import Appointment, AppointmentStatus, AppointmentType
from app.utils.security import hash_password

ROLES_DATA = [
    {
        "name": RoleEnum.ADMIN.value,
        "display_name": "Administrator",
        "description": "Full system administration, user management, and audit access.",
    },
    {
        "name": RoleEnum.DOCTOR.value,
        "display_name": "Doctor",
        "description": "Clinical encounters, diagnostics, prescriptions, and medical records.",
    },
    {
        "name": RoleEnum.RECEPTIONIST.value,
        "display_name": "Receptionist",
        "description": "Front desk patient check-in, registration, and appointment scheduling.",
    },
    {
        "name": RoleEnum.NURSE.value,
        "display_name": "Nurse",
        "description": "Triage vitals, inpatient nursing care, and medication administration.",
    },
    {
        "name": RoleEnum.PHARMACIST.value,
        "display_name": "Pharmacist",
        "description": "Pharmacy dispensary, medication inventory, and batch tracking.",
    },
    {
        "name": RoleEnum.LAB_TECHNICIAN.value,
        "display_name": "Lab Technician",
        "description": "Laboratory investigations, diagnostic test processing, and sample logs.",
    },
    {
        "name": RoleEnum.PATIENT.value,
        "display_name": "Patient",
        "description": "Patient portal for medical history, appointments, and billing.",
    },
]

DEMO_USERS = [
    {
        "email": "admin@medflow.com",
        "password": "Admin@123",
        "full_name": "Dr. Sarah Jenkins (Admin)",
        "role_name": "admin",
        "is_active": True,
    },
    {
        "email": "doctor@medflow.com",
        "password": "Doctor@123",
        "full_name": "Dr. Amit Patel, MD",
        "role_name": "doctor",
        "is_active": True,
    },
    {
        "email": "receptionist@medflow.com",
        "password": "Reception@123",
        "full_name": "Priya Sharma (Reception)",
        "role_name": "receptionist",
        "is_active": True,
    },
    {
        "email": "nurse@medflow.com",
        "password": "Nurse@123",
        "full_name": "Anjali Nair, RN",
        "role_name": "nurse",
        "is_active": True,
    },
    {
        "email": "pharmacist@medflow.com",
        "password": "Pharm@123",
        "full_name": "Vikram Malhotra (Pharmacist)",
        "role_name": "pharmacist",
        "is_active": True,
    },
    {
        "email": "lab@medflow.com",
        "password": "Lab@123",
        "full_name": "David Chen (Lab Tech)",
        "role_name": "lab_technician",
        "is_active": True,
    },
    {
        "email": "patient@medflow.com",
        "password": "Patient@123",
        "full_name": "Rahul Verma",
        "role_name": "patient",
        "is_active": True,
    },
    {
        "email": "disabled@medflow.com",
        "password": "Disabled@123",
        "full_name": "Deactivated User",
        "role_name": "patient",
        "is_active": False,
    },
]


def seed_database():
    """Seeds roles and demo users idempotently."""
    db = SessionLocal()
    try:
        print("[*] Seeding roles...")
        role_map = {}
        for r in ROLES_DATA:
            existing = db.query(Role).filter(Role.name == r["name"]).first()
            if not existing:
                role = Role(
                    name=r["name"],
                    display_name=r["display_name"],
                    description=r["description"],
                )
                db.add(role)
                db.flush()
                role_map[r["name"]] = role
                print(f"  + Added role: {r['name']}")
            else:
                role_map[r["name"]] = existing
                print(f"  = Existing role: {r['name']}")

        db.commit()

        print("\n[*] Seeding demo users...")
        for u in DEMO_USERS:
            existing_user = db.query(User).filter(User.email == u["email"]).first()
            role = role_map.get(u["role_name"])
            if not role:
                print(f"  ! Role not found for user: {u['email']}")
                continue

            if not existing_user:
                new_user = User(
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    full_name=u["full_name"],
                    role_id=role.id,
                    is_active=u["is_active"],
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                db.add(new_user)
                print(f"  + Created user: {u['email']} [{u['role_name']}]")
            else:
                # Update password hash and status to ensure demo accounts match credentials
                existing_user.password_hash = hash_password(u["password"])
                existing_user.full_name = u["full_name"]
                existing_user.role_id = role.id
                existing_user.is_active = u["is_active"]
                print(f"  ~ Synchronized user: {u['email']} [{u['role_name']}]")

        db.commit()

        print("\n[*] Seeding demo patients...")
        DEMO_PATIENTS = [
            {
                "patient_uid": "PAT-0001",
                "first_name": "Rahul",
                "last_name": "Sharma",
                "date_of_birth": date(1990, 5, 15),
                "gender": "male",
                "blood_group": "B+",
                "phone": "+91-9876543210",
                "email": "rahul.sharma@medflow-demo.com",
                "address": "123 Marine Drive",
                "city": "Mumbai",
                "state": "Maharashtra",
                "zip_code": "400001",
                "allergies": "Penicillin, Dust",
                "medical_history": "Type 2 Diabetes (Diagnosed 2020)",
                "notes": "Regular quarterly checkups required",
                "is_active": True,
                "contacts": [
                    {"name": "Priya Sharma", "relationship": "Spouse", "phone": "+91-9876543211"}
                ],
            },
            {
                "patient_uid": "PAT-0002",
                "first_name": "Anita",
                "last_name": "Desai",
                "date_of_birth": date(1985, 8, 22),
                "gender": "female",
                "blood_group": "A+",
                "phone": "+91-9876543220",
                "email": "anita.desai@medflow-demo.com",
                "address": "45 FC Road, Shivajinagar",
                "city": "Pune",
                "state": "Maharashtra",
                "zip_code": "411005",
                "allergies": "Sulfa drugs",
                "medical_history": "Hypertension, Migraine",
                "notes": "Prefers morning appointments",
                "is_active": True,
                "contacts": [
                    {"name": "Rajesh Desai", "relationship": "Brother", "phone": "+91-9876543221"}
                ],
            },
            {
                "patient_uid": "PAT-0003",
                "first_name": "Vikram",
                "last_name": "Mehta",
                "date_of_birth": date(1978, 11, 3),
                "gender": "male",
                "blood_group": "O+",
                "phone": "+91-9876543230",
                "email": "vikram.mehta@medflow-demo.com",
                "address": "78 Connaught Place",
                "city": "New Delhi",
                "state": "Delhi",
                "zip_code": "110001",
                "allergies": "None known",
                "medical_history": "Mild Asthma (since 2015)",
                "notes": "Seasonal inhaler user",
                "is_active": True,
                "contacts": [
                    {"name": "Sunita Mehta", "relationship": "Wife", "phone": "+91-9876543231"}
                ],
            },
            {
                "patient_uid": "PAT-0004",
                "first_name": "Sunita",
                "last_name": "Rao",
                "date_of_birth": date(1995, 2, 14),
                "gender": "female",
                "blood_group": "AB+",
                "phone": "+91-9876543240",
                "email": "sunita.rao@medflow-demo.com",
                "address": "12 Indiranagar 100ft Road",
                "city": "Bengaluru",
                "state": "Karnataka",
                "zip_code": "560038",
                "allergies": "Aspirin, Shellfish",
                "medical_history": "Hypothyroidism (Levothyroxine 50mcg)",
                "notes": "Annual thyroid panel monitoring",
                "is_active": True,
                "contacts": [
                    {"name": "Mohan Rao", "relationship": "Father", "phone": "+91-9876543241"}
                ],
            },
            {
                "patient_uid": "PAT-0005",
                "first_name": "Arjun",
                "last_name": "Kapoor",
                "date_of_birth": date(2002, 9, 30),
                "gender": "male",
                "blood_group": "O-",
                "phone": "+91-9876543250",
                "email": "arjun.kapoor@medflow-demo.com",
                "address": "88 Bandra West, Linking Road",
                "city": "Mumbai",
                "state": "Maharashtra",
                "zip_code": "400050",
                "allergies": "Peanuts",
                "medical_history": "Sports injury - ACL repair (2022)",
                "notes": "Physiotherapy follow-up completed",
                "is_active": True,
                "contacts": [
                    {"name": "Meera Kapoor", "relationship": "Mother", "phone": "+91-9876543251"}
                ],
            },
        ]

        # Link demo user patient@medflow.com to PAT-0001
        patient_user_account = db.query(User).filter(User.email == "patient@medflow.com").first()

        for p_data in DEMO_PATIENTS:
            existing_p = db.query(Patient).filter(Patient.patient_uid == p_data["patient_uid"]).first()
            if not existing_p:
                linked_uid = patient_user_account.id if (patient_user_account and p_data["patient_uid"] == "PAT-0001") else None
                new_patient = Patient(
                    user_id=linked_uid,
                    patient_uid=p_data["patient_uid"],
                    first_name=p_data["first_name"],
                    last_name=p_data["last_name"],
                    date_of_birth=p_data["date_of_birth"],
                    gender=p_data["gender"],
                    blood_group=p_data["blood_group"],
                    phone=p_data["phone"],
                    email=p_data["email"],
                    address=p_data["address"],
                    city=p_data["city"],
                    state=p_data["state"],
                    zip_code=p_data["zip_code"],
                    allergies=p_data["allergies"],
                    medical_history=p_data["medical_history"],
                    notes=p_data["notes"],
                    is_active=p_data["is_active"],
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                db.add(new_patient)
                db.flush()
                for c in p_data["contacts"]:
                    db.add(
                        EmergencyContact(
                            patient_id=new_patient.id,
                            name=c["name"],
                            relationship=c["relationship"],
                            phone=c["phone"],
                            created_at=datetime.now(timezone.utc),
                        )
                    )
                print(f"  + Created patient: {p_data['patient_uid']} ({p_data['first_name']} {p_data['last_name']})")
            else:
                print(f"  = Existing patient: {p_data['patient_uid']} ({p_data['first_name']} {p_data['last_name']})")

        db.commit()

        print("\n[*] Seeding departments...")
        DEPARTMENTS_DATA = [
            {"name": "Cardiology", "description": "Heart, cardiovascular diagnostics and care"},
            {"name": "General Medicine", "description": "Primary care, adult health and consultations"},
            {"name": "Pediatrics", "description": "Comprehensive child health and neonatal care"},
            {"name": "Orthopedics", "description": "Joint, bone, spine and musculoskeletal therapy"},
        ]
        dept_map = {}
        for d_data in DEPARTMENTS_DATA:
            dept = db.query(Department).filter(Department.name == d_data["name"]).first()
            if not dept:
                dept = Department(
                    name=d_data["name"],
                    description=d_data["description"],
                    is_active=True,
                )
                db.add(dept)
                db.flush()
                print(f"  + Added department: {dept.name}")
            else:
                print(f"  = Existing department: {dept.name}")
            dept_map[d_data["name"]] = dept
        db.commit()

        print("\n[*] Seeding staff / doctors...")
        # Link doctor@medflow.com to Dr. Amit Patel in Cardiology
        doctor_user = db.query(User).filter(User.email == "doctor@medflow.com").first()
        if doctor_user:
            doctor_staff = db.query(Staff).filter(Staff.user_id == doctor_user.id).first()
            if not doctor_staff:
                doctor_staff = Staff(
                    user_id=doctor_user.id,
                    staff_uid="STF-0001",
                    first_name="Amit",
                    last_name="Patel",
                    department_id=dept_map["Cardiology"].id,
                    specialty="Interventional Cardiology",
                    qualification="MD, DM (Cardiology)",
                    phone="+91-9876543220",
                    hire_date=date(2023, 1, 10),
                    is_active=True,
                )
                db.add(doctor_staff)
                db.flush()
                print(f"  + Created doctor staff profile: STF-0001 (Dr. Amit Patel)")
            else:
                print(f"  = Existing doctor staff profile: STF-0001 (Dr. Amit Patel)")

            # Seed weekly availability for Dr. Amit Patel (Monday to Friday, 09:00 - 13:00 and 14:00 - 17:00)
            existing_avail = db.query(DoctorAvailability).filter(DoctorAvailability.doctor_id == doctor_staff.id).count()
            if existing_avail == 0:
                print("  + Adding weekly availability schedule for Dr. Amit Patel (Mon-Fri 09:00-13:00, 14:00-17:00)...")
                for dow in range(5):  # 0=Monday to 4=Friday
                    # Morning block
                    db.add(DoctorAvailability(
                        doctor_id=doctor_staff.id,
                        day_of_week=dow,
                        start_time=time(9, 0),
                        end_time=time(13, 0),
                        slot_duration_minutes=30,
                        is_active=True,
                    ))
                    # Afternoon block
                    db.add(DoctorAvailability(
                        doctor_id=doctor_staff.id,
                        day_of_week=dow,
                        start_time=time(14, 0),
                        end_time=time(17, 0),
                        slot_duration_minutes=30,
                        is_active=True,
                    ))
                db.flush()

        # Link admin@medflow.com to Dr. Sarah Jenkins (Chief Physician) in General Medicine
        admin_user = db.query(User).filter(User.email == "admin@medflow.com").first()
        if admin_user:
            admin_staff = db.query(Staff).filter(Staff.user_id == admin_user.id).first()
            if not admin_staff:
                admin_staff = Staff(
                    user_id=admin_user.id,
                    staff_uid="STF-0002",
                    first_name="Sarah",
                    last_name="Jenkins",
                    department_id=dept_map["General Medicine"].id,
                    specialty="Internal Medicine",
                    qualification="MD, FACP",
                    phone="+91-9876543200",
                    hire_date=date(2021, 5, 1),
                    is_active=True,
                )
                db.add(admin_staff)
                db.flush()
                print(f"  + Created doctor staff profile: STF-0002 (Dr. Sarah Jenkins)")

                for dow in range(5):
                    db.add(DoctorAvailability(
                        doctor_id=admin_staff.id,
                        day_of_week=dow,
                        start_time=time(10, 0),
                        end_time=time(14, 0),
                        slot_duration_minutes=30,
                        is_active=True,
                    ))
                db.flush()
            else:
                print(f"  = Existing doctor staff profile: STF-0002 (Dr. Sarah Jenkins)")

        db.commit()

        print("\n[*] Seeding demo appointments...")
        if doctor_user:
            doc_profile = db.query(Staff).filter(Staff.user_id == doctor_user.id).first()
            p1 = db.query(Patient).filter(Patient.patient_uid == "PAT-0001").first()
            p2 = db.query(Patient).filter(Patient.patient_uid == "PAT-0002").first()
            p3 = db.query(Patient).filter(Patient.patient_uid == "PAT-0003").first()
            p4 = db.query(Patient).filter(Patient.patient_uid == "PAT-0004").first()

            today_date = date.today()
            tomorrow_date = today_date + timedelta(days=1)

            DEMO_APPOINTMENTS = [
                {
                    "appointment_uid": "APT-0001",
                    "patient_id": p1.id if p1 else 1,
                    "doctor_id": doc_profile.id,
                    "scheduled_date": today_date,
                    "scheduled_time": time(9, 30),
                    "end_time": time(10, 0),
                    "status": AppointmentStatus.CHECKED_IN.value,
                    "type": AppointmentType.CONSULTATION.value,
                    "reason": "Routine cardiac checkup and blood pressure monitoring",
                    "notes": "Patient arrived on time, vitals recorded by triage",
                },
                {
                    "appointment_uid": "APT-0002",
                    "patient_id": p2.id if p2 else 2,
                    "doctor_id": doc_profile.id,
                    "scheduled_date": today_date,
                    "scheduled_time": time(10, 30),
                    "end_time": time(11, 0),
                    "status": AppointmentStatus.SCHEDULED.value,
                    "type": AppointmentType.CONSULTATION.value,
                    "reason": "Chest discomfort review following medication change",
                    "notes": "Patient has sulfa allergy",
                },
                {
                    "appointment_uid": "APT-0003",
                    "patient_id": p3.id if p3 else 3,
                    "doctor_id": doc_profile.id,
                    "scheduled_date": tomorrow_date,
                    "scheduled_time": time(11, 0),
                    "end_time": time(11, 30),
                    "status": AppointmentStatus.SCHEDULED.value,
                    "type": AppointmentType.FOLLOW_UP.value,
                    "reason": "Post-discharge 2-week follow up examination",
                    "notes": "",
                },
                {
                    "appointment_uid": "APT-0004",
                    "patient_id": p4.id if p4 else 4,
                    "doctor_id": doc_profile.id,
                    "scheduled_date": tomorrow_date,
                    "scheduled_time": time(14, 0),
                    "end_time": time(14, 30),
                    "status": AppointmentStatus.SCHEDULED.value,
                    "type": AppointmentType.CONSULTATION.value,
                    "reason": "Thyroid and cardiovascular sync consultation",
                    "notes": "",
                },
            ]

            for a_data in DEMO_APPOINTMENTS:
                existing_apt = db.query(Appointment).filter(Appointment.appointment_uid == a_data["appointment_uid"]).first()
                if not existing_apt:
                    apt = Appointment(
                        appointment_uid=a_data["appointment_uid"],
                        patient_id=a_data["patient_id"],
                        doctor_id=a_data["doctor_id"],
                        scheduled_date=a_data["scheduled_date"],
                        scheduled_time=a_data["scheduled_time"],
                        end_time=a_data["end_time"],
                        status=a_data["status"],
                        type=a_data["type"],
                        reason=a_data["reason"],
                        notes=a_data["notes"],
                        created_by_id=admin_user.id if admin_user else None,
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc),
                    )
                    db.add(apt)
                    print(f"  + Created appointment: {a_data['appointment_uid']} ({a_data['scheduled_date']} {a_data['scheduled_time']})")
                else:
                    print(f"  = Existing appointment: {a_data['appointment_uid']}")

            db.commit()

            # --- Milestone 4: Medicines & Batches ---
            print("\nSeeding Pharmacy Medicines & Batches...")
            from app.models.pharmacy import Medicine, MedicineBatch, StockMovement, StockMovementType, Prescription, PrescriptionItem
            from app.models.inpatient import Ward, WardType, Bed, BedStatus, BedType, Admission, AdmissionStatus
            from app.models.encounter import Encounter, EncounterStatus, Vitals, Diagnosis

            DEMO_MEDICINES = [
                {
                    "medicine_uid": "MED-0001",
                    "name": "Amoxicillin",
                    "generic_name": "Amoxicillin Trihydrate",
                    "category": "Antibiotic",
                    "form": "capsule",
                    "strength": "500mg",
                    "manufacturer": "Cipla Ltd",
                    "unit_price": 12.50,
                    "reorder_level": 50,
                    "batch": {
                        "batch_number": "BTH-AMX-2026",
                        "quantity_received": 500,
                        "expiry_date": date.today() + timedelta(days=365),
                        "supplier": "Apex Pharma",
                    },
                },
                {
                    "medicine_uid": "MED-0002",
                    "name": "Paracetamol",
                    "generic_name": "Acetaminophen",
                    "category": "Analgesic",
                    "form": "tablet",
                    "strength": "500mg",
                    "manufacturer": "GSK Healthcare",
                    "unit_price": 3.00,
                    "reorder_level": 100,
                    "batch": {
                        "batch_number": "BTH-PCM-2026",
                        "quantity_received": 1000,
                        "expiry_date": date.today() + timedelta(days=500),
                        "supplier": "Apex Pharma",
                    },
                },
                {
                    "medicine_uid": "MED-0003",
                    "name": "Metformin",
                    "generic_name": "Metformin Hydrochloride",
                    "category": "Antidiabetic",
                    "form": "tablet",
                    "strength": "500mg",
                    "manufacturer": "Sun Pharma",
                    "unit_price": 8.00,
                    "reorder_level": 50,
                    "batch": {
                        "batch_number": "BTH-MET-2026",
                        "quantity_received": 300,
                        "expiry_date": date.today() + timedelta(days=400),
                        "supplier": "MedLife Dist",
                    },
                },
                {
                    "medicine_uid": "MED-0004",
                    "name": "Atorvastatin",
                    "generic_name": "Atorvastatin Calcium",
                    "category": "Cardiovascular",
                    "form": "tablet",
                    "strength": "20mg",
                    "manufacturer": "Pfizer Inc",
                    "unit_price": 18.00,
                    "reorder_level": 40,
                    "batch": {
                        "batch_number": "BTH-ATV-2026",
                        "quantity_received": 200,
                        "expiry_date": date.today() + timedelta(days=300),
                        "supplier": "Global Meds",
                    },
                },
                {
                    "medicine_uid": "MED-0005",
                    "name": "Azithromycin",
                    "generic_name": "Azithromycin Dihydrate",
                    "category": "Antibiotic",
                    "form": "tablet",
                    "strength": "250mg",
                    "manufacturer": "Lupin Pharma",
                    "unit_price": 25.00,
                    "reorder_level": 50,
                    "batch": {
                        "batch_number": "BTH-AZM-LOW",
                        "quantity_received": 15,
                        "expiry_date": date.today() + timedelta(days=60),
                        "supplier": "QuickSupply",
                    },
                },
            ]

            for m_data in DEMO_MEDICINES:
                med = db.query(Medicine).filter(Medicine.medicine_uid == m_data["medicine_uid"]).first()
                if not med:
                    med = Medicine(
                        medicine_uid=m_data["medicine_uid"],
                        name=m_data["name"],
                        generic_name=m_data["generic_name"],
                        category=m_data["category"],
                        form=m_data["form"],
                        strength=m_data["strength"],
                        manufacturer=m_data["manufacturer"],
                        unit_price=m_data["unit_price"],
                        reorder_level=m_data["reorder_level"],
                        is_active=True,
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc),
                    )
                    db.add(med)
                    db.flush()

                    b_info = m_data["batch"]
                    batch = MedicineBatch(
                        medicine_id=med.id,
                        batch_number=b_info["batch_number"],
                        quantity_received=b_info["quantity_received"],
                        quantity_remaining=b_info["quantity_received"],
                        expiry_date=b_info["expiry_date"],
                        received_date=date.today(),
                        supplier=b_info["supplier"],
                        cost_per_unit=m_data["unit_price"] * 0.7,
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc),
                    )
                    db.add(batch)
                    db.flush()

                    mv = StockMovement(
                        medicine_id=med.id,
                        batch_id=batch.id,
                        movement_type=StockMovementType.RECEIPT.value,
                        quantity=batch.quantity_received,
                        reference_type="initial_seed",
                        reference_id=batch.id,
                        performed_by=admin_user.id if admin_user else None,
                        notes="Initial seed inventory stock",
                        created_at=datetime.now(timezone.utc),
                    )
                    db.add(mv)
                    print(f"  + Created medicine: {med.name} ({med.medicine_uid}) with batch {batch.batch_number}")
                else:
                    print(f"  = Existing medicine: {med.name} ({med.medicine_uid})")

            # --- Milestone 4: Wards & Beds ---
            print("\nSeeding Wards & Beds...")
            DEMO_WARDS = [
                {
                    "name": "General Medical Ward A",
                    "ward_type": WardType.GENERAL.value,
                    "floor": "Floor 2",
                    "capacity": 10,
                    "beds": [
                        {"bed_number": "A-101", "bed_type": BedType.STANDARD.value, "daily_rate": 45.0},
                        {"bed_number": "A-102", "bed_type": BedType.STANDARD.value, "daily_rate": 45.0},
                        {"bed_number": "A-103", "bed_type": BedType.ELECTRIC.value, "daily_rate": 60.0},
                        {"bed_number": "A-104", "bed_type": BedType.STANDARD.value, "daily_rate": 45.0},
                    ],
                },
                {
                    "name": "Intensive Care Unit (ICU)",
                    "ward_type": WardType.ICU.value,
                    "floor": "Floor 3",
                    "capacity": 4,
                    "beds": [
                        {"bed_number": "ICU-01", "bed_type": BedType.ICU.value, "daily_rate": 200.0},
                        {"bed_number": "ICU-02", "bed_type": BedType.ICU.value, "daily_rate": 200.0},
                    ],
                },
                {
                    "name": "Pediatric Ward",
                    "ward_type": WardType.PEDIATRIC.value,
                    "floor": "Floor 1",
                    "capacity": 6,
                    "beds": [
                        {"bed_number": "PED-01", "bed_type": BedType.CRIB.value, "daily_rate": 50.0},
                        {"bed_number": "PED-02", "bed_type": BedType.STANDARD.value, "daily_rate": 50.0},
                    ],
                },
            ]

            first_admitted_bed = None
            for w_info in DEMO_WARDS:
                ward = db.query(Ward).filter(Ward.name == w_info["name"]).first()
                if not ward:
                    ward = Ward(
                        name=w_info["name"],
                        ward_type=w_info["ward_type"],
                        floor=w_info["floor"],
                        capacity=w_info["capacity"],
                        is_active=True,
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc),
                    )
                    db.add(ward)
                    db.flush()

                    for b_data in w_info["beds"]:
                        bed = Bed(
                            ward_id=ward.id,
                            bed_number=b_data["bed_number"],
                            bed_type=b_data["bed_type"],
                            status=BedStatus.AVAILABLE.value,
                            daily_rate=b_data["daily_rate"],
                            is_active=True,
                            created_at=datetime.now(timezone.utc),
                            updated_at=datetime.now(timezone.utc),
                        )
                        db.add(bed)
                        db.flush()
                        if not first_admitted_bed and w_info["name"] == "General Medical Ward A" and b_data["bed_number"] == "A-101":
                            first_admitted_bed = bed
                    print(f"  + Created ward: {ward.name} with {len(w_info['beds'])} beds")
                else:
                    print(f"  = Existing ward: {ward.name}")
                    if not first_admitted_bed:
                        first_admitted_bed = db.query(Bed).filter(Bed.ward_id == ward.id, Bed.bed_number == "A-101").first()

            # Seed demo admission for Patient 1 (Rahul Verma) if not present
            if first_admitted_bed and p1:
                adm = db.query(Admission).filter(Admission.admission_uid == "ADM-0001").first()
                if not adm:
                    adm = Admission(
                        admission_uid="ADM-0001",
                        patient_id=p1.id,
                        bed_id=first_admitted_bed.id,
                        admitting_doctor_id=doc_profile.id,
                        admission_date=datetime.now(timezone.utc) - timedelta(days=1),
                        status=AdmissionStatus.ADMITTED.value,
                        reason="Observation following acute chest pain and cardiac workup",
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc),
                    )
                    db.add(adm)
                    first_admitted_bed.status = BedStatus.OCCUPIED.value
                    print(f"  + Created admission ADM-0001 for {p1.first_name} {p1.last_name} in bed {first_admitted_bed.bed_number}")
                else:
                    print(f"  = Existing admission: ADM-0001")

            # Seed demo Clinical Encounter for Patient 1
            if p1 and doc_profile:
                enc = db.query(Encounter).filter(Encounter.encounter_uid == "ENC-0001").first()
                if not enc:
                    enc = Encounter(
                        encounter_uid="ENC-0001",
                        patient_id=p1.id,
                        doctor_id=doc_profile.id,
                        appointment_id=None,
                        encounter_date=datetime.now(timezone.utc) - timedelta(hours=3),
                        chief_complaint="Chest tightness, shortness of breath on exertion for 3 days",
                        history_of_present_illness="Patient reports retrosternal tightness radiating to left shoulder. No palpitations.",
                        examination_notes="Cardiovascular S1/S2 audible, regular rate. Lungs clear to auscultation bilaterally.",
                        assessment="Suspected angina pectoris. Hypertension stage 1.",
                        treatment_plan="Start Metformin 500mg, Atorvastatin 20mg. Schedule treadmill stress test.",
                        follow_up_date=date.today() + timedelta(days=14),
                        follow_up_notes="Review ECG and blood lipid profile in 2 weeks.",
                        status=EncounterStatus.COMPLETED.value,
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc),
                    )
                    db.add(enc)
                    db.flush()

                    # Add vitals
                    vitals = Vitals(
                        encounter_id=enc.id,
                        recorded_by=doc_profile.id,
                        temperature_f=98.4,
                        blood_pressure_systolic=135,
                        blood_pressure_diastolic=88,
                        heart_rate=78,
                        respiratory_rate=18,
                        oxygen_saturation=98.0,
                        weight_kg=78.5,
                        height_cm=175.0,
                        notes="Vitals stable at triage",
                        recorded_at=datetime.now(timezone.utc) - timedelta(hours=3),
                        created_at=datetime.now(timezone.utc) - timedelta(hours=3),
                    )
                    db.add(vitals)

                    # Add diagnosis
                    diag = Diagnosis(
                        encounter_id=enc.id,
                        diagnosis_code="I20.9",
                        diagnosis_name="Angina pectoris, unspecified",
                        diagnosis_type="primary",
                        notes="Clinical diagnosis pending cardiac enzymes",
                        created_at=datetime.now(timezone.utc) - timedelta(hours=3),
                    )
                    db.add(diag)
                    print(f"  + Created encounter ENC-0001 with vitals and ICD-10 diagnosis for {p1.first_name} {p1.last_name}")
                else:
                    print(f"  = Existing encounter: ENC-0001")

            # --- Milestone 5: Billing & Payments ---
            print("\nSeeding Billing & Payments...")
            from app.models.billing import Invoice, InvoiceItem, Payment, InvoiceStatus, PaymentMethod, PaymentStatus

            inv1 = db.query(Invoice).filter(Invoice.invoice_uid == "INV-0001").first()
            if not inv1 and p1:
                enc1 = db.query(Encounter).filter(Encounter.encounter_uid == "ENC-0001").first()
                inv1 = Invoice(
                    invoice_uid="INV-0001",
                    patient_id=p1.id,
                    encounter_id=enc1.id if enc1 else None,
                    subtotal=50.0,
                    discount_amount=0.0,
                    tax_amount=0.0,
                    total_amount=50.0,
                    paid_amount=50.0,
                    status=InvoiceStatus.PAID.value,
                    notes="Clinical Consultation Billing",
                    issued_date=datetime.now(timezone.utc) - timedelta(hours=2),
                    due_date=datetime.now(timezone.utc) + timedelta(days=14),
                    created_at=datetime.now(timezone.utc) - timedelta(hours=2),
                    updated_at=datetime.now(timezone.utc) - timedelta(hours=1),
                )
                db.add(inv1)
                db.flush()

                item1 = InvoiceItem(
                    invoice_id=inv1.id,
                    item_type="consultation",
                    description="Cardiology Consultation - Dr. Rajesh Sharma",
                    reference_type="encounter",
                    reference_id=enc1.id if enc1 else None,
                    quantity=1,
                    unit_price=50.0,
                    total_price=50.0,
                    created_at=datetime.now(timezone.utc) - timedelta(hours=2),
                )
                db.add(item1)

                pay1 = Payment(
                    payment_uid="PAY-0001",
                    invoice_id=inv1.id,
                    amount=50.0,
                    payment_method=PaymentMethod.CASH.value,
                    payment_date=datetime.now(timezone.utc) - timedelta(hours=1),
                    reference_number="CASH-REC-001",
                    notes="Full payment settled at cashier desk",
                    status="completed",
                    created_at=datetime.now(timezone.utc) - timedelta(hours=1),
                )
                db.add(pay1)
                print(f"  + Created paid invoice INV-0001 with payment PAY-0001 for {p1.first_name} {p1.last_name}")
            else:
                print("  = Existing invoice: INV-0001")

            inv2 = db.query(Invoice).filter(Invoice.invoice_uid == "INV-0002").first()
            p2 = db.query(Patient).filter(Patient.patient_uid == "PAT-0002").first()
            if not inv2 and p2:
                adm1 = db.query(Admission).filter(Admission.admission_uid == "ADM-0001").first()
                inv2 = Invoice(
                    invoice_uid="INV-0002",
                    patient_id=p2.id,
                    admission_id=adm1.id if adm1 else None,
                    subtotal=180.0,
                    discount_amount=0.0,
                    tax_amount=0.0,
                    total_amount=180.0,
                    paid_amount=90.0,
                    status=InvoiceStatus.PARTIALLY_PAID.value,
                    notes="Inpatient stay charges - General Ward A",
                    issued_date=datetime.now(timezone.utc) - timedelta(days=1),
                    due_date=datetime.now(timezone.utc) + timedelta(days=7),
                    created_at=datetime.now(timezone.utc) - timedelta(days=1),
                    updated_at=datetime.now(timezone.utc) - timedelta(hours=5),
                )
                db.add(inv2)
                db.flush()

                item2 = InvoiceItem(
                    invoice_id=inv2.id,
                    item_type="bed_charge",
                    description="Bed Accommodation (2 nights @ $45.00/night) - Bed A-101",
                    quantity=2,
                    unit_price=45.0,
                    total_price=90.0,
                    created_at=datetime.now(timezone.utc) - timedelta(days=1),
                )
                item3 = InvoiceItem(
                    invoice_id=inv2.id,
                    item_type="procedure",
                    description="Nursing & Diagnostic Care",
                    quantity=1,
                    unit_price=90.0,
                    total_price=90.0,
                    created_at=datetime.now(timezone.utc) - timedelta(days=1),
                )
                db.add(item2)
                db.add(item3)

                pay2 = Payment(
                    payment_uid="PAY-0002",
                    invoice_id=inv2.id,
                    amount=90.0,
                    payment_method=PaymentMethod.CARD.value,
                    payment_date=datetime.now(timezone.utc) - timedelta(hours=5),
                    reference_number="CARD-AUTH-98721",
                    notes="Initial deposit via simulated POS card",
                    status="completed",
                    created_at=datetime.now(timezone.utc) - timedelta(hours=5),
                )
                db.add(pay2)
                print(f"  + Created partially paid invoice INV-0002 with payment PAY-0002 for {p2.first_name} {p2.last_name}")
            else:
                print("  = Existing invoice: INV-0002")

            db.commit()
        print("\n[OK] Database seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Seeding failed: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
