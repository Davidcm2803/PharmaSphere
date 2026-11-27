"""Tests de reportes (issue #18).

Corren contra PostgreSQL con el seed cargado (como en el CI), porque los reportes usan SQL propio de
Postgres y los criterios de aceptación piden que las cifras coincidan con las ventas del seed.
Si DATABASE_URL no apunta a Postgres, el archivo se omite en vez de fallar.

Cifras del seed (todas en septiembre de 2026, ninguna cancelada):
  venta 1: 01/09, sucursal 1, 4800  = 2 Paracetamol + 1 Ibuprofeno      (costo 2550, ganancia 2250)
  venta 2: 05/09, sucursal 1, 3500  = 1 Amoxicilina                       (costo 1900, ganancia 1600)
  venta 3: 10/09, sucursal 2, 5600  = 2 Omeprazol                         (costo 3000, ganancia 2600)
  venta 4: 12/09, sucursal 3, 3100  = 1 Metformina                        (costo 1700, ganancia 1400)
  total: 17000, costo 9150, ganancia 7850
"""
import csv
import io
from datetime import date, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import app.db.base  # noqa: F401
from app.app import app
from app.core.config import settings
from app.db.session import engine, get_db
from app.dependencies.auth_dependencies import get_current_user
from app.models.inventory_model import Inventario
from app.models.lot_model import Lote
from app.models.product_model import Producto
from app.models.sale_model import DetalleVenta, Venta
from app.services import report_service

pytestmark = pytest.mark.skipif(
    engine.dialect.name != "postgresql",
    reason="Los reportes se prueban contra PostgreSQL con el seed (define DATABASE_URL)",
)

BASE = "/api/reports"
SEPTIEMBRE = {"desde": "2026-09-01", "hasta": "2026-09-30"}

ENDPOINTS_ADMIN = [
    "/summary",
    "/sales-by-day",
    "/sales-by-branch",
    "/sales-by-product",
    "/top-products",
    "/profit",
    "/low-stock",
    "/expiring",
    "/branches",
    "/most-viewed",
    "/alerts",
    "/movements",
    "/export",
    "/export?tipo=ventas",
]


@pytest.fixture(autouse=True)
def sin_cache(monkeypatch):
    # Con Redis activo un resultado guardado antes taparía los datos que cada test inserta
    monkeypatch.setattr(settings, "cache_enabled", False)


@pytest.fixture
def sesion():
    """Sesión sobre una transacción que se revierte al final: los tests no dejan datos en la base."""
    conexion = engine.connect()
    transaccion = conexion.begin()
    s = Session(bind=conexion, join_transaction_mode="create_savepoint")
    try:
        yield s
    finally:
        s.close()
        transaccion.rollback()
        conexion.close()


def _api(sesion: Session, rol) -> TestClient:
    app.dependency_overrides[get_db] = lambda: sesion
    if rol is not None:
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(rol=rol, activo=True)
    return TestClient(app)


@pytest.fixture
def admin(sesion):
    yield _api(sesion, "admin")
    app.dependency_overrides.clear()


@pytest.fixture
def cliente(sesion):
    yield _api(sesion, "cliente")
    app.dependency_overrides.clear()


@pytest.fixture
def anonimo(sesion):
    yield _api(sesion, None)
    app.dependency_overrides.clear()


def _get(api: TestClient, ruta: str, **params):
    return api.get(f"{BASE}{ruta}", params=params)


def _filas_csv(resp) -> list[list[str]]:
    return list(csv.reader(io.StringIO(resp.content.decode("utf-8-sig")), delimiter=";"))


def _inventario(sesion: Session, id_producto: int, id_sucursal: int) -> Inventario:
    return sesion.query(Inventario).filter_by(id_producto=id_producto, id_sucursal=id_sucursal).one()


