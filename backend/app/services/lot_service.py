from datetime import date
from typing import List

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.branch_model import Sucursal
from app.models.lot_model import Lote
from app.models.product_model import Producto


# lotes con stock que vencen entre desde y hasta (si desde es pasado, incluye los ya vencidos)
def list_expiring(db: Session, *, desde: date, hasta: date, limite: int = 50) -> List[dict]:
    stmt = (
        select(Lote, Producto.nombre, Sucursal.nombre)
        .join(Producto, Producto.id_producto == Lote.id_producto)
        .join(Sucursal, Sucursal.id_sucursal == Lote.id_sucursal)
        .where(
            Producto.activo.is_(True),
            Lote.cantidad > 0,
            Lote.fecha_vencimiento >= desde,
            Lote.fecha_vencimiento <= hasta,
        )
        .order_by(Lote.fecha_vencimiento, func.lower(Producto.nombre), Lote.id_lote)
        .limit(limite)
    )
    hoy = date.today()
    return [
        {
            "id_lote": lote.id_lote,
            "producto_nombre": producto,
            "sucursal_nombre": sucursal,
            "numero_lote": lote.numero_lote,
            "fecha_vencimiento": lote.fecha_vencimiento,
            "cantidad": lote.cantidad,
            "ya_vencido": lote.fecha_vencimiento < hoy,
        }
        for lote, producto, sucursal in db.execute(stmt).all()
    ]