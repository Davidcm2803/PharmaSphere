from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.models.branch_model import Sucursal
from app.models.inventory_model import Inventario
from app.models.lot_model import Lote
from app.models.movement_model import MovimientoInventario
from app.models.product_model import Producto
from app.models.supplier_model import Proveedor

# `client` es una fixture definida en test_auth.py
from app.test.test_auth import (  # noqa: F401
    TestingSessionLocal,
    auth_header,
    client,
    registrar_y_loguear,
    token_admin,
)

BASE = "/api/purchases"


@pytest.fixture()
def admin(client):
    return token_admin(client)


@pytest.fixture()
def cliente(client):
    return registrar_y_loguear(client).json()["access_token"]


@pytest.fixture()
def db(client):
    sesion = TestingSessionLocal()
    yield sesion
    sesion.close()


@pytest.fixture()
def escenario(db):
    prov = Proveedor(nombre="Prov Test")
    suc = Sucursal(nombre="Sucursal Test")
    prod = Producto(nombre="Producto Test", precio=1000, costo=500)
    db.add_all([prov, suc, prod])
    db.commit()
    return prov, suc, prod


def _crear_compra(client, admin, prov, suc, prod, cantidad=100):
    r = client.post(
        BASE,
        json={
            "id_proveedor": prov.id_proveedor,
            "id_sucursal": suc.id_sucursal,
            "detalles": [{"id_producto": prod.id_producto, "cantidad": cantidad, "costo_unitario": "500.00"}],
        },
        headers=auth_header(admin),
    )
    assert r.status_code == 201, r.text
    return r.json()


def _body_recepcion(prod, lotes):
    return {"lineas": [{"id_producto": prod.id_producto, "lotes": lotes}]}


def _lote(numero, dias, cantidad):
    return {"numero_lote": numero, "fecha_vencimiento": str(date.today() + timedelta(days=dias)), "cantidad": cantidad}


# Crear
def test_crear_compra_calcula_total(client, admin, escenario):
    prov, suc, prod = escenario
    compra = _crear_compra(client, admin, prov, suc, prod, cantidad=10)
    assert compra["estado"] == "pendiente"
    assert float(compra["total"]) == 5000.0


def test_crear_compra_sin_token_devuelve_401(client, escenario):
    prov, suc, prod = escenario
    r = client.post(BASE, json={
        "id_proveedor": prov.id_proveedor, "id_sucursal": suc.id_sucursal,
        "detalles": [{"id_producto": prod.id_producto, "cantidad": 1, "costo_unitario": "1.00"}],
    })
    assert r.status_code == 401


def test_crear_compra_como_cliente_devuelve_403(client, cliente, escenario):
    prov, suc, prod = escenario
    r = client.post(BASE, json={
        "id_proveedor": prov.id_proveedor, "id_sucursal": suc.id_sucursal,
        "detalles": [{"id_producto": prod.id_producto, "cantidad": 1, "costo_unitario": "1.00"}],
    }, headers=auth_header(cliente))
    assert r.status_code == 403


def test_crear_compra_con_proveedor_inexistente_devuelve_404(client, admin, escenario):
    _, suc, prod = escenario
    r = client.post(BASE, json={
        "id_proveedor": 9999, "id_sucursal": suc.id_sucursal,
        "detalles": [{"id_producto": prod.id_producto, "cantidad": 1, "costo_unitario": "1.00"}],
    }, headers=auth_header(admin))
    assert r.status_code == 404


def test_crear_compra_con_producto_repetido_devuelve_422(client, admin, escenario):
    prov, suc, prod = escenario
    linea = {"id_producto": prod.id_producto, "cantidad": 1, "costo_unitario": "1.00"}
    r = client.post(BASE, json={
        "id_proveedor": prov.id_proveedor, "id_sucursal": suc.id_sucursal, "detalles": [linea, linea],
    }, headers=auth_header(admin))
    assert r.status_code == 422


# Recibir
def test_recibir_compra_crea_lotes_y_sube_stock(client, admin, db, escenario):
    prov, suc, prod = escenario
    compra = _crear_compra(client, admin, prov, suc, prod, cantidad=100)

    r = client.post(
        f"{BASE}/{compra['id_compra']}/receive",
        json=_body_recepcion(prod, [_lote("L-A", 90, 60), _lote("L-B", 200, 40)]),
        headers=auth_header(admin),
    )
    assert r.status_code == 200, r.text
    assert r.json()["compra"]["estado"] == "recibida"

    lotes = db.scalars(select(Lote).where(Lote.id_producto == prod.id_producto)).all()
    assert {(l.numero_lote, l.cantidad) for l in lotes} == {("L-A", 60), ("L-B", 40)}

    inv = db.scalar(select(Inventario).where(
        Inventario.id_producto == prod.id_producto, Inventario.id_sucursal == suc.id_sucursal))
    assert inv.cantidad == 100

    movs = db.scalars(select(MovimientoInventario).where(
        MovimientoInventario.id_compra == compra["id_compra"])).all()
    assert sorted(m.cantidad for m in movs) == [40, 60]
    assert all(m.id_usuario is not None for m in movs)


