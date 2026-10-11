from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_any_role
from app.models.user import RoleEnum, User
from app.schemas.reports import DashboardReportResponse
from app.services.report_service import get_dashboard_report

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


@router.get("/summary", response_model=DashboardReportResponse)
def get_reports_summary(
    start_date: Optional[datetime] = Query(None, description="Start date filter (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date filter (ISO format)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_role([
            RoleEnum.ADMIN,
            RoleEnum.DOCTOR,
            RoleEnum.NURSE,
            RoleEnum.RECEPTIONIST,
            RoleEnum.PHARMACIST,
        ])
    ),
):
    """Generate high-level operational and financial KPIs across all hospital departments."""
    return get_dashboard_report(db, start_date=start_date, end_date=end_date)
