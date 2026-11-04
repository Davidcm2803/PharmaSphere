from datetime import date, timedelta

import pytest

from app.models.customer_model import Cliente
from app.models.inventory_model import Inventario
from app.models.movement_model import MovimientoInventario
from app.models.recipe_model import Receta
from app.services import auth_service

# `client` es una fixture definida en test_auth.py
from app.test.test_auth import (  # noqa: F401
    TestingSessionLocal,
    auth_header,
    client,
    registrar_y_loguear,
    token_admin,
)

OTRO_CLIENTE = {
    "nombre": "Otro Cliente",
    "correo": "otro@mail.com",
    "password": "password123",
}


@pytest.fixture()
def admin(client):
    return token_admin(client)


@pytest.fixture()
def cliente(client):
    return registrar_y_loguear(client).json()["access_token"]


@pytest.fixture()
def tienda(client, admin):
    """Una sucursal activa con Paracetamol (stock 10), Ibuprofeno (stock 0) y Amoxicilina (con receta)."""
    h = auth_header(admin)
    sucursal = client.post("/api/branches", json={"nombre": "Sucursal Central"}, headers=h).json()

    def producto(**body):
        return client.post("/api/products", json=body, headers=h).json()

    paracetamol = producto(nombre="Paracetamol 500mg", categoria="Analgesicos", precio=1500, costo=800)
    ibuprofeno = producto(nombre="Ibuprofeno 400mg", categoria="Analgesicos", precio=1800, costo=950)
    amoxicilina = producto(
        nombre="Amoxicilina 500mg", categoria="Antibioticos", precio=3500, costo=1900, requiere_receta=True
    )
    for prod, cantidad in ((paracetamol, 10), (amoxicilina, 5)):
        client.post(
            "/api/inventory/adjust",
            json={
                "id_producto": prod["id_producto"],
                "id_sucursal": sucursal["id_sucursal"],
                "cantidad": cantidad,
                "motivo": "Stock inicial",
            },
            headers=h,
        )
    return {
        "sucursal": sucursal["id_sucursal"],
        "paracetamol": paracetamol["id_producto"],
        "ibuprofeno": ibuprofeno["id_producto"],
        "amoxicilina": amoxicilina["id_producto"],
    }


def comprar(client, token, tienda, items, **extra):
    body = {"id_sucursal": tienda["sucursal"], "items": items, **extra}
    return client.post("/api/sales", json=body, headers=auth_header(token) if token else {})


def stock(tienda, clave):
    db = TestingSessionLocal()
    inv = (
        db.query(Inventario)
        .filter_by(id_producto=tienda[clave], id_sucursal=tienda["sucursal"])
        .first()
    )
    cantidad = inv.cantidad if inv else None
    db.close()
    return cantidad


# Compra exitosa
def test_comprar_crea_la_venta_y_descuenta_stock(client, cliente, tienda):
    resp = comprar(client, cliente, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 3}])
    assert resp.status_code == 201
    venta = resp.json()
    assert venta["total"] == 4500
    assert venta["estado"] == "pendiente"
    assert venta["tipo"] == "online"
    assert venta["sucursal_nombre"] == "Sucursal Central"
    assert venta["items"][0]["cantidad"] == 3
    assert venta["items"][0]["subtotal"] == 4500
    assert stock(tienda, "paracetamol") == 7


def test_comprar_registra_el_movimiento_en_el_kardex(client, cliente, tienda):
    comprar(client, cliente, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 2}])
    db = TestingSessionLocal()
    mov = db.query(MovimientoInventario).filter_by(tipo="venta").one()
    assert mov.cantidad == -2
    assert mov.id_venta is not None
    db.close()


def test_comprar_guarda_telefono_y_cedula_del_cliente(client, cliente, tienda):
    resp = comprar(
        client,
        cliente,
        tienda,
        [{"id_producto": tienda["paracetamol"], "cantidad": 1}],
        telefono="8888-0000",
        cedula="1-1111-1111",
    )
    assert resp.status_code == 201
    db = TestingSessionLocal()
    perfil = db.query(Cliente).filter_by(correo="cliente@mail.com").one()
    assert (perfil.telefono, perfil.cedula) == ("8888-0000", "1-1111-1111")
    db.close()


