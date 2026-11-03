from datetime import date, timedelta

import pytest

from app.models.customer_model import Cliente
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

HOY = date.today()


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


@pytest.fixture()
def datos(client, admin):
    """Un cliente con cédula, un producto con receta y otro sin receta."""
    h = auth_header(admin)
    con = client.post(
        "/api/products",
        json={"nombre": "Amoxicilina 500mg", "categoria": "Antibioticos", "precio": 3500, "costo": 1900, "requiere_receta": True},
        headers=h,
    ).json()
    sin = client.post(
        "/api/products",
        json={"nombre": "Paracetamol 500mg", "categoria": "Analgesicos", "precio": 1500, "costo": 800},
        headers=h,
    ).json()
    token_cliente = registrar_y_loguear(client).json()["access_token"]
    db = TestingSessionLocal()
    cli = db.query(Cliente).filter_by(correo="cliente@mail.com").one()
    cli.cedula = "1-1111-1111"
    db.commit()
    id_cliente = cli.id_cliente
    db.close()
    return {
        "id_cliente": id_cliente,
        "con_receta": con["id_producto"],
        "sin_receta": sin["id_producto"],
        "token_cliente": token_cliente,
    }


def crear(client, token, datos, **extra):
    body = {"id_cliente": datos["id_cliente"], "id_producto": datos["con_receta"], **extra}
    return client.post("/api/recipes", json=body, headers=auth_header(token))


def forzar_estado(id_receta, estado):
    db = TestingSessionLocal()
    db.get(Receta, id_receta).estado = estado
    db.commit()
    db.close()


# Crear
def test_empleado_crea_receta_vigente(client, empleado, datos):
    resp = crear(client, empleado, datos, medico="Dr. Pérez", cantidad=2, vigencia_hasta=(HOY + timedelta(days=30)).isoformat())
    assert resp.status_code == 201
    body = resp.json()
    assert body["estado"] == "vigente"
    assert body["cantidad"] == 2
    assert body["fecha"] == HOY.isoformat()
    assert body["cliente_nombre"] == "Cliente Prueba"
    assert body["cliente_cedula"] == "1-1111-1111"
    assert body["producto_nombre"] == "Amoxicilina 500mg"
    assert body["id_venta"] is None


def test_crear_receta_con_cantidad_por_defecto_1(client, admin, datos):
    assert crear(client, admin, datos).json()["cantidad"] == 1


def test_crear_con_producto_sin_receta_devuelve_400(client, admin, datos):
    resp = crear(client, admin, datos, id_producto=datos["sin_receta"])
    assert resp.status_code == 400
    assert "no requiere receta" in resp.json()["message"]


def test_crear_con_producto_inexistente_devuelve_400(client, admin, datos):
    assert crear(client, admin, datos, id_producto=9999).status_code == 400


def test_crear_con_producto_deshabilitado_devuelve_400(client, admin, datos):
    client.delete(f"/api/products/{datos['con_receta']}", headers=auth_header(admin))
    assert crear(client, admin, datos).status_code == 400


def test_crear_con_cliente_inexistente_devuelve_400(client, admin, datos):
    assert crear(client, admin, datos, id_cliente=9999).status_code == 400


def test_crear_con_vigencia_anterior_a_la_fecha_devuelve_400(client, admin, datos):
    resp = crear(client, admin, datos, vigencia_hasta=(HOY - timedelta(days=1)).isoformat())
    assert resp.status_code == 400


def test_crear_con_cantidad_cero_devuelve_422(client, admin, datos):
    assert crear(client, admin, datos, cantidad=0).status_code == 422


def test_crear_con_archivo_invalido_devuelve_422(client, admin, datos):
    assert crear(client, admin, datos, archivo_url="C:/receta.pdf").status_code == 422


def test_crear_con_archivo_valido(client, admin, datos):
    resp = crear(client, admin, datos, archivo_url="/static/recetas/r1.pdf")
    assert resp.status_code == 201
    assert resp.json()["archivo_url"] == "/static/recetas/r1.pdf"


def test_crear_sin_token_devuelve_401(client, datos):
    assert client.post("/api/recipes", json={"id_cliente": 1, "id_producto": 1}).status_code == 401


def test_crear_como_cliente_devuelve_403(client, datos):
    assert crear(client, datos["token_cliente"], datos).status_code == 403


# Listar y filtrar
@pytest.fixture()
def recetas(client, admin, datos):
    vigente = crear(client, admin, datos, vigencia_hasta=(HOY + timedelta(days=30)).isoformat()).json()
    vencida = crear(
        client,
        admin,
        datos,
        fecha=(HOY - timedelta(days=20)).isoformat(),
        vigencia_hasta=(HOY - timedelta(days=5)).isoformat(),
    ).json()
    usada = crear(client, admin, datos).json()
    forzar_estado(usada["id_receta"], "usada")
    return {"vigente": vigente, "vencida": vencida, "usada": usada}


def ids(resp):
    return {r["id_receta"] for r in resp.json()["items"]}


def test_receta_vencida_por_fecha_se_muestra_vencida(client, admin, recetas):
    resp = client.get(f"/api/recipes/{recetas['vencida']['id_receta']}", headers=auth_header(admin))
    assert resp.json()["estado"] == "vencida"


def test_listar_recetas(client, empleado, recetas):
    resp = client.get("/api/recipes", headers=auth_header(empleado))
    assert resp.status_code == 200
    assert resp.json()["total"] == 3


