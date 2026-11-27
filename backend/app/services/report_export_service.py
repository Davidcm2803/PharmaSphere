import csv
import io
from datetime import date, datetime, timedelta
from typing import Callable, Optional

from sqlalchemy.orm import Session

from app.services import report_service

# CSV pensado para Excel en español: UTF-8 con BOM, ";" como separador y coma decimal
SEP = ";"
BOM = "﻿"
DECIMAL = ","

TIPOS_ALERTA = {
    "vencido": "Vencido",
    "por_vencer": "Por vencer",
    "stock_bajo": "Stock bajo",
}

TIPOS_EXPORT = ("ventas", "productos", "sucursales", "inventario")
TITULOS_TIPO = {
    "ventas": "Ventas y ganancia",
    "productos": "Ventas por producto",
    "sucursales": "Ventas por sucursal",
    "inventario": "Inventario: stock bajo y vencimientos",
}


def _num(valor, decimales: int = 2) -> str:
    if valor is None:
        return ""
    return f"{float(valor):.{decimales}f}".replace(".", DECIMAL)


def _txt(valor: Optional[str]) -> str:
    """Texto libre para una celda: evita que Excel lo ejecute como fórmula (= + - @)."""
    texto = valor or ""
    return "'" + texto if texto[:1] in ("=", "+", "-", "@", "\t", "\r") else texto


def _fecha(iso: str) -> str:
    """'2026-11-09' -> '09/11/2026'."""
    return datetime.fromisoformat(iso).strftime("%d/%m/%Y")


def _fecha_hora(iso: str) -> str:
    return datetime.fromisoformat(iso).strftime("%d/%m/%Y %H:%M")


def _nombre_tipo(tipo: str) -> str:
    return (tipo or "").replace("_", " ").capitalize()


class _Csv:
    """Escritor de CSV con secciones (título, encabezado, filas o 'Sin datos')."""

    def __init__(self) -> None:
        self.buf = io.StringIO()
        self.w = csv.writer(self.buf, delimiter=SEP, lineterminator="\r\n")

    def fila(self, *celdas) -> None:
        self.w.writerow(list(celdas))

    def seccion(self, titulo: str, encabezado: list[str], filas: list[list]) -> None:
        self.w.writerow([titulo.upper()])
        self.w.writerow(encabezado)
        if filas:
            self.w.writerows(filas)
        else:
            self.w.writerow(["Sin datos"])
        self.w.writerow([])

    def render(self) -> str:
        return BOM + self.buf.getvalue()