def test_cedula_repetida_devuelve_409_y_no_vende(client, cliente, tienda):
    body = [{"id_producto": tienda["paracetamol"], "cantidad": 1}]
    comprar(client, cliente, tienda, body, cedula="1-1111-1111")
    otro = registrar_y_loguear(client, OTRO_CLIENTE).json()["access_token"]
    resp = comprar(client, otro, tienda, body, cedula="1-1111-1111")
    assert resp.status_code == 409
    assert stock(tienda, "paracetamol") == 9


# Errores de negocio (400)
def test_stock_insuficiente_devuelve_400_y_no_descuenta(client, cliente, tienda):
    resp = comprar(client, cliente, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 11}])
    assert resp.status_code == 400
    assert "solo hay 10" in resp.json()["message"]
    assert stock(tienda, "paracetamol") == 10


def test_producto_agotado_devuelve_400(client, cliente, tienda):
    resp = comprar(client, cliente, tienda, [{"id_producto": tienda["ibuprofeno"], "cantidad": 1}])
    assert resp.status_code == 400
    assert "agotado" in resp.json()["message"]


def test_producto_con_receta_devuelve_400(client, cliente, tienda):
    resp = comprar(client, cliente, tienda, [{"id_producto": tienda["amoxicilina"], "cantidad": 1}])
    assert resp.status_code == 400
    assert "receta" in resp.json()["message"]
    assert stock(tienda, "amoxicilina") == 5


def test_un_producto_malo_cancela_toda_la_compra(client, cliente, tienda):
    resp = comprar(
        client,
        cliente,
        tienda,
        [
            {"id_producto": tienda["paracetamol"], "cantidad": 2},
            {"id_producto": tienda["amoxicilina"], "cantidad": 1},
        ],
    )
    assert resp.status_code == 400
    assert stock(tienda, "paracetamol") == 10


def test_producto_inexistente_devuelve_400(client, cliente, tienda):
    resp = comprar(client, cliente, tienda, [{"id_producto": 9999, "cantidad": 1}])
    assert resp.status_code == 400


def test_sucursal_inexistente_devuelve_400(client, cliente, tienda):
    body = {"id_sucursal": 9999, "items": [{"id_producto": tienda["paracetamol"], "cantidad": 1}]}
    resp = client.post("/api/sales", json=body, headers=auth_header(cliente))
    assert resp.status_code == 400


# Validación del body (422)
def test_carrito_vacio_devuelve_422(client, cliente, tienda):
    assert comprar(client, cliente, tienda, []).status_code == 422


def test_cantidad_cero_devuelve_422(client, cliente, tienda):
    resp = comprar(client, cliente, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 0}])
    assert resp.status_code == 422


def test_producto_repetido_devuelve_422(client, cliente, tienda):
    item = {"id_producto": tienda["paracetamol"], "cantidad": 1}
    assert comprar(client, cliente, tienda, [item, item]).status_code == 422


# Permisos
def test_comprar_sin_token_devuelve_401(client, tienda):
    resp = comprar(client, None, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 1}])
    assert resp.status_code == 401


def test_comprar_como_admin_devuelve_403(client, admin, tienda):
    resp = comprar(client, admin, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 1}])
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Venta en mostrador y consultas del panel
# ---------------------------------------------------------------------------
def token_empleado(client):
    db = TestingSessionLocal()
    auth_service.create_user(
        db, nombre="Empleado", correo="empleado@mail.com", password="empleado123", rol="empleado"
    )
    db.close()
    resp = client.post(
        "/api/auth/login", json={"correo": "empleado@mail.com", "password": "empleado123"}
    )
    return resp.json()["access_token"]


@pytest.fixture()
def empleado(client):
    return token_empleado(client)


def vender(client, token, tienda, items, **extra):
    body = {"id_sucursal": tienda["sucursal"], "items": items, **extra}
    return client.post("/api/sales/mostrador", json=body, headers=auth_header(token) if token else {})


