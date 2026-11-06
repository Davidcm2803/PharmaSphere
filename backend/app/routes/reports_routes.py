from datetime import date, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.services import report_service

MAX_DIAS = 366

# Todos los reportes son solo para admin (401 sin token, 403 si no es admin)
router = APIRouter(dependencies=[Depends(require_role("admin"))])


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    return report_service.get_summary(db)


@router.get("/sales-by-day")
def sales_by_day(
    desde: Optional[date] = Query(None, description="AAAA-MM-DD (por defecto, hace 30 días)"),
    hasta: Optional[date] = Query(None, description="AAAA-MM-DD (por defecto, hoy)"),
    id_sucursal: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    hasta = hasta or report_service.today_cr()
    desde = desde or hasta - timedelta(days=29)
    if desde > hasta:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "desde no puede ser posterior a hasta")
    if (hasta - desde).days >= MAX_DIAS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"El rango máximo es de {MAX_DIAS} días")
    return report_service.get_sales_by_day(db, desde, hasta, id_sucursal)


@router.get("/top-products")
def top_products(
    limit: int = Query(5, ge=1, le=50),
    orden: Literal["unidades", "ingresos"] = "unidades",
    db: Session = Depends(get_db),
):
    return report_service.get_top_products(db, limit, orden)


@router.get("/branches")
def branches(db: Session = Depends(get_db)):
    return report_service.get_branch_ranking(db)


@router.get("/most-viewed")
def most_viewed(limit: int = Query(6, ge=1, le=20), db: Session = Depends(get_db)):
    return report_service.get_most_viewed(db, limit)


@router.get("/alerts")
def alerts(db: Session = Depends(get_db)):
    return report_service.get_alerts(db)


@router.get("/movements")
def movements(limit: int = Query(6, ge=1, le=50), db: Session = Depends(get_db)):
    return report_service.get_movements(db, limit)