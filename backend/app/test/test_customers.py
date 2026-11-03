import pytest

# `client` es una fixture definida en test_auth.py
from app.services import auth_service
from app.test.test_auth import (  # noqa: F401
    TestingSessionLocal,
    auth_header,
    client,
    registrar_y_loguear,
    token_admin,
)

ANA = {"nombre": "Ana Mora", "cedula": "1-0001-0001", "telefono": "8888-0001", "correo": "ana@mail.com"}
LUIS = {"nombre": "Luis Rojas", "cedula": "2-0002-0002", "correo": "luis@mail.com"}
MARIA = {"nombre": "María Solano", "cedula": "3-0003-0003"}


@pytest.fixture()
def admin(client):
    return token_admin(client)


@pytest.fixture()
def empleado(client):
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


@pytest.fixture()
def clientes(client, admin):
    return [crear(client, admin, **c).json() for c in (ANA, LUIS, MARIA)]


def nombres(resp):
    return [c["nombre"] for c in resp.json()["items"]]


# Crear
def test_empleado_registra_cliente(client, empleado):
    resp = crear(client, empleado, **ANA)
    assert resp.status_code == 201
    body = resp.json()
    assert body["nombre"] == "Ana Mora"
    assert body["cedula"] == "1-0001-0001"
    assert body["id_cliente"] is not None


def test_crear_solo_con_nombre(client, admin):
    assert crear(client, admin, nombre="Cliente Mostrador").status_code == 201


def test_crear_recorta_espacios_y_vacio_es_null(client, admin):
    resp = crear(client, admin, nombre="  Ana Mora  ", cedula="   ", telefono=" 8888 ")
    assert resp.status_code == 201
    assert resp.json()["nombre"] == "Ana Mora"
    assert resp.json()["cedula"] is None
    assert resp.json()["telefono"] == "8888"


def test_crear_con_cedula_repetida_devuelve_409(client, admin, clientes):
    resp = crear(client, admin, nombre="Otra Persona", cedula=ANA["cedula"])
    assert resp.status_code == 409
    assert "cédula" in resp.json()["message"]


def test_crear_con_correo_repetido_ignora_mayusculas_y_devuelve_409(client, admin, clientes):
    resp = crear(client, admin, nombre="Otra Persona", correo="ANA@mail.com")
    assert resp.status_code == 409


def test_crear_con_correo_invalido_devuelve_422(client, admin):
    assert crear(client, admin, nombre="Ana Mora", correo="no-es-correo").status_code == 422


def test_crear_sin_nombre_devuelve_422(client, admin):
    assert crear(client, admin, cedula="1-1").status_code == 422


def test_crear_sin_token_devuelve_401(client):
    assert client.post("/api/customers", json=ANA).status_code == 401


def test_crear_como_cliente_devuelve_403(client):
    token = registrar_y_loguear(client).json()["access_token"]
    assert crear(client, token, **ANA).status_code == 403


# Listar y buscar
def test_listar_clientes_ordenados_por_nombre(client, admin, clientes):
    resp = client.get("/api/customers", headers=auth_header(admin))
    assert resp.status_code == 200
    assert resp.json()["total"] == 3
    assert nombres(resp) == ["Ana Mora", "Luis Rojas", "María Solano"]


def test_buscar_por_nombre_cedula_o_correo(client, admin, clientes):
    h = auth_header(admin)
    assert nombres(client.get("/api/customers?q=LUIS", headers=h)) == ["Luis Rojas"]
    assert nombres(client.get("/api/customers?q=3-0003", headers=h)) == ["María Solano"]
    assert nombres(client.get("/api/customers?q=ana@", headers=h)) == ["Ana Mora"]


def test_buscar_trata_porcentaje_como_texto(client, admin, clientes):
    assert client.get("/api/customers?q=%25", headers=auth_header(admin)).json()["total"] == 0


def test_buscar_por_cedula_exacta(client, admin, clientes):
    h = auth_header(admin)
    assert nombres(client.get("/api/customers?cedula=2-0002-0002", headers=h)) == ["Luis Rojas"]
    assert client.get("/api/customers?cedula=2-0002", headers=h).json()["total"] == 0


def test_listar_clientes_pagina(client, admin, clientes):
    body = client.get("/api/customers?page_size=2", headers=auth_header(admin)).json()
    assert (len(body["items"]), body["total"], body["pages"]) == (2, 3, 2)


