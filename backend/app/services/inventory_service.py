from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

import app.db.base  # noqa: F401
from app.models.inventory_model import Inventario
from app.models.lot_model import Lote
from app.models.movement_model import MovimientoInventario


class InventoryError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def descontar_fefo(
    db: Session,
    id_producto: int,
    id_sucursal: int,
    cantidad: int,
    *,
    id_venta: int | None = None,
    id_usuario: int | None = None,
) -> list[tuple[Lote, int]]:
    if cantidad <= 0:
        raise InventoryError(422, "La cantidad debe ser mayor a 0")

    lotes = db.scalars(
        select(Lote)
        .where(
            Lote.id_producto == id_producto,
            Lote.id_sucursal == id_sucursal,
            Lote.cantidad > 0,
            Lote.fecha_vencimiento >= date.today(),
        )
        .order_by(Lote.fecha_vencimiento, Lote.id_lote)
        .with_for_update()
    ).all()

    vendible = sum(l.cantidad for l in lotes)
    if vendible < cantidad:
        raise InventoryError(409, f"Stock vendible insuficiente: hay {vendible}, se pidieron {cantidad}")

    inv = db.scalar(
        select(Inventario)
        .where(Inventario.id_producto == id_producto, Inventario.id_sucursal == id_sucursal)
        .with_for_update()
    )
    if inv is None or inv.cantidad < cantidad:
        raise InventoryError(409, "Inventario insuficiente")

    restante, consumos = cantidad, []
    for lote in lotes:
        if restante == 0:
            break
        tomar = min(lote.cantidad, restante)
        lote.cantidad -= tomar
        db.add(
            MovimientoInventario(
                id_producto=id_producto,
                id_sucursal=id_sucursal,
                id_lote=lote.id_lote,
                tipo="venta",
                cantidad=-tomar,
                motivo="Venta (FEFO)",
                id_usuario=id_usuario,
                id_venta=id_venta,
            )
        )
        consumos.append((lote, tomar))
        restante -= tomar

    inv.cantidad -= cantidad
    db.flush()
    return consumos


def _query_lotes(id_sucursal: int | None):
    q = select(Lote).options(joinedload(Lote.producto)).where(Lote.cantidad > 0)
    if id_sucursal is not None:
        q = q.where(Lote.id_sucursal == id_sucursal)
    return q


def lotes_por_vencer(db: Session, dias: int, id_sucursal: int | None = None) -> list[Lote]:
    hoy = date.today()
    q = _query_lotes(id_sucursal).where(
        Lote.fecha_vencimiento >= hoy,
        Lote.fecha_vencimiento <= hoy + timedelta(days=dias),
    )
    return list(db.scalars(q.order_by(Lote.fecha_vencimiento, Lote.id_lote)).unique())


def lotes_vencidos(db: Session, id_sucursal: int | None = None) -> list[Lote]:
    q = _query_lotes(id_sucursal).where(Lote.fecha_vencimiento < date.today())
    return list(db.scalars(q.order_by(Lote.fecha_vencimiento, Lote.id_lote)).unique())