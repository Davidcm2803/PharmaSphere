from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from sqlalchemy import Date, cast, func, literal, select
from sqlalchemy.orm import Session

from app.models.branch_model import Sucursal
from app.models.customer_model import Cliente
from app.models.employee_model import Empleado
from app.models.inventory_model import Inventario
from app.models.lot_model import Lote
from app.models.movement_model import MovimientoInventario
from app.models.product_model import Producto
from app.models.purchase_model import Compra
from app.models.sale_model import DetalleVenta, Venta

CR_OFFSET = timedelta(hours=-6)  # UTC -> Costa Rica
DIAS_POR_VENCER = 90
ALERTAS_POR_TIPO = 5


def _local(col):
    return col + CR_OFFSET


def now_cr() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None) + CR_OFFSET


def today_cr() -> date:
    return now_cr().date()


def _f(value) -> float:
    return float(value or 0)


def _variation(actual: float, previo: float) -> Optional[float]:
    if not previo:
        return None
    return round((actual - previo) / previo * 100, 2)


# KPIs
def _ventas(db: Session, ini: datetime, fin: datetime) -> float:
    return _f(
        db.scalar(
            select(func.coalesce(func.sum(Venta.total), 0)).where(
                Venta.estado != "cancelada",
                _local(Venta.fecha) >= ini,
                _local(Venta.fecha) < fin,
            )
        )
    )


def _ganancia(db: Session, ini: datetime, fin: datetime) -> float:
    return _f(
        db.scalar(
            select(
                func.coalesce(
                    func.sum((DetalleVenta.precio_unitario - Producto.costo) * DetalleVenta.cantidad),
                    0,
                )
            )
            .select_from(DetalleVenta)
            .join(Venta, Venta.id_venta == DetalleVenta.id_venta)
            .join(Producto, Producto.id_producto == DetalleVenta.id_producto)
            .where(
                Venta.estado != "cancelada",
                _local(Venta.fecha) >= ini,
                _local(Venta.fecha) < fin,
            )
        )
    )


def _compras(db: Session, ini: datetime, fin: datetime) -> float:
    return _f(
        db.scalar(
            select(func.coalesce(func.sum(Compra.total), 0)).where(
                Compra.estado != "cancelada",
                _local(Compra.fecha) >= ini,
                _local(Compra.fecha) < fin,
            )
        )
    )


def _count_lotes(db: Session, *condiciones) -> int:
    return int(
        db.scalar(
            select(func.count(Lote.id_lote))
            .join(Producto, Producto.id_producto == Lote.id_producto)
            .where(Producto.activo.is_(True), Lote.cantidad > 0, *condiciones)
        )
        or 0
    )


def get_summary(db: Session) -> dict:
    ahora = now_cr()
    hoy = ahora.date()
    hoy0 = datetime.combine(hoy, time.min)
    manana0 = hoy0 + timedelta(days=1)
    mes0 = hoy0.replace(day=1)
    prev0 = (mes0 - timedelta(days=1)).replace(day=1)
    # Mismo tramo del mes anterior (del 1 al mismo día), sin pasarse de ese mes
    prev_fin = min(prev0 + (manana0 - mes0), mes0)

    ventas_mes = _ventas(db, mes0, manana0)
    ganancia_mes = _ganancia(db, mes0, manana0)
    compras_mes = _compras(db, mes0, manana0)

    total_inv, sanos = db.execute(
        select(
            func.count(Inventario.id_inventario),
            func.count(Inventario.id_inventario).filter(Inventario.cantidad > Inventario.stock_minimo),
        )
        .join(Producto, Producto.id_producto == Inventario.id_producto)
        .where(Producto.activo.is_(True))
    ).one()

    return {
        "ventas_hoy": _ventas(db, hoy0, manana0),
        "ventas_mes": ventas_mes,
        "var_ventas_mes": _variation(ventas_mes, _ventas(db, prev0, prev_fin)),
        "ganancia_mes": ganancia_mes,
        "var_ganancia_mes": _variation(ganancia_mes, _ganancia(db, prev0, prev_fin)),
        "compras_mes": compras_mes,
        "var_compras_mes": _variation(compras_mes, _compras(db, prev0, prev_fin)),
        "pct_stock_sano": round(sanos / total_inv * 100, 1) if total_inv else 0,
        "stock_bajo": total_inv - sanos,
        "por_vencer": _count_lotes(
            db,
            Lote.fecha_vencimiento >= hoy,
            Lote.fecha_vencimiento <= hoy + timedelta(days=DIAS_POR_VENCER),
        ),
        "vencidos": _count_lotes(db, Lote.fecha_vencimiento < hoy),
        "productos_activos": int(db.scalar(select(func.count(Producto.id_producto)).where(Producto.activo.is_(True))) or 0),
        "clientes_activos": int(db.scalar(select(func.count(Cliente.id_cliente))) or 0),
        "empleados_activos": int(db.scalar(select(func.count(Empleado.id_empleado)).where(Empleado.activo.is_(True))) or 0),
    }


