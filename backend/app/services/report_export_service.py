import csv
import io
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.services import report_service

SEP = ";"
BOM = "\ufeff"
DECIMAL = ","

TIPOS_ALERTA = {
    "vencido": "Vencido",
    "por_vencer": "Por vencer",
    "stock_bajo": "Stock bajo",
}


def _num(valor, decimales: int = 2) -> str:
    if valor is None:
        return ""
    return f"{float(valor):.{decimales}f}".replace(".", DECIMAL)


def _fecha(iso: str) -> str:
    """'2026-11-09' -> '09/11/2026'."""
    return datetime.fromisoformat(iso).strftime("%d/%m/%Y")


def _fecha_hora(iso: str) -> str:
    return datetime.fromisoformat(iso).strftime("%d/%m/%Y %H:%M")


def _nombre_tipo(tipo: str) -> str:
    return (tipo or "").replace("_", " ").capitalize()


def build_report_csv(db: Session, dias: int) -> str:
    hasta = report_service.today_cr()
    desde = hasta - timedelta(days=dias - 1)

    resumen = report_service.get_summary(db)
    ventas = report_service.get_sales_by_day(db, desde, hasta)
    top = report_service.get_top_products(db, 10, "unidades")
    sucursales = report_service.get_branch_ranking(db)
    alertas = report_service.get_alerts(db)
    movimientos = report_service.get_movements(db, 20)

    buf = io.StringIO()
    w = csv.writer(buf, delimiter=SEP, lineterminator="\r\n")

    def seccion(titulo: str, encabezado: list[str], filas: list[list]):
        w.writerow([titulo.upper()])
        w.writerow(encabezado)
        if filas:
            w.writerows(filas)
        else:
            w.writerow(["Sin datos"])
        w.writerow([])

    # Encabezado del archivo
    w.writerow(["REPORTE PHARMASPHERE"])
    w.writerow(["Generado", report_service.now_cr().strftime("%d/%m/%Y %H:%M")])
    w.writerow(["Periodo de ventas", f"{desde:%d/%m/%Y} al {hasta:%d/%m/%Y} ({dias} días)"])
    w.writerow([])

    # 1. Resumen
    seccion(
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
    seccion(f"Ventas por día (últimos {dias} días)", ["Fecha", "Ventas", "Ganancia estimada"], filas_ventas)

    # 3. Top productos (acumulado histórico)
    seccion(
        "Productos más vendidos (acumulado)",
        ["Posición", "Producto", "Unidades vendidas", "Ingresos"],
        [[i, p["nombre"], p["unidades"], _num(p["ingresos"])] for i, p in enumerate(top, 1)],
    )

    # 4. Sucursales (acumulado histórico)
    seccion(
        "Ranking de sucursales (acumulado)",
        ["Posición", "Sucursal", "Ventas", "Participación (%)"],
        [[i, s["nombre"], _num(s["total"]), _num(s["pct"])] for i, s in enumerate(sucursales, 1)],
    )

    # 5. Alertas
    seccion(
        "Alertas de inventario",
        ["Tipo", "Producto", "Detalle"],
        [[TIPOS_ALERTA.get(a["tipo"], a["tipo"]), a["nombre"], a["detalle"]] for a in alertas],
    )

    # 6. Movimientos recientes
    seccion(
        "Movimientos recientes de inventario",
        ["Fecha", "Tipo", "Producto", "Sucursal", "Cantidad"],
        [
            [_fecha_hora(m["fecha"]), _nombre_tipo(m["tipo"]), m["producto_nombre"], m["sucursal"], m["cantidad"]]
            for m in movimientos
        ],
    )

    return BOM + buf.getvalue()