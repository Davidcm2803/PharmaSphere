from datetime import date, timedelta
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

import app.db.base  # noqa: F401
from app.models.branch_model import Sucursal
from app.models.inventory_model import Inventario
from app.models.lot_model import Lote
from app.models.movement_model import MovimientoInventario
from app.models.product_model import Producto
from app.schemas.inventory_schema import StockAdjustIn, StockTransferIn
from app.utils.sql import escape_like


class InventoryError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


# helpers
def _item(
    inv: Optional[Inventario],
    *,
    id_producto: int,
    producto_nombre: str,
    categoria: Optional[str],
    id_sucursal: int,
    sucursal_nombre: str,
) -> dict:
    cantidad = inv.cantidad if inv else 0
    minimo = inv.stock_minimo if inv else 0
    return {
        "id_inventario": inv.id_inventario if inv else None,
        "id_producto": id_producto,
        "producto_nombre": producto_nombre,
        "categoria": categoria,
        "id_sucursal": id_sucursal,
        "sucursal_nombre": sucursal_nombre,
        "cantidad": cantidad,
        "stock_minimo": minimo,
        # Stock bajo = por debajo del minimo
        "stock_bajo": cantidad < minimo,
    }


def _active_branch(db: Session, id_sucursal: int, label: str = "La sucursal") -> Sucursal:
    branch = db.get(Sucursal, id_sucursal)
    if branch is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{label} no existe")
    if not branch.activo:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{label} ({branch.nombre}) está inactiva")
    return branch


def _product(db: Session, id_producto: int) -> Producto:
    producto = db.get(Producto, id_producto)
    if producto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    return producto


# consultas
def list_inventory(
    db: Session,
    *,
    id_sucursal: Optional[int],
    id_producto: Optional[int],
    q: Optional[str],
    low_stock: bool,
) -> List[dict]:
    stmt = (
        select(Inventario, Producto.nombre, Producto.categoria, Sucursal.nombre)
        .join(Producto, Producto.id_producto == Inventario.id_producto)
        .join(Sucursal, Sucursal.id_sucursal == Inventario.id_sucursal)
        .where(Producto.activo.is_(True))
    )
    if id_sucursal is not None:
        stmt = stmt.where(Inventario.id_sucursal == id_sucursal)
    if id_producto is not None:
        stmt = stmt.where(Inventario.id_producto == id_producto)
    if q and q.strip():
        stmt = stmt.where(Producto.nombre.ilike(f"%{escape_like(q.strip())}%", escape="\\"))
    if low_stock:
        stmt = stmt.where(Inventario.cantidad < Inventario.stock_minimo)
    stmt = stmt.order_by(func.lower(Producto.nombre), Sucursal.nombre)

    return [
        _item(
            inv,
            id_producto=inv.id_producto,
            producto_nombre=p_nombre,
            categoria=categoria,
            id_sucursal=inv.id_sucursal,
            sucursal_nombre=s_nombre,
        )
        for inv, p_nombre, categoria, s_nombre in db.execute(stmt).all()
    ]


# Stock de un producto en CADA sucursal activa
def get_product_stock(db: Session, id_producto: int) -> List[dict]:
    producto = _product(db, id_producto)
    stmt = (
        select(Sucursal, Inventario)
        .outerjoin(
            Inventario,
            and_(
                Inventario.id_sucursal == Sucursal.id_sucursal,
                Inventario.id_producto == id_producto,
            ),
        )
        .where(Sucursal.activo.is_(True))
        .order_by(func.lower(Sucursal.nombre))
    )
    return [
        _item(
            inv,
            id_producto=producto.id_producto,
            producto_nombre=producto.nombre,
            categoria=producto.categoria,
            id_sucursal=sucursal.id_sucursal,
            sucursal_nombre=sucursal.nombre,
        )
        for sucursal, inv in db.execute(stmt).all()
    ]


# stock total por producto (suma de todas las sucursales)
def list_stock_totals(db: Session, *, limite: int = 10, ascendente: bool = False) -> List[dict]:
    total = func.coalesce(func.sum(Inventario.cantidad), 0).label("total")
    stmt = (
        select(Producto.nombre, Producto.categoria, total)
        .outerjoin(Inventario, Inventario.id_producto == Producto.id_producto)
        .where(Producto.activo.is_(True))
        .group_by(Producto.id_producto, Producto.nombre, Producto.categoria)
        .order_by(total.asc() if ascendente else total.desc(), func.lower(Producto.nombre))
        .limit(limite)
    )
    return [
        {"producto": nombre, "categoria": categoria, "stock_total": int(cantidad)}
        for nombre, categoria, cantidad in db.execute(stmt).all()
    ]


# ajuste manual
def adjust_stock(db: Session, data: StockAdjustIn, id_usuario: int) -> dict:
    branch = _active_branch(db, data.id_sucursal)
    producto = _product(db, data.id_producto)

    try:
        inv = db.scalars(
            select(Inventario)
            .where(
                Inventario.id_producto == data.id_producto,
                Inventario.id_sucursal == data.id_sucursal,
            )
            .with_for_update()
        ).first()

        if inv is None:
            if data.cantidad < 0:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    f"No hay stock de este producto en {branch.nombre}",
                )
            inv = Inventario(
                id_producto=data.id_producto,
                id_sucursal=data.id_sucursal,
                cantidad=0,
                stock_minimo=0,
            )
            db.add(inv)

        nuevo = inv.cantidad + data.cantidad
        if nuevo < 0:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"El stock no puede quedar negativo (stock actual: {inv.cantidad})",
            )
        inv.cantidad = nuevo

        db.add(
            MovimientoInventario(
                id_producto=data.id_producto,
                id_sucursal=data.id_sucursal,
                tipo="ajuste",
                cantidad=data.cantidad,
                motivo=data.motivo,
                id_usuario=id_usuario,
            )
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Conflicto al actualizar el inventario, intenta de nuevo")
    except Exception:
        db.rollback()
        raise

    db.refresh(inv)
    return _item(
        inv,
        id_producto=producto.id_producto,
        producto_nombre=producto.nombre,
        categoria=producto.categoria,
        id_sucursal=branch.id_sucursal,
        sucursal_nombre=branch.nombre,
    )


# transferencia
def transfer_stock(db: Session, data: StockTransferIn, id_usuario: int) -> dict:
    """Resta en origen y suma en destino en UNA transacción: o pasa todo o no pasa nada."""
    origen = _active_branch(db, data.id_origen, "La sucursal de origen")
    destino = _active_branch(db, data.id_destino, "La sucursal de destino")
    producto = _product(db, data.id_producto)

    try:
        # Se bloquean ambas filas en orden fijo (por id_sucursal) para evitar deadlocks
        rows = db.scalars(
            select(Inventario)
            .where(
                Inventario.id_producto == data.id_producto,
                Inventario.id_sucursal.in_([data.id_origen, data.id_destino]),
            )
            .order_by(Inventario.id_sucursal)
            .with_for_update()
        ).all()
        by_branch = {r.id_sucursal: r for r in rows}

        inv_origen = by_branch.get(data.id_origen)
        disponible = inv_origen.cantidad if inv_origen else 0
        if disponible < data.cantidad:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Stock insuficiente en {origen.nombre}: disponible {disponible}, solicitado {data.cantidad}",
            )

        inv_destino = by_branch.get(data.id_destino)
        if inv_destino is None:
            inv_destino = Inventario(
                id_producto=data.id_producto,
                id_sucursal=data.id_destino,
                cantidad=0,
                stock_minimo=0,
            )
            db.add(inv_destino)

        inv_origen.cantidad -= data.cantidad
        inv_destino.cantidad += data.cantidad

        base = data.motivo or "Transferencia entre sucursales"
        db.add_all(
            [
                MovimientoInventario(
                    id_producto=data.id_producto,
                    id_sucursal=data.id_origen,
                    tipo="transferencia_salida",
                    cantidad=-data.cantidad,
                    motivo=f"{base} → {destino.nombre}"[:255],
                    id_usuario=id_usuario,
                ),
                MovimientoInventario(
                    id_producto=data.id_producto,
                    id_sucursal=data.id_destino,
                    tipo="transferencia_entrada",
                    cantidad=data.cantidad,
                    motivo=f"{base} ← {origen.nombre}"[:255],
                    id_usuario=id_usuario,
                ),
            ]
        )
        db.commit()  # unico commit: si algo falló antes, no se guardó nada
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Conflicto al transferir el stock, intenta de nuevo")
    except Exception:
        db.rollback()
        raise

    db.refresh(inv_origen)
    db.refresh(inv_destino)
    return {
        "id_producto": producto.id_producto,
        "producto_nombre": producto.nombre,
        "id_origen": data.id_origen,
        "id_destino": data.id_destino,
        "cantidad": data.cantidad,
        "stock_origen": inv_origen.cantidad,
        "stock_destino": inv_destino.cantidad,
    }


# FEFO (first expired, first out)
def descontar_fefo(
    db: Session,
    id_producto: int,
    id_sucursal: int,
    cantidad: int,
    *,
    id_venta: int | None = None,
    id_usuario: int | None = None,
) -> list[tuple[Lote, int]]:
    """Descuenta de los lotes vigentes que vencen primero. No hace commit: lo hace el llamador."""
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