# ventas por día
def get_sales_by_day(
    db: Session, desde: date, hasta: date, id_sucursal: Optional[int] = None
) -> list[dict]:
    dia = cast(_local(Venta.fecha), Date)
    filtros = [Venta.estado != "cancelada", dia >= desde, dia <= hasta]
    if id_sucursal is not None:
        filtros.append(Venta.id_sucursal == id_sucursal)

    totales = {
        d: _f(t)
        for d, t in db.execute(
            select(dia, func.sum(Venta.total)).where(*filtros).group_by(dia)
        ).all()
    }
    ganancias = {
        d: _f(g)
        for d, g in db.execute(
            select(dia, func.sum((DetalleVenta.precio_unitario - Producto.costo) * DetalleVenta.cantidad))
            .select_from(DetalleVenta)
            .join(Venta, Venta.id_venta == DetalleVenta.id_venta)
            .join(Producto, Producto.id_producto == DetalleVenta.id_producto)
            .where(*filtros)
            .group_by(dia)
        ).all()
    }

    # Una fila por cada día del rango (los días sin ventas van en 0)
    resultado, d = [], desde
    while d <= hasta:
        resultado.append(
            {"fecha": d.isoformat(), "total": totales.get(d, 0.0), "ganancia": ganancias.get(d, 0.0)}
        )
        d += timedelta(days=1)
    return resultado


# rankings
def get_top_products(db: Session, limit: int, orden: str) -> list[dict]:
    unidades = func.sum(DetalleVenta.cantidad)
    ingresos = func.sum(DetalleVenta.cantidad * DetalleVenta.precio_unitario)
    rows = db.execute(
        select(Producto.id_producto, Producto.nombre, unidades.label("unidades"), ingresos.label("ingresos"))
        .join(DetalleVenta, DetalleVenta.id_producto == Producto.id_producto)
        .join(Venta, Venta.id_venta == DetalleVenta.id_venta)
        .where(Venta.estado != "cancelada")
        .group_by(Producto.id_producto, Producto.nombre)
        .order_by((ingresos if orden == "ingresos" else unidades).desc(), Producto.nombre)
        .limit(limit)
    ).all()
    return [
        {"id_producto": r.id_producto, "nombre": r.nombre, "unidades": int(r.unidades), "ingresos": _f(r.ingresos)}
        for r in rows
    ]


def get_branch_ranking(db: Session) -> list[dict]:
    total = func.sum(Venta.total)
    rows = db.execute(
        select(Sucursal.id_sucursal, Sucursal.nombre, total.label("total"))
        .join(Venta, Venta.id_sucursal == Sucursal.id_sucursal)
        .where(Venta.estado != "cancelada")
        .group_by(Sucursal.id_sucursal, Sucursal.nombre)
        .order_by(total.desc())
    ).all()
    gran_total = sum(_f(r.total) for r in rows)
    return [
        {
            "id_sucursal": r.id_sucursal,
            "nombre": r.nombre,
            "total": _f(r.total),
            "pct": round(_f(r.total) / gran_total * 100, 2) if gran_total else 0,
        }
        for r in rows
    ]