def build_report_csv(db: Session, dias: int) -> str:
    hasta = report_service.today_cr()
    desde = hasta - timedelta(days=dias - 1)

    resumen = report_service.get_summary(db)
    ventas = report_service.get_sales_by_day(db, desde, hasta)
    top = report_service.get_top_products(db, 10, "unidades")
    sucursales = report_service.get_branch_ranking(db)
    alertas = report_service.get_alerts(db)
    movimientos = report_service.get_movements(db, 20)

    out = _Csv()

    # Encabezado del archivo
    out.fila("REPORTE PHARMASPHERE")
    out.fila("Generado", report_service.now_cr().strftime("%d/%m/%Y %H:%M"))
    out.fila("Periodo de ventas", f"{desde:%d/%m/%Y} al {hasta:%d/%m/%Y} ({dias} días)")
    out.fila()

    # 1. Resumen
    out.seccion(
        "Resumen general",
        ["Indicador", "Valor", "Variación vs mes anterior (%)"],
        [
            ["Ventas de hoy", _num(resumen["ventas_hoy"]), ""],
            ["Ventas del mes", _num(resumen["ventas_mes"]), _num(resumen["var_ventas_mes"])],
            ["Ganancia estimada del mes", _num(resumen["ganancia_mes"]), _num(resumen["var_ganancia_mes"])],
            ["Compras del mes", _num(resumen["compras_mes"]), _num(resumen["var_compras_mes"])],
            ["Stock sano (%)", _num(resumen["pct_stock_sano"], 1), ""],
            ["Productos con stock bajo", resumen["stock_bajo"], ""],
            ["Lotes por vencer (90 días)", resumen["por_vencer"], ""],
            ["Lotes vencidos", resumen["vencidos"], ""],
            ["Productos activos", resumen["productos_activos"], ""],
            ["Clientes", resumen["clientes_activos"], ""],
            ["Empleados activos", resumen["empleados_activos"], ""],
        ],
    )

    # 2. Ventas por día (con fila de total)
    filas_ventas = [[_fecha(v["fecha"]), _num(v["total"]), _num(v["ganancia"])] for v in ventas]
    if ventas:
        filas_ventas.append(
            ["TOTAL", _num(sum(v["total"] for v in ventas)), _num(sum(v["ganancia"] for v in ventas))]
        )
    out.seccion(f"Ventas por día (últimos {dias} días)", ["Fecha", "Ventas", "Ganancia estimada"], filas_ventas)

    # 3. Top productos (acumulado histórico)
    out.seccion(
        "Productos más vendidos (acumulado)",
        ["Posición", "Producto", "Unidades vendidas", "Ingresos"],
        [[i, _txt(p["nombre"]), p["unidades"], _num(p["ingresos"])] for i, p in enumerate(top, 1)],
    )

    # 4. Sucursales (acumulado histórico)
    out.seccion(
        "Ranking de sucursales (acumulado)",
        ["Posición", "Sucursal", "Ventas", "Participación (%)"],
        [[i, _txt(s["nombre"]), _num(s["total"]), _num(s["pct"])] for i, s in enumerate(sucursales, 1)],
    )

    # 5. Alertas
    out.seccion(
        "Alertas de inventario",
        ["Tipo", "Producto", "Detalle"],
        [[TIPOS_ALERTA.get(a["tipo"], a["tipo"]), _txt(a["nombre"]), _txt(a["detalle"])] for a in alertas],
    )

    # 6. Movimientos recientes
    out.seccion(
        "Movimientos recientes de inventario",
        ["Fecha", "Tipo", "Producto", "Sucursal", "Cantidad"],
        [
            [
                _fecha_hora(m["fecha"]),
                _nombre_tipo(m["tipo"]),
                _txt(m["producto_nombre"]),
                _txt(m["sucursal"]),
                m["cantidad"],
            ]
            for m in movimientos
        ],
    )

    return out.render()


# CSV por tipo (ventas, productos, sucursales, inventario) para un rango de fechas
def _csv_ventas(db: Session, out: _Csv, desde: date, hasta: date) -> None:
    dias = report_service.get_sales_by_day(db, desde, hasta)
    filas = [[_fecha(d["fecha"]), _num(d["total"]), _num(d["ganancia"])] for d in dias]
    if dias:
        filas.append(["TOTAL", _num(sum(d["total"] for d in dias)), _num(sum(d["ganancia"] for d in dias))])
    out.seccion("Ventas por día", ["Fecha", "Ventas", "Ganancia estimada"], filas)

    g = report_service.get_profit(db, desde, hasta)
    out.seccion(
        "Ganancia estimada del periodo",
        ["Ventas (cantidad)", "Ingresos", "Costo de los productos", "Ganancia estimada", "Margen (%)"],
        [[g["ventas"], _num(g["ingresos"]), _num(g["costo"]), _num(g["ganancia"]), _num(g["margen_pct"])]],
    )


