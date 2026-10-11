import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import engine, Base
from sqlalchemy import inspect

client = TestClient(app)

print("=== [1] Verifying Database Schema in SQLite ===")
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"Tables present in medflow.db: {tables}")
assert "roles" in tables, "roles table missing"
assert "users" in tables, "users table missing"
assert "alembic_version" in tables, "alembic_version table missing"
print("[OK] All required tables present in database.")

print("\n=== [2] Testing Health Endpoint ===")
res_health = client.get("/health")
assert res_health.status_code == 200, f"Health check failed: {res_health.status_code}"
print(f"[OK] Health check returned 200: {res_health.json()}")

print("\n=== [3] Testing Admin Login ===")
res_login = client.post("/api/auth/login", json={"email": "admin@medflow.com", "password": "Admin@123"})
assert res_login.status_code == 200, f"Admin login failed: {res_login.status_code} {res_login.text}"
login_data = res_login.json()
admin_token = login_data["access_token"]
print(f"[OK] Admin logged in successfully! Role: {login_data['user']['role']}")

print("\n=== [4] Testing Invalid Credentials ===")
res_bad_pass = client.post("/api/auth/login", json={"email": "admin@medflow.com", "password": "WrongPassword"})
assert res_bad_pass.status_code == 401, f"Expected 401, got {res_bad_pass.status_code}"
print(f"[OK] Invalid password correctly rejected with 401: {res_bad_pass.json()}")

print("\n=== [5] Testing Disabled Account ===")
res_disabled = client.post("/api/auth/login", json={"email": "disabled@medflow.com", "password": "Disabled@123"})
assert res_disabled.status_code == 403, f"Expected 403, got {res_disabled.status_code}"
print(f"[OK] Disabled account correctly rejected with 403: {res_disabled.json()}")

print("\n=== [6] Testing Protected /api/auth/me Endpoint ===")
res_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
assert res_me.status_code == 200, f"Expected 200, got {res_me.status_code}"
print(f"[OK] Protected profile endpoint returned 200: {res_me.json()['email']}")

print("\n=== [7] Testing Role Authorization (Admin vs Doctor) ===")
# Admin accesses admin-only route
res_admin_only = client.get("/api/auth/admin-only", headers={"Authorization": f"Bearer {admin_token}"})
assert res_admin_only.status_code == 200, f"Expected 200 for admin, got {res_admin_only.status_code}"
print(f"[OK] Admin access permitted: {res_admin_only.json()['message']}")

# Doctor logs in and attempts to access admin-only route
res_doc_login = client.post("/api/auth/login", json={"email": "doctor@medflow.com", "password": "Doctor@123"})
assert res_doc_login.status_code == 200
doc_token = res_doc_login.json()["access_token"]

res_doc_forbidden = client.get("/api/auth/admin-only", headers={"Authorization": f"Bearer {doc_token}"})
assert res_doc_forbidden.status_code == 403, f"Expected 403 for doctor, got {res_doc_forbidden.status_code}"
print(f"[OK] Doctor access correctly denied with 403: {res_doc_forbidden.json()}")

print("\n=== [8] All Milestone 1 Backend Verification Checks Passed Successfully! ===")
