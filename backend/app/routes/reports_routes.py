from datetime import date, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.schemas.report_schema import (
    GananciaOut,
    LoteVencimientoOut,
    ProductoVendidoOut,
    StockBajoOut,
    SucursalVentasOut,
)
from app.services import report_export_service, report_service

MAX_DIAS = 366
DIAS_PERMITIDOS = (7, 30, 90)

# Todos los reportes son solo para admin (401 sin token, 403 si no es admin)
router = APIRouter(dependencies=[Depends(require_role("admin"))])


def _rango(desde: Optional[date], hasta: Optional[date]) -> tuple[date, date]:
    """Rango de fechas de un reporte: por defecto los últimos 30 días hasta hoy (hora de Costa Rica)."""
    hasta = hasta or report_service.today_cr()
    desde = desde or hasta - timedelta(days=29)
    if desde > hasta:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "desde no puede ser posterior a hasta")
    if (hasta - desde).days >= MAX_DIAS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"El rango máximo es de {MAX_DIAS} días")
    return desde, hasta


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
    desde, hasta = _rango(desde, hasta)
    return report_service.get_sales_by_day(db, desde, hasta, id_sucursal)


@router.get("/sales-by-branch", response_model=list[SucursalVentasOut])
def sales_by_branch(
    desde: Optional[date] = Query(None, description="AAAA-MM-DD (por defecto, hace 30 días)"),
    hasta: Optional[date] = Query(None, description="AAAA-MM-DD (por defecto, hoy)"),
    db: Session = Depends(get_db),
):
    desde, hasta = _rango(desde, hasta)
    return report_service.get_sales_by_branch(db, desde, hasta)


@router.get("/sales-by-product", response_model=list[ProductoVendidoOut])
def sales_by_product(
    desde: Optional[date] = Query(None, description="AAAA-MM-DD (por defecto, hace 30 días)"),
    hasta: Optional[date] = Query(None, description="AAAA-MM-DD (por defecto, hoy)"),
    id_sucursal: Optional[int] = Query(None, ge=1),
    orden: Literal["unidades", "ingresos"] = "ingresos",
    limit: Optional[int] = Query(None, ge=1, le=500, description="Sin límite por defecto"),
    db: Session = Depends(get_db),
):
    desde, hasta = _rango(desde, hasta)
    return report_service.get_sales_by_product(db, desde, hasta, id_sucursal, orden, limit)


@router.get("/top-products", response_model=list[ProductoVendidoOut])
def top_products(
    limit: int = Query(5, ge=1, le=50),
    orden: Literal["unidades", "ingresos"] = "unidades",
    desde: Optional[date] = Query(None, description="AAAA-MM-DD. Sin fechas es el acumulado histórico"),
    hasta: Optional[date] = Query(None, description="AAAA-MM-DD. Sin fechas es el acumulado histórico"),
    db: Session = Depends(get_db),
):
    if desde and hasta and desde > hasta:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "desde no puede ser posterior a hasta")
    return report_service.get_top_products(db, limit, orden, desde, hasta)


@router.get("/profit", response_model=GananciaOut)
def profit(
    desde: Optional[date] = Query(None, description="AAAA-MM-DD (por defecto, hace 30 días)"),
    hasta: Optional[date] = Query(None, description="AAAA-MM-DD (por defecto, hoy)"),
    id_sucursal: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    desde, hasta = _rango(desde, hasta)
    return report_service.get_profit(db, desde, hasta, id_sucursal)


@router.get("/low-stock", response_model=list[StockBajoOut])
def low_stock(id_sucursal: Optional[int] = Query(None, ge=1), db: Session = Depends(get_db)):
    return report_service.get_low_stock(db, id_sucursal)


@router.get("/expiring", response_model=list[LoteVencimientoOut])
def expiring(
    dias: int = Query(report_service.DIAS_POR_VENCER, ge=1, le=365, description="Vencen dentro de N días"),
    incluir_vencidos: bool = True,
    id_sucursal: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    return report_service.get_expiring(db, dias, incluir_vencidos, id_sucursal)


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


@router.get("/export")
def export_csv(
    tipo: Optional[Literal["ventas", "productos", "sucursales", "inventario"]] = Query(
        None, description="Sin tipo: reporte general de los últimos `dias` días"
    ),
    dias: int = Query(30, description="Solo para el reporte general (7, 30 o 90)"),
    desde: Optional[date] = Query(None, description="AAAA-MM-DD, solo con tipo"),
    hasta: Optional[date] = Query(None, description="AAAA-MM-DD, solo con tipo"),
    db: Session = Depends(get_db),
):
    if tipo is None:
        if dias not in DIAS_PERMITIDOS:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "dias debe ser 7, 30 o 90")
        contenido = report_export_service.build_report_csv(db, dias)
        nombre = f"reporte_pharmasphere_{dias}d_{report_service.today_cr():%Y-%m-%d}.csv"
    else:
        desde, hasta = _rango(desde, hasta)
        contenido = report_export_service.build_typed_csv(db, tipo, desde, hasta)
        nombre = f"reporte_{tipo}_{desde:%Y-%m-%d}_{hasta:%Y-%m-%d}.csv"
    return Response(
        content=contenido,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )
