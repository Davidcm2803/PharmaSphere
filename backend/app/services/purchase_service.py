from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

import app.db.base  # noqa: F401  (registra todos los modelos)
from app.core import cache
from app.models.branch_model import Sucursal
from app.models.inventory_model import Inventario
from app.models.lot_model import Lote
from app.models.movement_model import MovimientoInventario
from app.models.product_model import Producto
from app.models.purchase_model import Compra, DetalleCompra
from app.models.supplier_model import Proveedor
from app.schemas.purchase_schema import CompraCreate, CompraReceive
from app.utils.pagination import PageParams, paginate


class PurchaseError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def crear_compra(db: Session, datos: CompraCreate) -> Compra:
    proveedor = db.get(Proveedor, datos.id_proveedor)
    if proveedor is None or not proveedor.activo:
        raise PurchaseError(404, "Proveedor no encontrado o inactivo")
    sucursal = db.get(Sucursal, datos.id_sucursal)
    if sucursal is None or not sucursal.activo:
        raise PurchaseError(404, "Sucursal no encontrada o inactiva")

    ids = [d.id_producto for d in datos.detalles]
    existentes = set(db.scalars(select(Producto.id_producto).where(Producto.id_producto.in_(ids))))
    faltantes = sorted(set(ids) - existentes)
    if faltantes:
        raise PurchaseError(404, f"Productos inexistentes: {faltantes}")

    compra = Compra(
        id_proveedor=datos.id_proveedor,
        id_sucursal=datos.id_sucursal,
        id_usuario=datos.id_usuario,
        estado="pendiente",
        total=sum((d.cantidad * d.costo_unitario for d in datos.detalles), Decimal("0")),
        detalles=[
            DetalleCompra(
                id_producto=d.id_producto,
                cantidad=d.cantidad,
                costo_unitario=d.costo_unitario,
            )
            for d in datos.detalles
        ],
    )
    db.add(compra)
    db.commit()
    cache.invalidate_stock()
    db.refresh(compra)
    return compra


def recibir_compra(
    db: Session, id_compra: int, datos: CompraReceive, id_usuario: int | None = None
) -> tuple[Compra, list[Lote]]:
    try:
        compra = db.scalar(
            select(Compra)
            .where(Compra.id_compra == id_compra)
            .options(selectinload(Compra.detalles))
            .with_for_update()
        )
        if compra is None:
            raise PurchaseError(404, "Compra no encontrada")
        if compra.estado != "pendiente":
            raise PurchaseError(409, f"La compra ya está '{compra.estado}'")

        pedido = {d.id_producto: d.cantidad for d in compra.detalles}
        lineas = {l.id_producto: l for l in datos.lineas}
        if len(lineas) != len(datos.lineas):
            raise PurchaseError(422, "Producto repetido en la recepción")
        if lineas.keys() != pedido.keys():
            raise PurchaseError(422, "La recepción debe incluir exactamente los productos de la orden")

        hoy = date.today()
        for id_producto, linea in lineas.items():
            if sum(l.cantidad for l in linea.lotes) != pedido[id_producto]:
                raise PurchaseError(422, f"Producto {id_producto}: la suma de lotes no coincide con lo pedido")
            numeros = [l.numero_lote for l in linea.lotes]
            if len(numeros) != len(set(numeros)):
                raise PurchaseError(422, f"Producto {id_producto}: número de lote repetido")
            if any(l.fecha_vencimiento <= hoy for l in linea.lotes):
                raise PurchaseError(422, f"Producto {id_producto}: no se pueden recibir lotes ya vencidos")

        lotes_afectados: list[Lote] = []
        for id_producto, linea in lineas.items():
            for l in linea.lotes:
                lote = db.scalar(
                    select(Lote)
                    .where(
                        Lote.id_producto == id_producto,
                        Lote.id_sucursal == compra.id_sucursal,
                        Lote.numero_lote == l.numero_lote,
                    )
                    .with_for_update()
                )
                if lote is not None:
                    if lote.fecha_vencimiento != l.fecha_vencimiento:
                        raise PurchaseError(409, f"El lote {l.numero_lote} ya existe con otro vencimiento")
                    lote.cantidad += l.cantidad
                else:
                    lote = Lote(
                        id_producto=id_producto,
                        id_sucursal=compra.id_sucursal,
                        id_compra=compra.id_compra,
                        numero_lote=l.numero_lote,
                        fecha_vencimiento=l.fecha_vencimiento,
                        cantidad=l.cantidad,
                    )
                    db.add(lote)
                    db.flush()
                db.add(
                    MovimientoInventario(
                        id_producto=id_producto,
                        id_sucursal=compra.id_sucursal,
                        id_lote=lote.id_lote,
                        tipo="compra",
                        cantidad=l.cantidad,
                        motivo=f"Recepción compra #{compra.id_compra}",
                        id_usuario=id_usuario,
                        id_compra=compra.id_compra,
                    )
                )
                lotes_afectados.append(lote)

            total = pedido[id_producto]
            inv = db.scalar(
                select(Inventario)
                .where(Inventario.id_producto == id_producto, Inventario.id_sucursal == compra.id_sucursal)
                .with_for_update()
            )
            if inv is None:
                db.add(Inventario(id_producto=id_producto, id_sucursal=compra.id_sucursal, cantidad=total, stock_minimo=0))
            else:
                inv.cantidad += total

        compra.estado = "recibida"
        compra.fecha_recepcion = datetime.now()
        db.commit()
        cache.invalidate_stock()
        db.refresh(compra)
        return compra, lotes_afectados
    except Exception:
        db.rollback()
        raise


