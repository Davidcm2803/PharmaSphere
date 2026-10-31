from datetime import datetime
from decimal import Decimal
from typing import Optional

import pytest

# `client` es una fixture definida en test_auth.py. Va PRIMERO porque ahí se
# configuran las variables de entorno que necesitan los demás imports.
from app.test.test_auth import (  # noqa: F401, I001
    TestingSessionLocal,
    auth_header,
    client,
    registrar_y_loguear,
    token_admin,
)

from app.models.branch_model import Sucursal  # noqa: E402
from app.models.sale_model import DetalleVenta, Venta  # noqa: E402
from app.services import auth_service  # noqa: E402

ANA = {"nombre": "Ana Mora", "cedula": "1-1111-1111", "telefono": "8888-0000", "correo": "ana@mail.com"}
LUIS = {"nombre": "Luis Rojas", "cedula": "2-2222-2222", "correo": "luis@mail.com"}


@pytest.fixture()
def admin(client):
    return token_admin(client)


@pytest.fixture()
def empleado(client, admin):
    db = TestingSessionLocal()
    auth_service.create_user(
        db, nombre="Empleado", correo="empleado@mail.com", password="empleado123", rol="empleado"
    )
    db.close()
    resp = client.post(
        "/api/auth/login", json={"correo": "empleado@mail.com", "password": "empleado123"}
    )
    return resp.json()["access_token"]


def crear(client, token, **body):
    return client.post("/api/customers", json=body, headers=auth_header(token))


def crear_producto(client, token, **body):
    datos = {"nombre": "Paracetamol 500mg", "precio": 1500, **body}
    return client.post("/api/products", json=datos, headers=auth_header(token)).json()


def crear_venta(
    id_cliente: Optional[int], lineas: list, fecha: datetime, total: Decimal
) -> int:
    """Inserta una venta con sus detalles directo en la BD (el servicio de ventas es otro issue).
    `lineas` = [(id_producto, cantidad, precio_unitario)]"""
    db = TestingSessionLocal()
    try:
        sucursal = db.query(Sucursal).first()
        if sucursal is None:
            sucursal = Sucursal(nombre="Central")
            db.add(sucursal)
            db.flush()
        venta = Venta(
            id_sucursal=sucursal.id_sucursal,
            id_cliente=id_cliente,
            fecha=fecha,
            total=total,
            tipo="mostrador",
            estado="pagada",
            metodo_pago="efectivo",
        )
        db.add(venta)
        db.flush()
        for id_producto, cantidad, precio in lineas:
            db.add(
                DetalleVenta(
                    id_venta=venta.id_venta,
                    id_producto=id_producto,
                    cantidad=cantidad,
                    precio_unitario=Decimal(str(precio)),
                )
            )
        db.commit()
        return venta.id_venta
    finally:
        db.close()


# Permisos
def test_listar_sin_login_da_401(client):
    assert client.get("/api/customers").status_code == 401


def test_cliente_no_puede_ver_clientes(client):
    token = registrar_y_loguear(client).json()["access_token"]
    resp = client.get("/api/customers", headers=auth_header(token))
    assert resp.status_code == 403


def test_empleado_puede_listar_y_crear(client, empleado):
    assert crear(client, empleado, **ANA).status_code == 201
    assert client.get("/api/customers", headers=auth_header(empleado)).status_code == 200


# Crear
def test_crear_cliente(client, admin):
    resp = crear(client, admin, **ANA)
    assert resp.status_code == 201
    body = resp.json()
    assert body["nombre"] == "Ana Mora"
    assert body["cedula"] == "1-1111-1111"
    assert body["id_cliente"] > 0


def test_crear_normaliza_correo_y_espacios(client, admin):
    resp = crear(client, admin, nombre="  Ana Mora  ", correo="ANA@Mail.COM", cedula="  ")
    assert resp.status_code == 201
    body = resp.json()
    assert body["nombre"] == "Ana Mora"
    assert body["correo"] == "ana@mail.com"
    assert body["cedula"] is None


def test_crear_cedula_duplicada_da_409(client, admin):
    crear(client, admin, **ANA)
    resp = crear(client, admin, nombre="Otra", cedula=ANA["cedula"])
    assert resp.status_code == 409


def test_crear_correo_duplicado_ignora_mayusculas(client, admin):
    crear(client, admin, **ANA)
    resp = crear(client, admin, nombre="Otra", correo="ANA@MAIL.COM")
    assert resp.status_code == 409


def test_crear_nombre_obligatorio(client, admin):
    assert crear(client, admin, cedula="9-9999-9999").status_code == 422


def test_crear_correo_invalido(client, admin):
    assert crear(client, admin, nombre="Ana", correo="no-es-correo").status_code == 422


