from datetime import date, timedelta
from typing import Literal, Optional

from sqlalchemy import Date, case, cast, func, select
from sqlalchemy.orm import Session

from app.core.cache import cached
from app.models.branch_model import Sucursal
from app.models.inventory_model import Inventario
from app.models.product_model import Producto
from app.models.sale_model import DetalleVenta, Venta
from app.services import report_service

SEMANAS_POR_DEFECTO = 4
DIAS_COBERTURA_POR_DEFECTO = 14
UMBRAL_TENDENCIA_PCT = 10.0  # cambios de hasta +-10 % se consideran "estable"
DIAS_STOCK_CRITICO = 7  # con 7 días de stock o menos la reposición es prioridad alta

Tendencia = Literal["sube", "baja", "estable", "sin_ventas"]
Prioridad = Literal["alta", "media", "baja"]

_ORDEN_PRIORIDAD = {"alta": 0, "media": 1, "baja": 2}


def _tendencia(reciente: int, previo: int) -> tuple[Tendencia, Optional[float]]:
    """Devuelve (tendencia, variación en %). Sin ventas previas no hay porcentaje que calcular."""
    if reciente == 0 and previo == 0:
        return "sin_ventas", None
    if previo == 0:
        return "sube", None
    variacion = round((reciente - previo) / previo * 100, 2)
    if variacion > UMBRAL_TENDENCIA_PCT:
        return "sube", variacion
    if variacion < -UMBRAL_TENDENCIA_PCT:
        return "baja", variacion
    return "estable", variacion


def _num(valor: float, decimales: int = 1) -> str:
    """Número con coma decimal y sin ceros sobrantes: 2.50 -> '2,5', 3.0 -> '3'."""
    texto = f"{valor:.{decimales}f}".rstrip("0").rstrip(".")
    return (texto or "0").replace(".", ",")


def _ventas_por_producto_sucursal(
    db: Session,
    inicio_previo: date,
    inicio_reciente: date,
    corte: date,
    id_sucursal: Optional[int],
) -> dict[tuple[int, int], tuple[int, int]]:
    """{(id_producto, id_sucursal): (vendido_reciente, vendido_previo)} en una sola consulta."""
    dia = cast(report_service._local(Venta.fecha), Date)
    reciente = func.coalesce(func.sum(case((dia >= inicio_reciente, DetalleVenta.cantidad), else_=0)), 0)
    previo = func.coalesce(func.sum(case((dia < inicio_reciente, DetalleVenta.cantidad), else_=0)), 0)
    filas = db.execute(
        select(DetalleVenta.id_producto, Venta.id_sucursal, reciente, previo)
        .select_from(DetalleVenta)
        .join(Venta, Venta.id_venta == DetalleVenta.id_venta)
        .where(*report_service._filtros_venta(inicio_previo, corte, id_sucursal))
        .group_by(DetalleVenta.id_producto, Venta.id_sucursal)
    ).all()
    return {(f[0], f[1]): (int(f[2]), int(f[3])) for f in filas}