def test_recibir_sin_token_devuelve_401(client, admin, escenario):
    prov, suc, prod = escenario
    compra = _crear_compra(client, admin, prov, suc, prod, cantidad=10)
    r = client.post(f"{BASE}/{compra['id_compra']}/receive", json=_body_recepcion(prod, [_lote("L-A", 90, 10)]))
    assert r.status_code == 401


def test_recibir_compra_inexistente_devuelve_404(client, admin, escenario):
    _, _, prod = escenario
    r = client.post(f"{BASE}/9999/receive", json=_body_recepcion(prod, [_lote("L-A", 90, 10)]),
                    headers=auth_header(admin))
    assert r.status_code == 404


def test_recibir_dos_veces_da_409_y_no_duplica_stock(client, admin, db, escenario):
    prov, suc, prod = escenario
    compra = _crear_compra(client, admin, prov, suc, prod, cantidad=10)
    url = f"{BASE}/{compra['id_compra']}/receive"
    body = _body_recepcion(prod, [_lote("L-A", 90, 10)])
    assert client.post(url, json=body, headers=auth_header(admin)).status_code == 200
    assert client.post(url, json=body, headers=auth_header(admin)).status_code == 409
    inv = db.scalar(select(Inventario).where(Inventario.id_producto == prod.id_producto))
    assert inv.cantidad == 10


def test_recibir_con_cantidad_distinta_no_crea_nada(client, admin, db, escenario):
    prov, suc, prod = escenario
    compra = _crear_compra(client, admin, prov, suc, prod, cantidad=10)
    r = client.post(f"{BASE}/{compra['id_compra']}/receive",
                    json=_body_recepcion(prod, [_lote("L-A", 90, 7)]), headers=auth_header(admin))
    assert r.status_code == 422
    assert db.scalars(select(Lote).where(Lote.id_producto == prod.id_producto)).all() == []


def test_recibir_lote_ya_vencido_se_rechaza(client, admin, escenario):
    prov, suc, prod = escenario
    compra = _crear_compra(client, admin, prov, suc, prod, cantidad=10)
    r = client.post(f"{BASE}/{compra['id_compra']}/receive",
                    json=_body_recepcion(prod, [_lote("L-A", -1, 10)]), headers=auth_header(admin))
    assert r.status_code == 422


# Lista y detalle
def test_listar_compras_con_nombres_y_filtro_por_estado(client, admin, escenario):
    prov, suc, prod = escenario
    _crear_compra(client, admin, prov, suc, prod, cantidad=5)
    recibida = _crear_compra(client, admin, prov, suc, prod, cantidad=7)
    client.post(f"{BASE}/{recibida['id_compra']}/receive",
                json=_body_recepcion(prod, [_lote("L-A", 90, 7)]), headers=auth_header(admin))

    todas = client.get(BASE, headers=auth_header(admin))
    assert todas.status_code == 200
    data = todas.json()
    assert data["total"] == 2
    assert data["items"][0]["proveedor_nombre"] == "Prov Test"
    assert data["items"][0]["sucursal_nombre"] == "Sucursal Test"
    assert data["items"][0]["num_productos"] == 1

    pendientes = client.get(f"{BASE}?estado=pendiente", headers=auth_header(admin)).json()
    assert pendientes["total"] == 1
    assert pendientes["items"][0]["estado"] == "pendiente"


def test_listar_compras_estado_invalido_devuelve_422(client, admin):
    assert client.get(f"{BASE}?estado=inventado", headers=auth_header(admin)).status_code == 422


def test_listar_compras_sin_token_401_y_cliente_403(client, cliente):
    assert client.get(BASE).status_code == 401
    assert client.get(BASE, headers=auth_header(cliente)).status_code == 403


def test_detalle_de_compra_recibida_incluye_lotes(client, admin, escenario):
    prov, suc, prod = escenario
    compra = _crear_compra(client, admin, prov, suc, prod, cantidad=10)
    client.post(f"{BASE}/{compra['id_compra']}/receive",
                json=_body_recepcion(prod, [_lote("L-A", 90, 10)]), headers=auth_header(admin))

    r = client.get(f"{BASE}/{compra['id_compra']}", headers=auth_header(admin))
    assert r.status_code == 200
    data = r.json()
    assert data["estado"] == "recibida"
    assert data["detalles"][0]["nombre_producto"] == "Producto Test"
    assert float(data["detalles"][0]["subtotal"]) == 5000.0
    assert [l["numero_lote"] for l in data["lotes"]] == ["L-A"]


def test_detalle_de_compra_pendiente_no_tiene_lotes(client, admin, escenario):
    prov, suc, prod = escenario
    compra = _crear_compra(client, admin, prov, suc, prod, cantidad=10)
    data = client.get(f"{BASE}/{compra['id_compra']}", headers=auth_header(admin)).json()
    assert data["estado"] == "pendiente"
    assert data["lotes"] == []


def test_detalle_de_compra_inexistente_devuelve_404(client, admin):
    assert client.get(f"{BASE}/9999", headers=auth_header(admin)).status_code == 404