# Buscar
def test_buscar_por_cedula_exacta(client, admin):
    crear(client, admin, **ANA)
    crear(client, admin, **LUIS)
    resp = client.get("/api/customers?cedula=2-2222-2222", headers=auth_header(admin))
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["nombre"] == "Luis Rojas"


def test_cedula_parcial_no_coincide(client, admin):
    crear(client, admin, **ANA)
    resp = client.get("/api/customers?cedula=1-1111", headers=auth_header(admin))
    assert resp.json()["total"] == 0


def test_buscar_libre_por_nombre_ignora_mayusculas(client, admin):
    crear(client, admin, **ANA)
    crear(client, admin, **LUIS)
    resp = client.get("/api/customers?q=ROJ", headers=auth_header(admin))
    assert [c["nombre"] for c in resp.json()["items"]] == ["Luis Rojas"]


def test_buscar_trata_porcentaje_como_texto(client, admin):
    crear(client, admin, **ANA)
    assert client.get("/api/customers?q=%25", headers=auth_header(admin)).json()["total"] == 0


def test_listar_pagina(client, admin):
    for i in range(5):
        crear(client, admin, nombre=f"Cliente {i}", cedula=f"c-{i}")
    resp = client.get("/api/customers?page_size=2&page=3", headers=auth_header(admin))
    body = resp.json()
    assert body["total"] == 5
    assert body["pages"] == 3
    assert len(body["items"]) == 1


# Obtener y actualizar
def test_obtener_cliente(client, admin):
    id_cliente = crear(client, admin, **ANA).json()["id_cliente"]
    resp = client.get(f"/api/customers/{id_cliente}", headers=auth_header(admin))
    assert resp.status_code == 200
    assert resp.json()["correo"] == "ana@mail.com"


def test_obtener_inexistente_da_404(client, admin):
    assert client.get("/api/customers/9999", headers=auth_header(admin)).status_code == 404


