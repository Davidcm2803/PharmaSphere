from datetime import date, datetime, time, timedelta
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
from app.models.sale_model import DetalleVenta, Venta
from app.services import copilot_tools_service as tools
from app.services import forecast_service, report_service

pytestmark = pytest.mark.skipif(
    engine.dialect.name != "postgresql",
    reason="El pronóstico se prueba contra PostgreSQL con el seed (define DATABASE_URL)",
)

BASE = "/api/reports"
CORTE = date(2026, 9, 30)
CORTE_ISO = CORTE.isoformat()

ID_PARACETAMOL, ID_IBUPROFENO, ID_AMOXICILINA, ID_LORATADINA, ID_OMEPRAZOL, ID_METFORMINA = 1, 2, 3, 4, 5, 7


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


def _inventario(sesion: Session, id_producto: int, id_sucursal: int) -> Inventario:
    return sesion.query(Inventario).filter_by(id_producto=id_producto, id_sucursal=id_sucursal).one()


def _poner_stock(sesion: Session, id_producto: int, id_sucursal: int, cantidad: int) -> None:
    _inventario(sesion, id_producto, id_sucursal).cantidad = cantidad
    sesion.flush()


def _vender(
    sesion: Session, id_producto: int, id_sucursal: int, cantidad: int, dia: date, estado: str = "pagada"
) -> None:
    """Venta de `cantidad` unidades hecha al mediodía del `dia` (hora de Costa Rica queda el mismo día)."""
    venta = Venta(
        fecha=datetime.combine(dia, time(12, 0)),
        id_sucursal=id_sucursal,
        total=Decimal(cantidad * 1000),
        tipo="mostrador",
        estado=estado,
    )
    venta.detalles.append(DetalleVenta(id_producto=id_producto, cantidad=cantidad, precio_unitario=Decimal("1000.00")))
    sesion.add(venta)
    sesion.flush()


def _pronostico(sesion: Session, **params) -> dict:
    params.setdefault("al", CORTE)
    return forecast_service.get_forecast(sesion, **params)


def _item(pronostico: dict, id_producto: int, id_sucursal: int) -> dict:
    return next(
        i for i in pronostico["items"] if i["id_producto"] == id_producto and i["id_sucursal"] == id_sucursal
    )


# Tendencia
@pytest.mark.parametrize(
    "reciente, previo, esperado",
    [
        (0, 0, ("sin_ventas", None)),
        (3, 0, ("sube", None)),
        (0, 2, ("baja", -100.0)),
        (12, 10, ("sube", 20.0)),
        (11, 10, ("estable", 10.0)),  # +10 % justo: todavía estable
        (10, 10, ("estable", 0.0)),
        (9, 10, ("estable", -10.0)),
        (8, 10, ("baja", -20.0)),
    ],
)
def test_tendencia_segun_el_cambio_entre_ventanas(reciente, previo, esperado):
    assert forecast_service._tendencia(reciente, previo) == esperado


# Cálculos con las ventas del seed
def test_ventanas_de_calculo(sesion):
    p = _pronostico(sesion)
    assert p["ventana_reciente"] == {"desde": "2026-09-03", "hasta": "2026-09-30"}
    assert p["ventana_previa"] == {"desde": "2026-08-06", "hasta": "2026-09-02"}
    assert (p["semanas"], p["dias_cobertura"]) == (4, 14)


def test_promedios_y_tendencia_con_las_ventas_del_seed(sesion):
    p = _pronostico(sesion)
    assert p["resumen"]["analizados"] == 10  # una fila por producto y sucursal con inventario

    omeprazol = _item(p, ID_OMEPRAZOL, 2)
    assert (omeprazol["vendido_reciente"], omeprazol["vendido_previo"]) == (2, 0)
    assert omeprazol["promedio_semanal"] == 0.5
    assert omeprazol["promedio_diario"] == 0.07
    assert omeprazol["promedio_mensual"] == 2.14
    assert omeprazol["tendencia"] == "sube"
    assert omeprazol["variacion_pct"] is None  # no hay ventas previas con que comparar
    assert omeprazol["dias_de_stock"] == 840.0  # 60 u. a 2 u. cada 28 días

    paracetamol = _item(p, ID_PARACETAMOL, 1)
    assert (paracetamol["vendido_reciente"], paracetamol["vendido_previo"]) == (0, 2)
    assert paracetamol["tendencia"] == "baja"
    assert paracetamol["variacion_pct"] == -100.0
    assert paracetamol["dias_de_stock"] is None  # sin ventas recientes no se agota

    assert _item(p, ID_AMOXICILINA, 1)["dias_de_stock"] == 1120.0
    assert _item(p, ID_METFORMINA, 3)["dias_de_stock"] == 980.0
    assert _item(p, ID_LORATADINA, 1)["tendencia"] == "sin_ventas"


