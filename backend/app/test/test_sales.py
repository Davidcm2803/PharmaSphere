import pytest

from app.models.customer_model import Cliente
from app.models.inventory_model import Inventario
from app.models.movement_model import MovimientoInventario

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