def dar_cedula(correo="cliente@mail.com", cedula="1-1111-1111"):
    db = TestingSessionLocal()
    db.query(Cliente).filter_by(correo=correo).one().cedula = cedula
    db.commit()
    db.close()


def crear_receta(correo="cliente@mail.com", id_producto=None, cantidad=2, **extra):
    dar_cedula(correo)
    db = TestingSessionLocal()
    cli = db.query(Cliente).filter_by(correo=correo).one()
    db.add(
        Receta(
            id_cliente=cli.id_cliente,
            id_producto=id_producto,
            cantidad=cantidad,
            vigencia_hasta=extra.pop("vigencia_hasta", date.today() + timedelta(days=30)),
            **extra,
        )
    )
    db.commit()
    db.close()


def estado_receta():
    db = TestingSessionLocal()
    receta = db.query(Receta).first()
    resultado = (receta.estado, receta.id_venta)
    db.close()
    return resultado


# Venta en mostrador exitosa
def test_empleado_vende_en_mostrador_y_descuenta_stock(client, empleado, tienda):
    resp = vender(client, empleado, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 4}])
    assert resp.status_code == 201
    venta = resp.json()
    assert venta["tipo"] == "mostrador"
    assert venta["estado"] == "pagada"
    assert venta["metodo_pago"] == "efectivo"
    assert venta["id_cliente"] is None
    assert venta["total"] == 6000
    assert stock(tienda, "paracetamol") == 6


def test_admin_tambien_puede_vender_en_mostrador(client, admin, tienda):
    resp = vender(client, admin, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 1}])
    assert resp.status_code == 201


def test_total_de_mostrador_lo_calcula_el_backend(client, empleado, tienda):
    resp = vender(
        client,
        empleado,
        tienda,
        [{"id_producto": tienda["paracetamol"], "cantidad": 2}],
        total=1,
        precio_unitario=1,
    )
    assert resp.status_code == 201
    assert resp.json()["total"] == 3000


def test_mostrador_registra_kardex_con_motivo(client, empleado, tienda):
    vender(client, empleado, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 2}])
    db = TestingSessionLocal()
    mov = db.query(MovimientoInventario).filter_by(tipo="venta").one()
    assert mov.cantidad == -2
    assert mov.id_venta is not None
    assert "mostrador" in mov.motivo
    db.close()


def test_mostrador_con_cliente_por_cedula(client, empleado, cliente, tienda):
    dar_cedula()
    resp = vender(
        client,
        empleado,
        tienda,
        [{"id_producto": tienda["paracetamol"], "cantidad": 1}],
        cedula_cliente="1-1111-1111",
        metodo_pago="tarjeta",
        tarjeta_ultimos_4="4242",
    )
    assert resp.status_code == 201
    venta = resp.json()
    assert venta["cliente_nombre"] == "Cliente Prueba"
    assert venta["cliente_cedula"] == "1-1111-1111"
    assert venta["tarjeta_ultimos_4"] == "4242"


# Errores de negocio en mostrador (400)
def test_mostrador_sin_stock_devuelve_400_y_no_descuenta(client, empleado, tienda):
    resp = vender(client, empleado, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 11}])
    assert resp.status_code == 400
    assert "solo hay 10" in resp.json()["message"]
    assert stock(tienda, "paracetamol") == 10


def test_mostrador_un_producto_malo_cancela_toda_la_venta(client, empleado, tienda):
    resp = vender(
        client,
        empleado,
        tienda,
        [
            {"id_producto": tienda["paracetamol"], "cantidad": 2},
            {"id_producto": tienda["ibuprofeno"], "cantidad": 1},
        ],
    )
    assert resp.status_code == 400
    assert stock(tienda, "paracetamol") == 10


def test_mostrador_cedula_inexistente_devuelve_400(client, empleado, tienda):
    resp = vender(
        client,
        empleado,
        tienda,
        [{"id_producto": tienda["paracetamol"], "cantidad": 1}],
        cedula_cliente="9-9999-9999",
    )
    assert resp.status_code == 400
    assert "cédula" in resp.json()["message"]
    assert stock(tienda, "paracetamol") == 10