def test_cada_venta_cuenta_solo_en_su_sucursal(sesion):
    p = _pronostico(sesion)
    assert _item(p, ID_PARACETAMOL, 1)["vendido_previo"] == 2
    assert _item(p, ID_PARACETAMOL, 2)["vendido_previo"] == 0
    assert _item(p, ID_PARACETAMOL, 3)["vendido_previo"] == 0


def test_con_el_stock_del_seed_no_hace_falta_comprar(sesion):
    p = _pronostico(sesion)
    assert p["resumen"] == {
        "analizados": 10,
        "requieren_reposicion": 0,
        "prioridad_alta": 0,
        "unidades_sugeridas": 0,
    }
    assert all(i["cantidad_sugerida"] == 0 and i["prioridad"] == "baja" for i in p["items"])
    assert _pronostico(sesion, solo_reposicion=True)["items"] == []


def test_los_limites_de_las_ventanas_son_inclusivos(sesion):
    _vender(sesion, ID_LORATADINA, 1, 17, date(2026, 8, 5))  # un día antes de la ventana previa
    _vender(sesion, ID_LORATADINA, 1, 7, date(2026, 9, 2))  # último día de la ventana previa
    _vender(sesion, ID_LORATADINA, 1, 5, date(2026, 9, 3))  # primer día de la ventana reciente
    _vender(sesion, ID_LORATADINA, 1, 11, date(2026, 9, 30))  # día de corte
    _vender(sesion, ID_LORATADINA, 1, 13, date(2026, 10, 1))  # después del corte
    loratadina = _item(_pronostico(sesion), ID_LORATADINA, 1)
    assert (loratadina["vendido_reciente"], loratadina["vendido_previo"]) == (16, 7)


def test_las_ventas_canceladas_no_cuentan(sesion):
    _vender(sesion, ID_PARACETAMOL, 1, 28, date(2026, 9, 20), estado="cancelada")
    paracetamol = _item(_pronostico(sesion), ID_PARACETAMOL, 1)
    assert paracetamol["vendido_reciente"] == 0


# Recomendación de compra
def test_sugiere_comprar_cuando_el_stock_no_cubre_el_objetivo(sesion):
    _poner_stock(sesion, ID_OMEPRAZOL, 2, 3)
    omeprazol = _item(_pronostico(sesion), ID_OMEPRAZOL, 2)
    assert omeprazol["calculo"] == {
        "dias_ventana": 28,
        "dias_cobertura": 14,
        "demanda_cobertura": 1,  # 2 u. vendidas en 28 días, para 14 días
        "stock_objetivo": 16,  # mínimo 15 + 1
    }
    assert omeprazol["cantidad_sugerida"] == 13  # 16 - 3
    assert omeprazol["prioridad"] == "alta"  # por debajo del mínimo
    assert omeprazol["dias_de_stock"] == 42.0
    assert omeprazol["explicacion"] == (
        "Vendió 2 u. en las últimas 4 semanas (0,5 por semana). Con 3 u. en stock alcanza para 42 días. "
        "Objetivo: stock mínimo 15 + 14 días de venta (1 u.) = 16 u. Hay 3, conviene comprar 13."
    )


def test_prioridad_media_si_falta_pero_hay_stock_para_semanas(sesion):
    _vender(sesion, ID_PARACETAMOL, 1, 28, date(2026, 9, 20))
    _poner_stock(sesion, ID_PARACETAMOL, 1, 40)  # sobre el mínimo (30) y para 40 días
    paracetamol = _item(_pronostico(sesion), ID_PARACETAMOL, 1)
    assert (paracetamol["vendido_reciente"], paracetamol["vendido_previo"]) == (28, 2)
    assert paracetamol["promedio_diario"] == 1.0
    assert paracetamol["tendencia"] == "sube"
    assert paracetamol["variacion_pct"] == 1300.0
    assert paracetamol["dias_de_stock"] == 40.0
    assert paracetamol["calculo"]["stock_objetivo"] == 44  # mínimo 30 + 14 días a 1 u. por día
    assert paracetamol["cantidad_sugerida"] == 4
    assert paracetamol["prioridad"] == "media"


def test_prioridad_alta_si_quedan_pocos_dias_aunque_supere_el_minimo(sesion):
    _vender(sesion, ID_PARACETAMOL, 1, 140, date(2026, 9, 20))  # 5 u. por día
    _poner_stock(sesion, ID_PARACETAMOL, 1, 31)  # sobre el mínimo (30) pero alcanza 6,2 días
    paracetamol = _item(_pronostico(sesion), ID_PARACETAMOL, 1)
    assert paracetamol["dias_de_stock"] == 6.2
    assert paracetamol["cantidad_sugerida"] == 69  # 30 + 70 - 31
    assert paracetamol["prioridad"] == "alta"


