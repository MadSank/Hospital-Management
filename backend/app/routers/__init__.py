from app.routers.auth import router as auth_router
from app.routers.patients import router as patients_router
from app.routers.appointments import router as appointments_router
from app.routers.staff import router as staff_router
from app.routers.encounters import router as encounters_router
from app.routers.pharmacy import router as pharmacy_router, prescriptions_router
from app.routers.inpatient import (
    router as inpatient_router,
    wards_router,
    admissions_router,
)
from app.routers.billing import router as billing_router
from app.routers.reports import router as reports_router

__all__ = [
    "auth_router",
    "patients_router",
    "appointments_router",
    "staff_router",
    "encounters_router",
    "pharmacy_router",
    "prescriptions_router",
    "inpatient_router",
    "wards_router",
    "admissions_router",
    "billing_router",
    "reports_router",
]