def test_filtrar_por_estado(client, admin, recetas):
    h = auth_header(admin)
    assert ids(client.get("/api/recipes?estado=vigente", headers=h)) == {recetas["vigente"]["id_receta"]}
    assert ids(client.get("/api/recipes?estado=vencida", headers=h)) == {recetas["vencida"]["id_receta"]}
    assert ids(client.get("/api/recipes?estado=usada", headers=h)) == {recetas["usada"]["id_receta"]}


def test_filtrar_por_cliente_cedula_y_producto(client, admin, datos, recetas):
    h = auth_header(admin)
    assert client.get(f"/api/recipes?id_cliente={datos['id_cliente']}", headers=h).json()["total"] == 3
    assert client.get("/api/recipes?cedula=1-1111-1111", headers=h).json()["total"] == 3
    assert client.get("/api/recipes?cedula=9-9999", headers=h).json()["total"] == 0
    assert client.get(f"/api/recipes?id_producto={datos['con_receta']}", headers=h).json()["total"] == 3
    assert client.get(f"/api/recipes?id_producto={datos['sin_receta']}", headers=h).json()["total"] == 0


def test_consulta_del_pos_cedula_producto_vigente(client, empleado, datos, recetas):
    resp = client.get(
        f"/api/recipes?cedula=1-1111-1111&id_producto={datos['con_receta']}&estado=vigente",
        headers=auth_header(empleado),
    )
    assert ids(resp) == {recetas["vigente"]["id_receta"]}


def test_listar_recetas_pagina(client, admin, recetas):
    body = client.get("/api/recipes?page_size=2", headers=auth_header(admin)).json()
    assert (len(body["items"]), body["total"], body["pages"]) == (2, 3, 2)


def test_filtro_de_estado_invalido_devuelve_422(client, admin):
    assert client.get("/api/recipes?estado=otro", headers=auth_header(admin)).status_code == 422


def test_listar_sin_token_devuelve_401(client):
    assert client.get("/api/recipes").status_code == 401


def test_listar_como_cliente_devuelve_403(client, datos):
    assert client.get("/api/recipes", headers=auth_header(datos["token_cliente"])).status_code == 403


# Detalle
def test_detalle_inexistente_devuelve_404(client, admin):
    resp = client.get("/api/recipes/999", headers=auth_header(admin))
    assert resp.status_code == 404
    assert resp.json()["success"] is False


# Editar
def test_editar_receta(client, empleado, datos):
    id_receta = crear(client, empleado, datos, medico="Dr. Pérez").json()["id_receta"]
    resp = client.put(
        f"/api/recipes/{id_receta}",
        json={"cantidad": 3, "medico": "Dra. Soto"},
        headers=auth_header(empleado),
    )
    assert resp.status_code == 200
    assert resp.json()["cantidad"] == 3
    assert resp.json()["medico"] == "Dra. Soto"


def test_editar_puede_limpiar_campos_opcionales(client, admin, datos):
    id_receta = crear(client, admin, datos, medico="Dr. Pérez").json()["id_receta"]
    resp = client.put(f"/api/recipes/{id_receta}", json={"medico": None}, headers=auth_header(admin))
    assert resp.json()["medico"] is None


def test_editar_no_borra_cantidad_con_null(client, admin, datos):
    id_receta = crear(client, admin, datos, cantidad=4).json()["id_receta"]
    resp = client.put(f"/api/recipes/{id_receta}", json={"cantidad": None}, headers=auth_header(admin))
    assert resp.json()["cantidad"] == 4


def test_marcar_receta_como_vencida(client, admin, datos):
    id_receta = crear(client, admin, datos).json()["id_receta"]
    resp = client.put(f"/api/recipes/{id_receta}", json={"estado": "vencida"}, headers=auth_header(admin))
    assert resp.json()["estado"] == "vencida"


def test_renovar_vigencia_de_receta_vencida_por_fecha(client, admin, recetas):
    id_receta = recetas["vencida"]["id_receta"]
    nueva = (HOY + timedelta(days=15)).isoformat()
    resp = client.put(f"/api/recipes/{id_receta}", json={"vigencia_hasta": nueva}, headers=auth_header(admin))
    assert resp.status_code == 200
    assert resp.json()["estado"] == "vigente"


def test_no_se_puede_poner_estado_usada_a_mano(client, admin, datos):
    id_receta = crear(client, admin, datos).json()["id_receta"]
    resp = client.put(f"/api/recipes/{id_receta}", json={"estado": "usada"}, headers=auth_header(admin))
    assert resp.status_code == 422


def test_editar_receta_usada_devuelve_409(client, admin, recetas):
    resp = client.put(
        f"/api/recipes/{recetas['usada']['id_receta']}", json={"cantidad": 9}, headers=auth_header(admin)
    )
    assert resp.status_code == 409


def test_editar_con_vigencia_anterior_a_la_fecha_devuelve_400(client, admin, datos):
    id_receta = crear(client, admin, datos).json()["id_receta"]
    resp = client.put(
        f"/api/recipes/{id_receta}",
        json={"vigencia_hasta": (HOY - timedelta(days=3)).isoformat()},
        headers=auth_header(admin),
    )
    assert resp.status_code == 400


def test_editar_inexistente_devuelve_404(client, admin):
    assert client.put("/api/recipes/999", json={"cantidad": 2}, headers=auth_header(admin)).status_code == 404


def test_editar_como_cliente_devuelve_403(client, admin, datos):
    id_receta = crear(client, admin, datos).json()["id_receta"]
    resp = client.put(f"/api/recipes/{id_receta}", json={"cantidad": 2}, headers=auth_header(datos["token_cliente"]))
    assert resp.status_code == 403


def test_editar_sin_token_devuelve_401(client):
    assert client.put("/api/recipes/1", json={"cantidad": 2}).status_code == 401