def _venta_cancelada(sesion: Session) -> None:
    """Venta cancelada de 1500 en septiembre: no debe sumar en ningún reporte."""
    venta = Venta(
        fecha=datetime(2026, 9, 15, 12, 0, 0),
        id_sucursal=1,
        total=Decimal("1500.00"),
        tipo="mostrador",
        estado="cancelada",
    )
    venta.detalles.append(DetalleVenta(id_producto=1, cantidad=1, precio_unitario=Decimal("1500.00")))
    sesion.add(venta)
    sesion.flush()


# Solo admin
@pytest.mark.parametrize("ruta", ENDPOINTS_ADMIN)
def test_sin_token_devuelve_401(anonimo, ruta):
    assert anonimo.get(f"{BASE}{ruta}").status_code == 401


@pytest.mark.parametrize("ruta", ENDPOINTS_ADMIN)
def test_cliente_recibe_403(cliente, ruta):
    assert cliente.get(f"{BASE}{ruta}").status_code == 403


@pytest.mark.parametrize("ruta", ENDPOINTS_ADMIN)
def test_admin_accede_a_todos_los_reportes(admin, ruta):
    assert admin.get(f"{BASE}{ruta}").status_code == 200


# Ventas por día
def test_ventas_por_dia_coinciden_con_el_seed(admin):
    resp = _get(admin, "/sales-by-day", **SEPTIEMBRE)
    assert resp.status_code == 200
    filas = resp.json()
    assert len(filas) == 30  # una fila por cada día del rango
    con_ventas = {f["fecha"]: f["total"] for f in filas if f["total"]}
    assert con_ventas == {"2026-09-01": 4800, "2026-09-05": 3500, "2026-09-10": 5600, "2026-09-12": 3100}
    assert sum(f["total"] for f in filas) == 17000
    assert sum(f["ganancia"] for f in filas) == 7850


def test_ventas_por_dia_filtra_por_sucursal(admin):
    filas = _get(admin, "/sales-by-day", id_sucursal=1, **SEPTIEMBRE).json()
    assert sum(f["total"] for f in filas) == 8300


def test_ventas_por_dia_no_cuenta_canceladas(admin, sesion):
    _venta_cancelada(sesion)
    filas = _get(admin, "/sales-by-day", **SEPTIEMBRE).json()
    assert sum(f["total"] for f in filas) == 17000


# Ventas por sucursal
def test_ventas_por_sucursal_coinciden_con_el_seed(admin):
    filas = _get(admin, "/sales-by-branch", **SEPTIEMBRE).json()
    assert [(f["id_sucursal"], f["ventas"], f["total"], f["ganancia"]) for f in filas] == [
        (1, 2, 8300, 3850),
        (2, 1, 5600, 2600),
        (3, 1, 3100, 1400),
    ]
    assert [f["pct"] for f in filas] == pytest.approx([48.82, 32.94, 18.24], abs=0.01)


def test_ventas_por_sucursal_respeta_el_rango(admin):
    filas = _get(admin, "/sales-by-branch", desde="2026-09-02", hasta="2026-09-11").json()
    assert [(f["id_sucursal"], f["total"]) for f in filas] == [(2, 5600), (1, 3500)]


def test_ventas_por_sucursal_sin_ventas_en_el_rango(admin):
    assert _get(admin, "/sales-by-branch", desde="2026-01-01", hasta="2026-01-31").json() == []


# Ventas por producto
def test_ventas_por_producto_coinciden_con_el_seed(admin):
    filas = _get(admin, "/sales-by-product", **SEPTIEMBRE).json()
    assert [(f["nombre"], f["unidades"], f["ingresos"], f["costo"], f["ganancia"]) for f in filas] == [
        ("Omeprazol 20mg", 2, 5600, 3000, 2600),
        ("Amoxicilina 500mg", 1, 3500, 1900, 1600),
        ("Metformina 850mg", 1, 3100, 1700, 1400),
        ("Paracetamol 500mg", 2, 3000, 1600, 1400),
        ("Ibuprofeno 400mg", 1, 1800, 950, 850),
    ]