def test_actualizar_solo_lo_enviado(client, admin):
    id_cliente = crear(client, admin, **ANA).json()["id_cliente"]
    resp = client.put(
        f"/api/customers/{id_cliente}", json={"telefono": "7777-7777"}, headers=auth_header(admin)
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["telefono"] == "7777-7777"
    assert body["nombre"] == "Ana Mora"
    assert body["cedula"] == "1-1111-1111"


def test_actualizar_con_cedula_de_otro_da_409(client, admin):
    crear(client, admin, **ANA)
    id_luis = crear(client, admin, **LUIS).json()["id_cliente"]
    resp = client.put(
        f"/api/customers/{id_luis}", json={"cedula": ANA["cedula"]}, headers=auth_header(admin)
    )
    assert resp.status_code == 409


def test_actualizar_con_su_propia_cedula_no_es_duplicado(client, admin):
    id_cliente = crear(client, admin, **ANA).json()["id_cliente"]
    resp = client.put(
        f"/api/customers/{id_cliente}",
        json={"cedula": ANA["cedula"], "nombre": "Ana M."},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200


def test_actualizar_inexistente_da_404(client, admin):
    resp = client.put("/api/customers/9999", json={"nombre": "X Y"}, headers=auth_header(admin))
    assert resp.status_code == 404


# Eliminar
def test_admin_elimina_cliente_sin_registros(client, admin):
    id_cliente = crear(client, admin, **ANA).json()["id_cliente"]
    assert client.delete(f"/api/customers/{id_cliente}", headers=auth_header(admin)).status_code == 204
    assert client.get(f"/api/customers/{id_cliente}", headers=auth_header(admin)).status_code == 404


def test_empleado_no_puede_eliminar(client, admin, empleado):
    id_cliente = crear(client, admin, **ANA).json()["id_cliente"]
    resp = client.delete(f"/api/customers/{id_cliente}", headers=auth_header(empleado))
    assert resp.status_code == 403


def test_no_se_elimina_cliente_con_ventas(client, admin):
    id_cliente = crear(client, admin, **ANA).json()["id_cliente"]
    producto = crear_producto(client, admin)
    crear_venta(id_cliente, [(producto["id_producto"], 1, 1500)], datetime(2026, 10, 1), Decimal("1500"))
    resp = client.delete(f"/api/customers/{id_cliente}", headers=auth_header(admin))
    assert resp.status_code == 409


def test_eliminar_inexistente_da_404(client, admin):
    assert client.delete("/api/customers/9999", headers=auth_header(admin)).status_code == 404


# Vincular usuario cliente <-> tabla cliente
def test_usuario_cliente_queda_enlazado_a_su_registro(client, admin):
    reg = client.post(
        "/api/auth/register",
        json={"nombre": "Maria Solis", "correo": "maria@mail.com", "password": "password123"},
    )
    id_cliente = reg.json()["id_cliente"]
    assert id_cliente is not None
    resp = client.get("/api/customers?q=maria@mail.com", headers=auth_header(admin))
    assert [c["id_cliente"] for c in resp.json()["items"]] == [id_cliente]


def test_cliente_creado_en_mostrador_se_enlaza_al_registrarse(client, admin):
    id_cliente = crear(client, admin, nombre="Pedro Vega", correo="pedro@mail.com").json()["id_cliente"]
    reg = client.post(
        "/api/auth/register",
        json={"nombre": "Pedro Vega", "correo": "pedro@mail.com", "password": "password123"},
    )
    assert reg.json()["id_cliente"] == id_cliente


def test_no_se_elimina_cliente_con_cuenta_de_usuario(client, admin):
    reg = client.post(
        "/api/auth/register",
        json={"nombre": "Maria Solis", "correo": "maria@mail.com", "password": "password123"},
    )
    resp = client.delete(f"/api/customers/{reg.json()['id_cliente']}", headers=auth_header(admin))
    assert resp.status_code == 409


# Historial de compras
def test_historial_muestra_compras_con_productos(client, admin):
    id_cliente = crear(client, admin, **ANA).json()["id_cliente"]
    para = crear_producto(client, admin, nombre="Paracetamol 500mg", precio=1500)
    ibu = crear_producto(client, admin, nombre="Ibuprofeno 400mg", precio=1800)
    crear_venta(
        id_cliente,
        [(para["id_producto"], 2, 1500), (ibu["id_producto"], 1, 1800)],
        datetime(2026, 9, 1, 10, 0),
        Decimal("4800"),
    )
    resp = client.get(f"/api/customers/{id_cliente}/historial", headers=auth_header(admin))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    venta = body["items"][0]
    assert venta["total"] == 4800
    assert venta["sucursal_nombre"] == "Central"
    assert venta["metodo_pago"] == "efectivo"
    assert [(i["producto_nombre"], i["cantidad"], i["subtotal"]) for i in venta["items"]] == [
        ("Paracetamol 500mg", 2, 3000),
        ("Ibuprofeno 400mg", 1, 1800),
    ]


def test_historial_ordena_la_mas_reciente_primero(client, admin):
    id_cliente = crear(client, admin, **ANA).json()["id_cliente"]
    prod = crear_producto(client, admin)
    vieja = crear_venta(id_cliente, [(prod["id_producto"], 1, 1500)], datetime(2026, 1, 1), Decimal("1500"))
    nueva = crear_venta(id_cliente, [(prod["id_producto"], 1, 1500)], datetime(2026, 6, 1), Decimal("1500"))
    resp = client.get(f"/api/customers/{id_cliente}/historial", headers=auth_header(admin))
    assert [v["id_venta"] for v in resp.json()["items"]] == [nueva, vieja]


def test_historial_no_mezcla_clientes(client, admin):
    id_ana = crear(client, admin, **ANA).json()["id_cliente"]
    id_luis = crear(client, admin, **LUIS).json()["id_cliente"]
    prod = crear_producto(client, admin)
    crear_venta(id_ana, [(prod["id_producto"], 1, 1500)], datetime(2026, 5, 1), Decimal("1500"))
    resp = client.get(f"/api/customers/{id_luis}/historial", headers=auth_header(admin))
    assert resp.json()["total"] == 0
    assert resp.json()["items"] == []


def test_historial_se_encuentra_buscando_por_cedula(client, admin):
    """Criterio de aceptacion: el admin busca por cedula y ve el historial."""
    id_cliente = crear(client, admin, **ANA).json()["id_cliente"]
    prod = crear_producto(client, admin)
    crear_venta(id_cliente, [(prod["id_producto"], 1, 1500)], datetime(2026, 5, 1), Decimal("1500"))

    encontrado = client.get(
        f"/api/customers?cedula={ANA['cedula']}", headers=auth_header(admin)
    ).json()["items"][0]
    resp = client.get(
        f"/api/customers/{encontrado['id_cliente']}/historial", headers=auth_header(admin)
    )
    assert resp.json()["total"] == 1


def test_historial_pagina(client, admin):
    id_cliente = crear(client, admin, **ANA).json()["id_cliente"]
    prod = crear_producto(client, admin)
    for mes in range(1, 4):
        crear_venta(id_cliente, [(prod["id_producto"], 1, 1500)], datetime(2026, mes, 1), Decimal("1500"))
    resp = client.get(
        f"/api/customers/{id_cliente}/historial?page_size=2", headers=auth_header(admin)
    )
    body = resp.json()
    assert body["total"] == 3
    assert body["pages"] == 2
    assert len(body["items"]) == 2


def test_historial_de_cliente_inexistente_da_404(client, admin):
    assert client.get("/api/customers/9999/historial", headers=auth_header(admin)).status_code == 404


def test_historial_requiere_personal(client):
    token = registrar_y_loguear(client).json()["access_token"]
    resp = client.get("/api/customers/1/historial", headers=auth_header(token))
    assert resp.status_code == 403
