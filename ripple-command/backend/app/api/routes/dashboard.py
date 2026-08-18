from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.dashboard_service import get_dashboard_summary

router = APIRouter()


@router.get("/dashboard/summary")
def dashboard_summary(session: Session = Depends(get_db)):
    return get_dashboard_summary(session)