def test_ventas_por_producto_filtra_por_sucursal(admin):
    filas = _get(admin, "/sales-by-product", id_sucursal=1, **SEPTIEMBRE).json()
    assert [f["nombre"] for f in filas] == ["Amoxicilina 500mg", "Paracetamol 500mg", "Ibuprofeno 400mg"]


def test_ventas_por_producto_no_cuenta_canceladas(admin, sesion):
    _venta_cancelada(sesion)
    filas = _get(admin, "/sales-by-product", **SEPTIEMBRE).json()
    paracetamol = next(f for f in filas if f["nombre"] == "Paracetamol 500mg")
    assert paracetamol["unidades"] == 2


# Top productos
def test_top_productos_por_unidades_con_rango(admin):
    filas = _get(admin, "/top-products", limit=10, orden="unidades", **SEPTIEMBRE).json()
    assert len(filas) == 5
    # Empate en 2 unidades: desempata por nombre
    assert [f["nombre"] for f in filas[:2]] == ["Omeprazol 20mg", "Paracetamol 500mg"]
    assert [f["unidades"] for f in filas] == [2, 2, 1, 1, 1]


def test_top_productos_respeta_el_limite(admin):
    assert len(_get(admin, "/top-products", limit=2, **SEPTIEMBRE).json()) == 2


def test_top_productos_solo_cuenta_ventas_del_rango(admin):
    filas = _get(admin, "/top-products", limit=10, desde="2026-09-01", hasta="2026-09-05").json()
    assert [f["nombre"] for f in filas] == ["Paracetamol 500mg", "Amoxicilina 500mg", "Ibuprofeno 400mg"]


def test_top_productos_por_ingresos(admin):
    filas = _get(admin, "/top-products", limit=3, orden="ingresos", **SEPTIEMBRE).json()
    assert [f["nombre"] for f in filas] == ["Omeprazol 20mg", "Amoxicilina 500mg", "Metformina 850mg"]


def test_top_productos_sin_fechas_es_el_acumulado(admin):
    filas = _get(admin, "/top-products", limit=10).json()
    assert len(filas) == 5


# Ganancia estimada
def test_ganancia_estimada_coincide_con_el_seed(admin):
    g = _get(admin, "/profit", **SEPTIEMBRE).json()
    assert g["ventas"] == 4
    assert (g["ingresos"], g["costo"], g["ganancia"]) == (17000, 9150, 7850)
    assert g["margen_pct"] == pytest.approx(46.18, abs=0.01)


def test_ganancia_estimada_por_sucursal(admin):
    g = _get(admin, "/profit", id_sucursal=1, **SEPTIEMBRE).json()
    assert (g["ventas"], g["ingresos"], g["costo"], g["ganancia"]) == (2, 8300, 4450, 3850)


def test_ganancia_estimada_sin_ventas_es_cero(admin):
    g = _get(admin, "/profit", desde="2026-01-01", hasta="2026-01-31").json()
    assert (g["ventas"], g["ingresos"], g["costo"], g["ganancia"], g["margen_pct"]) == (0, 0, 0, 0, 0)


def test_ganancia_estimada_no_cuenta_canceladas(admin, sesion):
    _venta_cancelada(sesion)
    g = _get(admin, "/profit", **SEPTIEMBRE).json()
    assert (g["ventas"], g["ingresos"], g["ganancia"]) == (4, 17000, 7850)


# Validación de rangos
@pytest.mark.parametrize("ruta", ["/sales-by-day", "/sales-by-branch", "/sales-by-product", "/profit"])
def test_rango_invertido_devuelve_400(admin, ruta):
    assert _get(admin, ruta, desde="2026-09-30", hasta="2026-09-01").status_code == 400