def test_listar_sin_token_devuelve_401(client):
    assert client.get("/api/customers").status_code == 401


def test_listar_como_cliente_devuelve_403(client):
    token = registrar_y_loguear(client).json()["access_token"]
    assert client.get("/api/customers", headers=auth_header(token)).status_code == 403


# Detalle
def test_detalle_de_cliente(client, empleado, clientes):
    resp = client.get(f"/api/customers/{clientes[0]['id_cliente']}", headers=auth_header(empleado))
    assert resp.status_code == 200
    assert resp.json()["nombre"] == "Ana Mora"


def test_detalle_inexistente_devuelve_404(client, admin):
    resp = client.get("/api/customers/999", headers=auth_header(admin))
    assert resp.status_code == 404
    assert resp.json()["success"] is False


# Editar
def test_editar_cliente_parcialmente(client, empleado, clientes):
    id_cliente = clientes[0]["id_cliente"]
    resp = client.put(
        f"/api/customers/{id_cliente}", json={"telefono": "7777-7777"}, headers=auth_header(empleado)
    )
    assert resp.status_code == 200
    assert resp.json()["telefono"] == "7777-7777"
    assert resp.json()["nombre"] == "Ana Mora"


def test_editar_puede_limpiar_campos_opcionales(client, admin, clientes):
    id_cliente = clientes[0]["id_cliente"]
    resp = client.put(
        f"/api/customers/{id_cliente}", json={"telefono": None, "direccion": ""}, headers=auth_header(admin)
    )
    assert resp.status_code == 200
    assert resp.json()["telefono"] is None


def test_editar_no_borra_el_nombre_con_null(client, admin, clientes):
    id_cliente = clientes[0]["id_cliente"]
    resp = client.put(f"/api/customers/{id_cliente}", json={"nombre": None}, headers=auth_header(admin))
    assert resp.json()["nombre"] == "Ana Mora"


def test_editar_con_cedula_de_otro_devuelve_409(client, admin, clientes):
    id_cliente = clientes[0]["id_cliente"]
    resp = client.put(
        f"/api/customers/{id_cliente}", json={"cedula": LUIS["cedula"]}, headers=auth_header(admin)
    )
    assert resp.status_code == 409


def test_editar_conservando_su_propia_cedula_es_valido(client, admin, clientes):
    id_cliente = clientes[0]["id_cliente"]
    resp = client.put(
        f"/api/customers/{id_cliente}",
        json={"cedula": ANA["cedula"], "nombre": "Ana María Mora"},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200


def test_editar_correo_de_cliente_con_cuenta_devuelve_409(client, admin):
    registrar_y_loguear(client)  # crea cliente con usuario
    id_cliente = client.get("/api/customers?q=cliente@mail.com", headers=auth_header(admin)).json()["items"][0]["id_cliente"]
    resp = client.put(
        f"/api/customers/{id_cliente}", json={"correo": "nuevo@mail.com"}, headers=auth_header(admin)
    )
    assert resp.status_code == 409
    # lo demás sí se puede editar
    resp = client.put(f"/api/customers/{id_cliente}", json={"telefono": "8000"}, headers=auth_header(admin))
    assert resp.status_code == 200


def test_editar_inexistente_devuelve_404(client, admin):
    assert client.put("/api/customers/999", json={"telefono": "1"}, headers=auth_header(admin)).status_code == 404


def test_editar_como_cliente_devuelve_403(client, clientes):
    token = registrar_y_loguear(client).json()["access_token"]
    resp = client.put(f"/api/customers/{clientes[0]['id_cliente']}", json={"telefono": "1"}, headers=auth_header(token))
    assert resp.status_code == 403


def test_editar_sin_token_devuelve_401(client, clientes):
    assert client.put(f"/api/customers/{clientes[0]['id_cliente']}", json={"telefono": "1"}).status_code == 401


# Perfil propio
def test_mi_perfil(client):
    token = registrar_y_loguear(client).json()["access_token"]
    resp = client.get("/api/customers/me", headers=auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["correo"] == "cliente@mail.com"
    assert "id_cliente" in resp.json()


def test_mi_perfil_como_admin_devuelve_403(client, admin):
    assert client.get("/api/customers/me", headers=auth_header(admin)).status_code == 403


def test_mi_perfil_sin_token_devuelve_401(client):
    assert client.get("/api/customers/me").status_code == 401