def _fila(
    *,
    id_producto: int,
    nombre: str,
    categoria: Optional[str],
    id_sucursal: int,
    sucursal: str,
    cantidad: int,
    stock_minimo: int,
    reciente: int,
    previo: int,
    semanas: int,
    dias_cobertura: int,
) -> dict:
    dias_ventana = semanas * 7
    promedio_diario = reciente / dias_ventana
    tendencia, variacion = _tendencia(reciente, previo)
    dias_de_stock = round(cantidad / promedio_diario, 1) if reciente else None

    # redondeo hacia arriba con enteros, para no depender de decimales de punto flotante
    demanda = -(-reciente * dias_cobertura // dias_ventana)
    objetivo = stock_minimo + demanda
    sugerida = max(0, objetivo - cantidad)

    if sugerida == 0:
        prioridad: Prioridad = "baja"
    elif cantidad <= stock_minimo or (dias_de_stock is not None and dias_de_stock <= DIAS_STOCK_CRITICO):
        prioridad = "alta"
    else:
        prioridad = "media"

    if reciente:
        ventas_txt = (
            f"Vendió {reciente} u. en las últimas {semanas} semanas "
            f"({_num(promedio_diario * 7, 2)} por semana)."
        )
        alcance_txt = f" Con {cantidad} u. en stock alcanza para {_num(dias_de_stock)} días."
    else:
        ventas_txt = f"No registra ventas en las últimas {semanas} semanas."
        alcance_txt = f" Hay {cantidad} u. en stock."
    if sugerida:
        compra_txt = (
            f" Objetivo: stock mínimo {stock_minimo} + {dias_cobertura} días de venta ({demanda} u.) "
            f"= {objetivo} u. Hay {cantidad}, conviene comprar {sugerida}."
        )
    else:
        compra_txt = f" Objetivo: {objetivo} u. (mínimo {stock_minimo} + {demanda} u. de venta). No hace falta comprar."

    return {
        "id_producto": id_producto,
        "nombre": nombre,
        "categoria": categoria,
        "id_sucursal": id_sucursal,
        "sucursal": sucursal,
        "stock_actual": cantidad,
        "stock_minimo": stock_minimo,
        "vendido_reciente": reciente,
        "vendido_previo": previo,
        "promedio_diario": round(promedio_diario, 2),
        "promedio_semanal": round(promedio_diario * 7, 2),
        "promedio_mensual": round(promedio_diario * 30, 2),
        "tendencia": tendencia,
        "variacion_pct": variacion,
        "dias_de_stock": dias_de_stock,
        "cantidad_sugerida": sugerida,
        "prioridad": prioridad,
        "calculo": {
            "dias_ventana": dias_ventana,
            "dias_cobertura": dias_cobertura,
            "demanda_cobertura": demanda,
            "stock_objetivo": objetivo,
        },
        "explicacion": ventas_txt + alcance_txt + compra_txt,
    }


@cached("reports:forecast", ttl=120)
def get_forecast(
    db: Session,
    semanas: int = SEMANAS_POR_DEFECTO,
    dias_cobertura: int = DIAS_COBERTURA_POR_DEFECTO,
    id_sucursal: Optional[int] = None,
    q: Optional[str] = None,
    solo_reposicion: bool = False,
    al: Optional[date] = None,
) -> dict:
    corte = al or report_service.today_cr()
    dias_ventana = semanas * 7
    inicio_reciente = corte - timedelta(days=dias_ventana - 1)
    inicio_previo = inicio_reciente - timedelta(days=dias_ventana)

    ventas = _ventas_por_producto_sucursal(db, inicio_previo, inicio_reciente, corte, id_sucursal)

    stmt = (
        select(
            Producto.id_producto,
            Producto.nombre,
            Producto.categoria,
            Sucursal.id_sucursal,
            Sucursal.nombre.label("sucursal"),
            Inventario.cantidad,
            Inventario.stock_minimo,
        )
        .join(Producto, Producto.id_producto == Inventario.id_producto)
        .join(Sucursal, Sucursal.id_sucursal == Inventario.id_sucursal)
        .where(Producto.activo.is_(True))
    )
    if id_sucursal is not None:
        stmt = stmt.where(Inventario.id_sucursal == id_sucursal)
    if q:
        stmt = stmt.where(Producto.nombre.ilike(f"%{q.strip()}%"))

    items = []
    for r in db.execute(stmt).all():
        reciente, previo = ventas.get((r.id_producto, r.id_sucursal), (0, 0))
        items.append(
            _fila(
                id_producto=r.id_producto,
                nombre=r.nombre,
                categoria=r.categoria,
                id_sucursal=r.id_sucursal,
                sucursal=r.sucursal,
                cantidad=r.cantidad,
                stock_minimo=r.stock_minimo,
                reciente=reciente,
                previo=previo,
                semanas=semanas,
                dias_cobertura=dias_cobertura,
            )
        )

    analizados = len(items)
    if solo_reposicion:
        items = [i for i in items if i["cantidad_sugerida"] > 0]
    # lo más urgente primero: prioridad, luego menos días de stock (sin ventas al final), luego nombre
    items.sort(
        key=lambda i: (
            _ORDEN_PRIORIDAD[i["prioridad"]],
            i["dias_de_stock"] if i["dias_de_stock"] is not None else float("inf"),
            i["nombre"],
            i["sucursal"],
        )
    )

    con_reposicion = [i for i in items if i["cantidad_sugerida"] > 0]
    return {
        "al": corte.isoformat(),
        "semanas": semanas,
        "dias_cobertura": dias_cobertura,
        "ventana_reciente": {"desde": inicio_reciente.isoformat(), "hasta": corte.isoformat()},
        "ventana_previa": {
            "desde": inicio_previo.isoformat(),
            "hasta": (inicio_reciente - timedelta(days=1)).isoformat(),
        },
        "resumen": {
            "analizados": analizados,
            "requieren_reposicion": len(con_reposicion),
            "prioridad_alta": sum(1 for i in con_reposicion if i["prioridad"] == "alta"),
            "unidades_sugeridas": sum(i["cantidad_sugerida"] for i in con_reposicion),
        },
        "items": items,
    }