@pytest.mark.parametrize("ruta", ["/sales-by-day", "/sales-by-branch", "/sales-by-product", "/profit"])
def test_rango_mayor_a_un_ano_devuelve_400(admin, ruta):
    assert _get(admin, ruta, desde="2025-01-01", hasta="2026-09-30").status_code == 400


def test_top_productos_con_rango_invertido_devuelve_400(admin):
    assert _get(admin, "/top-products", desde="2026-09-30", hasta="2026-09-01").status_code == 400


def test_fecha_invalida_devuelve_422(admin):
    assert _get(admin, "/profit", desde="no-es-fecha").status_code == 422


# Stock bajo
def test_stock_bajo_lista_lo_que_esta_en_o_bajo_el_minimo(admin, sesion):
    _inventario(sesion, 1, 1).cantidad = 5  # mínimo 30
    _inventario(sesion, 3, 1).cantidad = 15  # igual al mínimo: cuenta como bajo
    sesion.flush()
    filas = _get(admin, "/low-stock").json()
    assert [(f["nombre"], f["id_sucursal"], f["cantidad"], f["stock_minimo"], f["faltante"]) for f in filas] == [
        ("Paracetamol 500mg", 1, 5, 30, 25),
        ("Amoxicilina 500mg", 1, 15, 15, 0),
    ]


def test_stock_bajo_filtra_por_sucursal(admin, sesion):
    _inventario(sesion, 1, 1).cantidad = 5
    sesion.flush()
    assert len(_get(admin, "/low-stock", id_sucursal=1).json()) == 1
    assert _get(admin, "/low-stock", id_sucursal=2).json() == []


def test_stock_bajo_ignora_productos_inactivos(admin, sesion):
    _inventario(sesion, 1, 1).cantidad = 5
    sesion.get(Producto, 1).activo = False
    sesion.flush()
    assert _get(admin, "/low-stock").json() == []


# Por vencer
@pytest.fixture
def lotes_de_prueba(sesion):
    hoy = report_service.today_cr()
    for numero, delta, cantidad in (
        ("T-VENCIDO", -5, 10),
        ("T-PRONTO", 10, 10),
        ("T-BORDE", 90, 10),
        ("T-LEJOS", 91, 10),
        ("T-VACIO", 1, 0),
    ):
        sesion.add(
            Lote(
                id_producto=1,
                id_sucursal=1,
                numero_lote=numero,
                fecha_vencimiento=hoy + timedelta(days=delta),
                cantidad=cantidad,
            )
        )
    sesion.flush()


def _lotes_de_prueba(resp) -> list[dict]:
    return [lo for lo in resp.json() if lo["numero_lote"].startswith("T-")]


def test_por_vencer_incluye_vencidos_y_el_limite_de_dias(admin, lotes_de_prueba):
    lotes = _lotes_de_prueba(_get(admin, "/expiring"))
    assert [(lo["numero_lote"], lo["dias_restantes"], lo["estado"]) for lo in lotes] == [
        ("T-VENCIDO", -5, "vencido"),
        ("T-PRONTO", 10, "por_vencer"),
        ("T-BORDE", 90, "por_vencer"),
    ]


def test_por_vencer_sin_vencidos(admin, lotes_de_prueba):
    lotes = _lotes_de_prueba(_get(admin, "/expiring", incluir_vencidos=False))
    assert [lo["numero_lote"] for lo in lotes] == ["T-PRONTO", "T-BORDE"]


def test_por_vencer_respeta_el_parametro_dias(admin, lotes_de_prueba):
    lotes = _lotes_de_prueba(_get(admin, "/expiring", dias=30))
    assert [lo["numero_lote"] for lo in lotes] == ["T-VENCIDO", "T-PRONTO"]


def test_por_vencer_ignora_lotes_sin_stock(admin, lotes_de_prueba):
    assert "T-VACIO" not in [lo["numero_lote"] for lo in _get(admin, "/expiring").json()]