# Recetas
def test_producto_con_receta_sin_cliente_devuelve_400(client, empleado, tienda):
    resp = vender(client, empleado, tienda, [{"id_producto": tienda["amoxicilina"], "cantidad": 1}])
    assert resp.status_code == 400
    assert "receta" in resp.json()["message"]
    assert stock(tienda, "amoxicilina") == 5


def test_producto_con_receta_y_cliente_sin_receta_devuelve_400(client, empleado, cliente, tienda):
    crear_receta(id_producto=tienda["paracetamol"])  # receta de OTRO producto
    resp = vender(
        client,
        empleado,
        tienda,
        [{"id_producto": tienda["amoxicilina"], "cantidad": 1}],
        cedula_cliente="1-1111-1111",
    )
    assert resp.status_code == 400
    assert stock(tienda, "amoxicilina") == 5


def test_receta_vigente_permite_la_venta_y_queda_usada(client, empleado, cliente, tienda):
    crear_receta(id_producto=tienda["amoxicilina"], cantidad=2)
    resp = vender(
        client,
        empleado,
        tienda,
        [{"id_producto": tienda["amoxicilina"], "cantidad": 2}],
        cedula_cliente="1-1111-1111",
    )
    assert resp.status_code == 201
    assert stock(tienda, "amoxicilina") == 3
    assert estado_receta() == ("usada", resp.json()["id_venta"])


def test_receta_vencida_devuelve_400(client, empleado, cliente, tienda):
    crear_receta(
        id_producto=tienda["amoxicilina"], vigencia_hasta=date.today() - timedelta(days=1), fecha=date.today() - timedelta(days=10)
    )
    resp = vender(
        client,
        empleado,
        tienda,
        [{"id_producto": tienda["amoxicilina"], "cantidad": 1}],
        cedula_cliente="1-1111-1111",
    )
    assert resp.status_code == 400
    assert stock(tienda, "amoxicilina") == 5


def test_receta_con_menos_cantidad_devuelve_400(client, empleado, cliente, tienda):
    crear_receta(id_producto=tienda["amoxicilina"], cantidad=1)
    resp = vender(
        client,
        empleado,
        tienda,
        [{"id_producto": tienda["amoxicilina"], "cantidad": 2}],
        cedula_cliente="1-1111-1111",
    )
    assert resp.status_code == 400
    assert estado_receta()[0] == "vigente"


def test_receta_no_se_reutiliza(client, empleado, cliente, tienda):
    crear_receta(id_producto=tienda["amoxicilina"], cantidad=1)
    item = [{"id_producto": tienda["amoxicilina"], "cantidad": 1}]
    assert vender(client, empleado, tienda, item, cedula_cliente="1-1111-1111").status_code == 201
    assert vender(client, empleado, tienda, item, cedula_cliente="1-1111-1111").status_code == 400
    assert stock(tienda, "amoxicilina") == 4


def test_venta_fallida_no_consume_la_receta(client, empleado, cliente, tienda):
    crear_receta(id_producto=tienda["amoxicilina"], cantidad=1)
    resp = vender(
        client,
        empleado,
        tienda,
        [
            {"id_producto": tienda["amoxicilina"], "cantidad": 1},
            {"id_producto": tienda["ibuprofeno"], "cantidad": 1},  # agotado
        ],
        cedula_cliente="1-1111-1111",
    )
    assert resp.status_code == 400
    assert estado_receta() == ("vigente", None)


# Validación y permisos del mostrador
def test_mostrador_tarjeta_con_efectivo_devuelve_422(client, empleado, tienda):
    resp = vender(
        client,
        empleado,
        tienda,
        [{"id_producto": tienda["paracetamol"], "cantidad": 1}],
        tarjeta_ultimos_4="4242",
    )
    assert resp.status_code == 422


def test_mostrador_sin_token_devuelve_401(client, tienda):
    resp = vender(client, None, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 1}])
    assert resp.status_code == 401


def test_mostrador_como_cliente_devuelve_403(client, cliente, tienda):
    resp = vender(client, cliente, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 1}])
    assert resp.status_code == 403


