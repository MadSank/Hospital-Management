from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
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

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Middleware
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handler for HTTPException to guarantee standard error envelope
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    # If exc.detail is already a dict, return it as detail
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


# Exception handler for RequestValidationError (422)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = list(err.get("loc", []))
        # Filter out body/query prefix for cleaner field identification
        field_name = loc[-1] if loc else "unknown"
        errors.append({
            "loc": loc,
            "msg": err.get("msg", "Validation error"),
            "type": err.get("type", "value_error"),
            "field": str(field_name),
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": errors},
    )


# Health check endpoints
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
    }


# Include Routers with /api/v1 prefix
app.include_router(auth_router, prefix="/api/v1")
app.include_router(patients_router, prefix="/api/v1")
app.include_router(appointments_router, prefix="/api/v1")
app.include_router(staff_router, prefix="/api/v1")
app.include_router(encounters_router, prefix="/api/v1")
app.include_router(pharmacy_router, prefix="/api/v1")
app.include_router(prescriptions_router, prefix="/api/v1")
app.include_router(inpatient_router, prefix="/api/v1")
app.include_router(wards_router, prefix="/api/v1")
app.include_router(admissions_router, prefix="/api/v1")
app.include_router(billing_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")

# Aliases with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(patients_router, prefix="/api")
app.include_router(appointments_router, prefix="/api")
app.include_router(staff_router, prefix="/api")
app.include_router(encounters_router, prefix="/api")
app.include_router(pharmacy_router, prefix="/api")
app.include_router(prescriptions_router, prefix="/api")
app.include_router(inpatient_router, prefix="/api")
app.include_router(wards_router, prefix="/api")
app.include_router(admissions_router, prefix="/api")
app.include_router(billing_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