def list_purchases(
    db: Session,
    *,
    estado: str | None,
    id_proveedor: int | None,
    id_sucursal: int | None,
    params: PageParams,
) -> tuple[list[dict], int]:
    n_productos = (
        select(func.count(DetalleCompra.id_detallecompra))
        .where(DetalleCompra.id_compra == Compra.id_compra)
        .correlate(Compra)
        .scalar_subquery()
    )
    stmt = (
        select(Compra, Proveedor.nombre, Sucursal.nombre, n_productos)
        .join(Proveedor, Proveedor.id_proveedor == Compra.id_proveedor)
        .join(Sucursal, Sucursal.id_sucursal == Compra.id_sucursal)
        .order_by(Compra.fecha.desc(), Compra.id_compra.desc())
    )
    if estado:
        stmt = stmt.where(Compra.estado == estado)
    if id_proveedor:
        stmt = stmt.where(Compra.id_proveedor == id_proveedor)
    if id_sucursal:
        stmt = stmt.where(Compra.id_sucursal == id_sucursal)
    rows, total = paginate(db, stmt, params)
    items = [
        {
            "id_compra": c.id_compra,
            "id_proveedor": c.id_proveedor,
            "proveedor_nombre": prov,
            "id_sucursal": c.id_sucursal,
            "sucursal_nombre": suc,
            "estado": c.estado,
            "total": c.total,
            "fecha": c.fecha,
            "fecha_recepcion": c.fecha_recepcion,
            "num_productos": n,
        }
        for c, prov, suc, n in rows
    ]
    return items, total


def get_purchase(db: Session, id_compra: int) -> dict | None:
    compra = db.scalar(
        select(Compra)
        .where(Compra.id_compra == id_compra)
        .options(selectinload(Compra.detalles).joinedload(DetalleCompra.producto))
    )
    if compra is None:
        return None
    lotes = db.scalars(
        select(Lote)
        .where(Lote.id_compra == id_compra)
        .options(joinedload(Lote.producto))
        .order_by(Lote.fecha_vencimiento, Lote.id_lote)
    ).unique()
    return {
        "id_compra": compra.id_compra,
        "id_proveedor": compra.id_proveedor,
        "proveedor_nombre": compra.proveedor.nombre,
        "id_sucursal": compra.id_sucursal,
        "sucursal_nombre": compra.sucursal.nombre,
        "estado": compra.estado,
        "total": compra.total,
        "fecha": compra.fecha,
        "fecha_recepcion": compra.fecha_recepcion,
        "detalles": [
            {
                "id_producto": d.id_producto,
                "nombre_producto": d.producto.nombre,
                "cantidad": d.cantidad,
                "costo_unitario": d.costo_unitario,
                "subtotal": d.cantidad * d.costo_unitario,
            }
            for d in compra.detalles
        ],
        "lotes": [
            {
                "id_lote": l.id_lote,
                "id_producto": l.id_producto,
                "id_sucursal": l.id_sucursal,
                "id_compra": l.id_compra,
                "numero_lote": l.numero_lote,
                "fecha_vencimiento": l.fecha_vencimiento,
                "cantidad": l.cantidad,
                "nombre_producto": l.producto.nombre,
            }
            for l in lotes
        ],
    }