import pytest

# `client` es una fixture definida en test_auth.py
from app.test.test_auth import (  # noqa: F401
    auth_header,
    client,
    registrar_y_loguear,
    token_admin,
)


@pytest.fixture()
def admin(client):
    return token_admin(client)


@pytest.fixture()
def sucursales(client, admin):
    h = auth_header(admin)
    client.post("/api/branches", json={"nombre": "Sucursal Central", "direccion": "San José"}, headers=h)
    cerrada = client.post("/api/branches", json={"nombre": "Sucursal Cerrada"}, headers=h).json()
    client.put(f"/api/branches/{cerrada['id_sucursal']}", json={"activo": False}, headers=h)


# Opciones de retiro para el cliente
def test_cliente_ve_solo_las_sucursales_activas(client, sucursales):
    token = registrar_y_loguear(client).json()["access_token"]
    resp = client.get("/api/branches/options", headers=auth_header(token))
    assert resp.status_code == 200
    assert [b["nombre"] for b in resp.json()] == ["Sucursal Central"]


def test_opciones_no_exponen_datos_internos(client, sucursales):
    token = registrar_y_loguear(client).json()["access_token"]
    opcion = client.get("/api/branches/options", headers=auth_header(token)).json()[0]
    assert set(opcion) == {"id_sucursal", "nombre", "direccion", "telefono"}


def test_opciones_sin_token_devuelve_401(client, sucursales):
    assert client.get("/api/branches/options").status_code == 401


def test_listado_completo_sigue_siendo_solo_staff(client, sucursales):
    token = registrar_y_loguear(client).json()["access_token"]
    assert client.get("/api/branches", headers=auth_header(token)).status_code == 403