# GET /sales (listado del panel)
@pytest.fixture()
def ventas(client, cliente, empleado, tienda):
    comprar(client, cliente, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 1}])
    vender(client, empleado, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 2}])
    vender(client, empleado, tienda, [{"id_producto": tienda["paracetamol"], "cantidad": 3}])


def test_listar_ventas_como_empleado(client, empleado, ventas):
    resp = client.get("/api/sales", headers=auth_header(empleado))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert body["items"][0]["id_venta"] > body["items"][-1]["id_venta"]  # más recientes primero
    assert isinstance(body["items"][0]["items"], list)


def test_listar_ventas_filtra_por_tipo(client, admin, ventas):
    resp = client.get("/api/sales?tipo=mostrador", headers=auth_header(admin))
    assert resp.json()["total"] == 2
    assert {v["tipo"] for v in resp.json()["items"]} == {"mostrador"}


def test_listar_ventas_filtra_por_estado(client, admin, ventas):
    assert client.get("/api/sales?estado=pendiente", headers=auth_header(admin)).json()["total"] == 1


def test_listar_ventas_filtra_por_sucursal(client, admin, tienda, ventas):
    ok = client.get(f"/api/sales?id_sucursal={tienda['sucursal']}", headers=auth_header(admin))
    otra = client.get("/api/sales?id_sucursal=9999", headers=auth_header(admin))
    assert ok.json()["total"] == 3
    assert otra.json()["total"] == 0


def test_listar_ventas_filtra_por_fecha(client, admin, ventas):
    hoy = date.today().isoformat()
    manana = (date.today() + timedelta(days=1)).isoformat()
    ayer = (date.today() - timedelta(days=1)).isoformat()
    h = auth_header(admin)
    assert client.get(f"/api/sales?desde={hoy}&hasta={hoy}", headers=h).json()["total"] == 3
    assert client.get(f"/api/sales?desde={manana}", headers=h).json()["total"] == 0
    assert client.get(f"/api/sales?hasta={ayer}", headers=h).json()["total"] == 0


def test_listar_ventas_con_rango_invertido_devuelve_400(client, admin):
    resp = client.get("/api/sales?desde=2026-02-01&hasta=2026-01-01", headers=auth_header(admin))
    assert resp.status_code == 400


def test_listar_ventas_con_tipo_invalido_devuelve_422(client, admin):
    assert client.get("/api/sales?tipo=otro", headers=auth_header(admin)).status_code == 422


def test_listar_ventas_pagina(client, admin, ventas):
    body = client.get("/api/sales?page_size=2", headers=auth_header(admin)).json()
    assert (len(body["items"]), body["total"], body["pages"]) == (2, 3, 2)


def test_listar_ventas_sin_token_devuelve_401(client):
    assert client.get("/api/sales").status_code == 401


def test_listar_ventas_como_cliente_devuelve_403(client, cliente):
    assert client.get("/api/sales", headers=auth_header(cliente)).status_code == 403


# GET /sales/{id}
def test_detalle_de_venta(client, empleado, ventas):
    resp = client.get("/api/sales/1", headers=auth_header(empleado))
    assert resp.status_code == 200
    venta = resp.json()
    assert venta["cliente_nombre"] == "Cliente Prueba"
    assert venta["items"][0]["subtotal"] == 1500


def test_detalle_de_venta_inexistente_devuelve_404(client, admin):
    resp = client.get("/api/sales/9999", headers=auth_header(admin))
    assert resp.status_code == 404
    assert resp.json()["success"] is False


def test_detalle_de_venta_como_cliente_devuelve_403(client, cliente, ventas):
    assert client.get("/api/sales/1", headers=auth_header(cliente)).status_code == 403


def test_detalle_de_venta_sin_token_devuelve_401(client):
    assert client.get("/api/sales/1").status_code == 401


# GET /sales/me
def test_mis_compras_solo_muestra_las_del_cliente(client, cliente, ventas):
    resp = client.get("/api/sales/me", headers=auth_header(cliente))
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["tipo"] == "online"


def test_mis_compras_como_empleado_devuelve_403(client, empleado):
    assert client.get("/api/sales/me", headers=auth_header(empleado)).status_code == 403