def get_most_viewed(db: Session, limit: int) -> list[dict]:
    stock = (
        select(Inventario.id_producto, func.coalesce(func.sum(Inventario.cantidad), 0).label("stock_total"))
        .group_by(Inventario.id_producto)
        .subquery()
    )
    stmt = (
        select(
            Producto.id_producto,
            Producto.nombre,
            Producto.categoria,
            Producto.imagen_url,
            func.coalesce(stock.c.stock_total, 0).label("stock_total"),
        )
        .outerjoin(stock, stock.c.id_producto == Producto.id_producto)
        .where(Producto.activo.is_(True))
    )

    # Si existe una columna Producto.vistas se ordena por ella. Si no, no hay de dónde
    # sacar las vistas: se rankea por unidades vendidas y "vistas" queda en 0.
    vistas_col = getattr(Producto, "vistas", None)
    if vistas_col is not None:
        stmt = stmt.add_columns(func.coalesce(vistas_col, 0).label("vistas")).order_by(
            func.coalesce(vistas_col, 0).desc(), Producto.nombre
        )
    else:
        vendidos = (
            select(DetalleVenta.id_producto, func.sum(DetalleVenta.cantidad).label("vendidos"))
            .join(Venta, Venta.id_venta == DetalleVenta.id_venta)
            .where(Venta.estado != "cancelada")
            .group_by(DetalleVenta.id_producto)
            .subquery()
        )
        stmt = (
            stmt.outerjoin(vendidos, vendidos.c.id_producto == Producto.id_producto)
            .add_columns(literal(0).label("vistas"))
            .order_by(func.coalesce(vendidos.c.vendidos, 0).desc(), Producto.nombre)
        )

    return [
        {
            "id_producto": r.id_producto,
            "nombre": r.nombre,
            "categoria": r.categoria,
            "imagen_url": r.imagen_url,
            "vistas": int(r.vistas),
            "stock_total": int(r.stock_total),
        }
        for r in db.execute(stmt.limit(limit)).all()
    ]


#  alertas
def get_alerts(db: Session) -> list[dict]:
    hoy = today_cr()
    alertas: list[dict] = []

    def lotes(tipo: str, *condiciones, orden):
        rows = db.execute(
            select(Producto.id_producto, Producto.nombre, Lote.numero_lote, Lote.fecha_vencimiento, Lote.cantidad, Sucursal.nombre.label("sucursal"))
            .join(Producto, Producto.id_producto == Lote.id_producto)
            .join(Sucursal, Sucursal.id_sucursal == Lote.id_sucursal)
            .where(Producto.activo.is_(True), Lote.cantidad > 0, *condiciones)
            .order_by(orden)
            .limit(ALERTAS_POR_TIPO)
        ).all()
        for r in rows:
            alertas.append(
                {
                    "tipo": tipo,
                    "id_producto": r.id_producto,
                    "nombre": r.nombre,
                    "detalle": f"Lote {r.numero_lote} · vence {r.fecha_vencimiento:%d/%m/%Y} · {r.cantidad} u · {r.sucursal}",
                }
            )

    lotes("vencido", Lote.fecha_vencimiento < hoy, orden=Lote.fecha_vencimiento.desc())
    lotes(
        "por_vencer",
        Lote.fecha_vencimiento >= hoy,
        Lote.fecha_vencimiento <= hoy + timedelta(days=DIAS_POR_VENCER),
        orden=Lote.fecha_vencimiento.asc(),
    )

    bajos = db.execute(
        select(Producto.id_producto, Producto.nombre, Inventario.cantidad, Inventario.stock_minimo, Sucursal.nombre.label("sucursal"))
        .join(Producto, Producto.id_producto == Inventario.id_producto)
        .join(Sucursal, Sucursal.id_sucursal == Inventario.id_sucursal)
        .where(Producto.activo.is_(True), Inventario.cantidad <= Inventario.stock_minimo)
        .order_by((Inventario.cantidad - Inventario.stock_minimo).asc(), Producto.nombre)
        .limit(ALERTAS_POR_TIPO)
    ).all()
    for r in bajos:
        alertas.append(
            {
                "tipo": "stock_bajo",
                "id_producto": r.id_producto,
                "nombre": r.nombre,
                "detalle": f"{r.cantidad} u (mínimo {r.stock_minimo}) · {r.sucursal}",
            }
        )
    return alertas


def get_movements(db: Session, limit: int) -> list[dict]:
    rows = db.execute(
        select(
            MovimientoInventario.id_movimiento,
            MovimientoInventario.tipo,
            MovimientoInventario.cantidad,
            MovimientoInventario.fecha,
            Producto.nombre.label("producto_nombre"),
            Sucursal.nombre.label("sucursal"),
        )
        .join(Producto, Producto.id_producto == MovimientoInventario.id_producto)
        .join(Sucursal, Sucursal.id_sucursal == MovimientoInventario.id_sucursal)
        .order_by(MovimientoInventario.fecha.desc(), MovimientoInventario.id_movimiento.desc())
        .limit(limit)
    ).all()
    return [
        {
            "id_movimiento": r.id_movimiento,
            "tipo": r.tipo,
            "producto_nombre": r.producto_nombre,
            "sucursal": r.sucursal,
            "cantidad": r.cantidad,
            "fecha": (r.fecha + CR_OFFSET).isoformat(),
        }
        for r in rows
    ]