def test_por_vencer_dias_fuera_de_rango_devuelve_422(admin):
    assert _get(admin, "/expiring", dias=0).status_code == 422
    assert _get(admin, "/expiring", dias=366).status_code == 422


# Exportar a CSV
def test_exportar_ventas_se_abre_bien_en_excel(admin):
    resp = _get(admin, "/export", tipo="ventas", **SEPTIEMBRE)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert resp.headers["content-disposition"] == (
        'attachment; filename="reporte_ventas_2026-09-01_2026-09-30.csv"'
    )
    assert resp.content.startswith(b"\xef\xbb\xbf")  # BOM: Excel reconoce UTF-8
    assert b"\r\n" in resp.content
    filas = _filas_csv(resp)
    assert ["Fecha", "Ventas", "Ganancia estimada"] in filas  # separador ";"
    assert ["01/09/2026", "4800,00", "2250,00"] in filas  # coma decimal
    assert ["TOTAL", "17000,00", "7850,00"] in filas


def test_exportar_ventas_incluye_la_ganancia_del_periodo(admin):
    filas = _filas_csv(_get(admin, "/export", tipo="ventas", **SEPTIEMBRE))
    assert ["4", "17000,00", "9150,00", "7850,00", "46,18"] in filas


def test_exportar_productos(admin):
    filas = _filas_csv(_get(admin, "/export", tipo="productos", **SEPTIEMBRE))
    assert ["1", "Omeprazol 20mg", "Gastrointestinal", "2", "5600,00", "3000,00", "2600,00"] in filas
    assert ["", "TOTAL", "", "7", "17000,00", "9150,00", "7850,00"] in filas
    assert ["TOP 10 MÁS VENDIDOS (POR UNIDADES)"] in filas


def test_exportar_sucursales(admin):
    filas = _filas_csv(_get(admin, "/export", tipo="sucursales", **SEPTIEMBRE))
    assert ["1", "Farmacia Central", "2", "8300,00", "3850,00", "48,82"] in filas
    assert ["", "TOTAL", "4", "17000,00", "7850,00", ""] in filas


def test_exportar_inventario(admin, sesion):
    _inventario(sesion, 1, 1).cantidad = 5
    sesion.flush()
    filas = _filas_csv(_get(admin, "/export", tipo="inventario"))
    assert ["Paracetamol 500mg", "Farmacia Central", "5", "30", "25"] in filas


def test_exportar_sin_datos_dice_sin_datos(admin):
    filas = _filas_csv(_get(admin, "/export", tipo="sucursales", desde="2026-01-01", hasta="2026-01-31"))
    assert ["Sin datos"] in filas


def test_exportar_neutraliza_formulas_de_excel(admin, sesion):
    sesion.get(Producto, 1).nombre = "=SUMA(1+1)"
    _inventario(sesion, 1, 1).cantidad = 5
    sesion.flush()
    filas = _filas_csv(_get(admin, "/export", tipo="inventario"))
    assert not any(fila and fila[0] == "=SUMA(1+1)" for fila in filas)
    assert any(fila and fila[0] == "'=SUMA(1+1)" for fila in filas)


def test_exportar_tipo_invalido_devuelve_422(admin):
    assert _get(admin, "/export", tipo="otro").status_code == 422


def test_exportar_tipo_con_rango_invertido_devuelve_400(admin):
    assert _get(admin, "/export", tipo="ventas", desde="2026-09-30", hasta="2026-09-01").status_code == 400


def test_exportar_general_sigue_funcionando(admin):
    resp = _get(admin, "/export", dias=30)
    assert resp.status_code == 200
    assert resp.content.startswith(b"\xef\xbb\xbf")
    assert ["REPORTE PHARMASPHERE"] in _filas_csv(resp)


def test_exportar_general_con_dias_invalidos_devuelve_400(admin):
    assert _get(admin, "/export", dias=15).status_code == 400