def test_dias_de_cobertura_cambian_la_cantidad_sugerida(sesion):
    _poner_stock(sesion, ID_OMEPRAZOL, 2, 3)
    semana = _item(_pronostico(sesion, dias_cobertura=7), ID_OMEPRAZOL, 2)
    mes = _item(_pronostico(sesion, dias_cobertura=28), ID_OMEPRAZOL, 2)
    assert semana["calculo"]["demanda_cobertura"] == 1  # 2 u. por 7 días = 0,5, se redondea hacia arriba
    assert semana["cantidad_sugerida"] == 13
    assert mes["calculo"]["demanda_cobertura"] == 2
    assert mes["cantidad_sugerida"] == 14


def test_semanas_cambian_la_ventana_de_ventas(sesion):
    # con 1 semana (24/09 al 30/09) no entra ninguna venta del seed
    p = _pronostico(sesion, semanas=1)
    assert p["ventana_reciente"] == {"desde": "2026-09-24", "hasta": "2026-09-30"}
    assert all(i["vendido_reciente"] == 0 for i in p["items"])
    # con 8 semanas entran las cuatro ventas
    assert sum(i["vendido_reciente"] for i in _pronostico(sesion, semanas=8)["items"]) == 7


def test_lo_mas_urgente_va_primero(sesion):
    _poner_stock(sesion, ID_OMEPRAZOL, 2, 3)  # alta, sugiere 13
    _vender(sesion, ID_PARACETAMOL, 1, 28, date(2026, 9, 20))
    _poner_stock(sesion, ID_PARACETAMOL, 1, 40)  # media, sugiere 4
    p = _pronostico(sesion)
    assert [i["prioridad"] for i in p["items"][:2]] == ["alta", "media"]
    assert (p["items"][0]["nombre"], p["items"][1]["nombre"]) == ("Omeprazol 20mg", "Paracetamol 500mg")
    assert p["resumen"] == {
        "analizados": 10,
        "requieren_reposicion": 2,
        "prioridad_alta": 1,
        "unidades_sugeridas": 17,
    }
    assert [i["nombre"] for i in _pronostico(sesion, solo_reposicion=True)["items"]] == [
        "Omeprazol 20mg",
        "Paracetamol 500mg",
    ]


def test_filtra_por_sucursal_y_por_nombre(sesion):
    assert {i["id_sucursal"] for i in _pronostico(sesion, id_sucursal=2)["items"]} == {2}
    assert len(_pronostico(sesion, id_sucursal=2)["items"]) == 3
    por_nombre = _pronostico(sesion, q="paracetamol")["items"]
    assert len(por_nombre) == 3 and {i["nombre"] for i in por_nombre} == {"Paracetamol 500mg"}


# Endpoint
@pytest.mark.parametrize("ruta", ["/forecast", "/forecast?solo_reposicion=true"])
def test_sin_token_devuelve_401(anonimo, ruta):
    assert anonimo.get(f"{BASE}{ruta}").status_code == 401


@pytest.mark.parametrize("ruta", ["/forecast", "/forecast?solo_reposicion=true"])
def test_cliente_recibe_403(cliente, ruta):
    assert cliente.get(f"{BASE}{ruta}").status_code == 403


def test_endpoint_devuelve_los_numeros_del_seed(admin):
    resp = admin.get(f"{BASE}/forecast", params={"al": CORTE_ISO})
    assert resp.status_code == 200
    cuerpo = resp.json()
    assert cuerpo["resumen"]["analizados"] == 10
    omeprazol = next(i for i in cuerpo["items"] if i["nombre"] == "Omeprazol 20mg")
    assert (omeprazol["vendido_reciente"], omeprazol["promedio_semanal"], omeprazol["tendencia"]) == (2, 0.5, "sube")
    assert omeprazol["explicacion"].startswith("Vendió 2 u. en las últimas 4 semanas")


def test_endpoint_sin_fecha_de_corte_usa_hoy(admin):
    cuerpo = admin.get(f"{BASE}/forecast").json()
    hoy = report_service.today_cr()
    assert cuerpo["al"] == hoy.isoformat()
    assert cuerpo["ventana_reciente"]["hasta"] == hoy.isoformat()