def _csv_productos(db: Session, out: _Csv, desde: date, hasta: date) -> None:
    productos = report_service.get_sales_by_product(db, desde, hasta)
    filas = [
        [i, _txt(p["nombre"]), _txt(p["categoria"]), p["unidades"], _num(p["ingresos"]), _num(p["costo"]), _num(p["ganancia"])]
        for i, p in enumerate(productos, 1)
    ]
    if productos:
        filas.append(
            [
                "",
                "TOTAL",
                "",
                sum(p["unidades"] for p in productos),
                _num(sum(p["ingresos"] for p in productos)),
                _num(sum(p["costo"] for p in productos)),
                _num(sum(p["ganancia"] for p in productos)),
            ]
        )
    out.seccion(
        "Ventas por producto",
        ["Posición", "Producto", "Categoría", "Unidades", "Ingresos", "Costo", "Ganancia estimada"],
        filas,
    )

    top = report_service.get_top_products(db, 10, "unidades", desde, hasta)
    out.seccion(
        "Top 10 más vendidos (por unidades)",
        ["Posición", "Producto", "Unidades", "Ingresos"],
        [[i, _txt(p["nombre"]), p["unidades"], _num(p["ingresos"])] for i, p in enumerate(top, 1)],
    )


def _csv_sucursales(db: Session, out: _Csv, desde: date, hasta: date) -> None:
    sucursales = report_service.get_sales_by_branch(db, desde, hasta)
    filas = [
        [i, _txt(s["nombre"]), s["ventas"], _num(s["total"]), _num(s["ganancia"]), _num(s["pct"])]
        for i, s in enumerate(sucursales, 1)
    ]
    if sucursales:
        filas.append(
            [
                "",
                "TOTAL",
                sum(s["ventas"] for s in sucursales),
                _num(sum(s["total"] for s in sucursales)),
                _num(sum(s["ganancia"] for s in sucursales)),
                "",
            ]
        )
    out.seccion(
        "Ventas por sucursal",
        ["Posición", "Sucursal", "Ventas (cantidad)", "Total", "Ganancia estimada", "Participación (%)"],
        filas,
    )


def _csv_inventario(db: Session, out: _Csv, desde: date, hasta: date) -> None:
    # El inventario es una foto de hoy: el rango de fechas no aplica
    bajos = report_service.get_low_stock(db)
    out.seccion(
        "Stock bajo",
        ["Producto", "Sucursal", "Cantidad", "Stock mínimo", "Faltante"],
        [[_txt(b["nombre"]), _txt(b["sucursal"]), b["cantidad"], b["stock_minimo"], b["faltante"]] for b in bajos],
    )
    lotes = report_service.get_expiring(db)
    out.seccion(
        f"Lotes vencidos y por vencer ({report_service.DIAS_POR_VENCER} días)",
        ["Producto", "Lote", "Sucursal", "Vence", "Días restantes", "Cantidad", "Estado"],
        [
            [
                _txt(lo["nombre"]),
                _txt(lo["numero_lote"]),
                _txt(lo["sucursal"]),
                _fecha(lo["fecha_vencimiento"]),
                lo["dias_restantes"],
                lo["cantidad"],
                TIPOS_ALERTA.get(lo["estado"], lo["estado"]),
            ]
            for lo in lotes
        ],
    )


_SECCIONES: dict[str, Callable[[Session, _Csv, date, date], None]] = {
    "ventas": _csv_ventas,
    "productos": _csv_productos,
    "sucursales": _csv_sucursales,
    "inventario": _csv_inventario,
}


def build_typed_csv(db: Session, tipo: str, desde: date, hasta: date) -> str:
    if tipo not in _SECCIONES:
        raise ValueError(f"Tipo de reporte no válido: {tipo}")
    out = _Csv()
    out.fila("REPORTE PHARMASPHERE", TITULOS_TIPO[tipo])
    out.fila("Generado", report_service.now_cr().strftime("%d/%m/%Y %H:%M"))
    if tipo == "inventario":
        out.fila("Corte", f"Inventario al {report_service.today_cr():%d/%m/%Y}")
    else:
        out.fila("Periodo", f"{desde:%d/%m/%Y} al {hasta:%d/%m/%Y}")
    out.fila()
    _SECCIONES[tipo](db, out, desde, hasta)
    return out.render()
