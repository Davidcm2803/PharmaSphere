from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.lot_model import Lote
from app.schemas.inventory_schema import LoteVencimientoOut
from app.schemas.purchase_schema import LoteOut
from app.services import inventory_service

router = APIRouter()


def _out(lote: Lote) -> LoteVencimientoOut:
    datos = LoteOut.model_validate(lote).model_dump()
    return LoteVencimientoOut(
        **datos,
        nombre_producto=lote.producto.nombre,
        dias_para_vencer=(lote.fecha_vencimiento - date.today()).days,
    )


@router.get("/")
def list_inventory():
    return {"message": "inventory endpoint working"}


@router.get("/expiring", response_model=list[LoteVencimientoOut])
def por_vencer(
    days: int = Query(30, ge=1, le=365),
    id_sucursal: int | None = None,
    db: Session = Depends(get_db),
):
    return [_out(l) for l in inventory_service.lotes_por_vencer(db, days, id_sucursal)]


@router.get("/expired", response_model=list[LoteVencimientoOut])
def vencidos(id_sucursal: int | None = None, db: Session = Depends(get_db)):
    return [_out(l) for l in inventory_service.lotes_vencidos(db, id_sucursal)]