def test_endpoint_solo_reposicion(admin, sesion):
    assert admin.get(f"{BASE}/forecast", params={"al": CORTE_ISO, "solo_reposicion": True}).json()["items"] == []
    _poner_stock(sesion, ID_OMEPRAZOL, 2, 3)
    items = admin.get(f"{BASE}/forecast", params={"al": CORTE_ISO, "solo_reposicion": True}).json()["items"]
    assert [(i["nombre"], i["cantidad_sugerida"]) for i in items] == [("Omeprazol 20mg", 13)]


@pytest.mark.parametrize(
    "params",
    [{"semanas": 0}, {"semanas": 27}, {"dias_cobertura": 0}, {"dias_cobertura": 91}, {"id_sucursal": 0}, {"al": "no-es-fecha"}],
)
def test_endpoint_rechaza_parametros_invalidos(admin, params):
    assert admin.get(f"{BASE}/forecast", params=params).status_code == 422


# Herramientas del Copilot
def _ctx(sesion: Session, rol: str = "admin") -> tools.Contexto:
    return tools.Contexto(db=sesion, id_usuario=1, rol=rol)


def _preparar_ventas_recientes(sesion: Session) -> None:
    """Paracetamol de la sucursal 1: 56 u. vendidas hace 3 días (2 por día) y solo 20 en stock (mínimo 30)."""
    _vender(sesion, ID_PARACETAMOL, 1, 56, report_service.today_cr() - timedelta(days=3))
    _poner_stock(sesion, ID_PARACETAMOL, 1, 20)


def test_copilot_recomienda_que_comprar_con_cantidades_y_explicacion(sesion):
    _preparar_ventas_recientes(sesion)
    datos, fuentes = tools.ejecutar(_ctx(sesion), "recomendaciones_reposicion", {})
    assert datos["total"] == 1
    assert datos["unidades_sugeridas_total"] == 38  # mínimo 30 + 28 u. de 14 días - 20 en stock
    fila = datos["recomendaciones"][0]
    assert (fila["producto"], fila["sucursal"]) == ("Paracetamol 500mg", "Farmacia Central")
    assert (fila["stock_actual"], fila["cantidad_sugerida"], fila["prioridad"]) == (20, 38, "alta")
    assert fila["dias_de_stock"] == 10.0
    assert "conviene comprar 38" in fila["explicacion"]
    assert fuentes and fuentes[0]["tipo"] == "base_de_datos"


def test_copilot_compra_de_la_semana_usa_siete_dias_de_cobertura(sesion):
    _preparar_ventas_recientes(sesion)
    datos, _ = tools.ejecutar(_ctx(sesion), "recomendaciones_reposicion", {"dias_cobertura": 7})
    assert datos["dias_cobertura"] == 7
    assert datos["recomendaciones"][0]["cantidad_sugerida"] == 24  # 30 + 14 - 20


def test_copilot_sin_nada_que_reponer_lo_dice(sesion):
    datos, fuentes = tools.ejecutar(_ctx(sesion), "recomendaciones_reposicion", {})
    assert datos["total"] == 0 and datos["recomendaciones"] == []
    assert "ningún producto necesita reposición" in datos["nota"]
    assert fuentes == []


def test_copilot_filtra_la_reposicion_por_sucursal(sesion):
    _preparar_ventas_recientes(sesion)
    datos, _ = tools.ejecutar(_ctx(sesion), "recomendaciones_reposicion", {"id_sucursal": 2})
    assert datos["total"] == 0


def test_copilot_tendencia_de_un_producto(sesion):
    _preparar_ventas_recientes(sesion)
    datos, fuentes = tools.ejecutar(_ctx(sesion), "tendencia_ventas", {"nombre_producto": "paracetamol"})
    assert datos["total"] == 3  # una fila por sucursal
    primera = datos["productos"][0]
    assert primera["sucursal"] == "Farmacia Central"  # la más urgente primero
    assert (primera["tendencia"], primera["promedio_semanal"]) == ("sube", 14.0)
    assert fuentes


def test_copilot_tendencia_sin_coincidencias(sesion):
    datos, fuentes = tools.ejecutar(_ctx(sesion), "tendencia_ventas", {"nombre_producto": "no existe"})
    assert datos["total"] == 0 and fuentes == []


def test_copilot_herramientas_de_pronostico_son_solo_para_admin(sesion):
    nombres_empleado = {d["function"]["name"] for d in tools.definiciones("empleado")}
    nombres_admin = {d["function"]["name"] for d in tools.definiciones("admin")}
    assert {"recomendaciones_reposicion", "tendencia_ventas"} <= nombres_admin
    assert not {"recomendaciones_reposicion", "tendencia_ventas"} & nombres_empleado
    datos, _ = tools.ejecutar(_ctx(sesion, "empleado"), "recomendaciones_reposicion", {})
    assert "solo está disponible para administradores" in datos["error"]
