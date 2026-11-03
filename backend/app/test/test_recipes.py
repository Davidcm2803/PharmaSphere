from datetime import date, timedelta
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
from app.models.product_model import Producto  # noqa: E402
from app.models.recipe_model import Receta  # noqa: E402
from app.models.sale_model import Venta  # noqa: E402
from app.services import auth_service, recipe_service  # noqa: E402
from app.services.recipe_service import RecetaInvalidaError  # noqa: E402

HOY = date.today()
AYER = HOY - timedelta(days=1)
EN_UN_MES = HOY + timedelta(days=30)


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


@pytest.fixture()
def token_cliente(client):
    """Token de un usuario con rol cliente (para probar permisos)."""
    return registrar_y_loguear(client).json()["access_token"]


@pytest.fixture()
def datos(client, admin):
    """Un cliente, un producto con receta y uno sin receta."""
    cliente = client.post(
        "/api/customers",
        json={"nombre": "Ana Mora", "cedula": "1-1111-1111"},
        headers=auth_header(admin),
    ).json()
    con_receta = client.post(
        "/api/products",
        json={"nombre": "Amoxicilina 500mg", "precio": 3500, "requiere_receta": True},
        headers=auth_header(admin),
    ).json()
    libre = client.post(
        "/api/products",
        json={"nombre": "Paracetamol 500mg", "precio": 1500},
        headers=auth_header(admin),
    ).json()
    return {
        "id_cliente": cliente["id_cliente"],
        "con_receta": con_receta["id_producto"],
        "libre": libre["id_producto"],
    }


def crear_receta(client, token, **body):
    return client.post("/api/recipes", json=body, headers=auth_header(token))


def receta_valida(datos, **extra):
    return {
        "id_cliente": datos["id_cliente"],
        "id_producto": datos["con_receta"],
        "cantidad": 2,
        "medico": "Dr. Salas",
        "vigencia_hasta": EN_UN_MES.isoformat(),
        **extra,
    }


def crear(client, token, datos, **extra):
    """Crea una receta del cliente y producto de `datos`; `extra` pisa los campos."""
    body = {"id_cliente": datos["id_cliente"], "id_producto": datos["con_receta"], **extra}
    return crear_receta(client, token, **body)


def forzar_estado(id_receta, estado):
    db = TestingSessionLocal()
    db.get(Receta, id_receta).estado = estado
    db.commit()
    db.close()


def insertar_receta(datos, **cols) -> int:
    """Inserta una receta directo en la BD (para fechas pasadas o estados especiales)."""
    db = TestingSessionLocal()
    try:
        receta = Receta(
            id_cliente=datos["id_cliente"],
            id_producto=datos["con_receta"],
            cantidad=cols.pop("cantidad", 1),
            fecha=cols.pop("fecha", HOY - timedelta(days=60)),
            **cols,
        )
        db.add(receta)
        db.commit()
        return receta.id_receta
    finally:
        db.close()


def ids(resp):
    return {r["id_receta"] for r in resp.json()["items"]}


# Crear
def test_empleado_crea_receta_vigente(client, empleado, datos):
    resp = crear(
        client, empleado, datos, medico="Dr. Pérez", cantidad=2,
        vigencia_hasta=EN_UN_MES.isoformat(),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["estado"] == "vigente"
    assert body["cantidad"] == 2
    assert body["fecha"] == HOY.isoformat()
    assert body["cliente_nombre"] == "Ana Mora"
    assert body["cliente_cedula"] == "1-1111-1111"
    assert body["producto_nombre"] == "Amoxicilina 500mg"
    assert body["id_venta"] is None


def test_crear_receta_con_todos_los_campos(client, admin, datos):
    resp = crear_receta(client, admin, **receta_valida(datos))
    assert resp.status_code == 201
    body = resp.json()
    assert body["medico"] == "Dr. Salas"
    assert body["vigencia_hasta"] == EN_UN_MES.isoformat()


def test_crear_receta_con_cantidad_por_defecto_1(client, admin, datos):
    assert crear(client, admin, datos).json()["cantidad"] == 1


def test_crear_con_producto_sin_receta_devuelve_400(client, admin, datos):
    resp = crear(client, admin, datos, id_producto=datos["libre"])
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
    resp = crear(client, admin, datos, vigencia_hasta=AYER.isoformat())
    assert resp.status_code == 400


def test_crear_con_fecha_explicita_y_vigencia_anterior_devuelve_400(client, admin, datos):
    resp = crear(client, admin, datos, fecha=HOY.isoformat(), vigencia_hasta=AYER.isoformat())
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


def test_crear_como_cliente_devuelve_403(client, datos, token_cliente):
    assert crear(client, token_cliente, datos).status_code == 403


# Listar y filtrar
@pytest.fixture()
def recetas(client, admin, datos):
    vigente = crear(client, admin, datos, vigencia_hasta=EN_UN_MES.isoformat()).json()
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


def test_receta_vencida_por_fecha_se_muestra_vencida(client, admin, recetas):
    resp = client.get(f"/api/recipes/{recetas['vencida']['id_receta']}", headers=auth_header(admin))
    assert resp.json()["estado"] == "vencida"


def test_receta_pasada_de_fecha_insertada_en_bd_se_muestra_vencida(client, admin, datos):
    id_receta = insertar_receta(datos, vigencia_hasta=AYER, estado="vigente")
    resp = client.get(f"/api/recipes/{id_receta}", headers=auth_header(admin))
    assert resp.json()["estado"] == "vencida"


def test_listar_recetas(client, empleado, recetas):
    resp = client.get("/api/recipes", headers=auth_header(empleado))
    assert resp.status_code == 200
    assert resp.json()["total"] == 3


def test_filtrar_por_estado_con_recetas_creadas_por_api(client, admin, recetas):
    h = auth_header(admin)
    assert ids(client.get("/api/recipes?estado=vigente", headers=h)) == {recetas["vigente"]["id_receta"]}
    assert ids(client.get("/api/recipes?estado=vencida", headers=h)) == {recetas["vencida"]["id_receta"]}
    assert ids(client.get("/api/recipes?estado=usada", headers=h)) == {recetas["usada"]["id_receta"]}


def test_filtrar_por_estado(client, admin, datos):
    vigente = insertar_receta(datos, vigencia_hasta=EN_UN_MES, estado="vigente")
    vencida = insertar_receta(datos, vigencia_hasta=AYER, estado="vigente")
    usada = insertar_receta(datos, vigencia_hasta=EN_UN_MES, estado="usada")

    def ids_por_estado(estado):
        resp = client.get(f"/api/recipes?estado={estado}", headers=auth_header(admin))
        return [r["id_receta"] for r in resp.json()["items"]]

    assert ids_por_estado("vigente") == [vigente]
    assert ids_por_estado("vencida") == [vencida]
    assert ids_por_estado("usada") == [usada]


def test_solo_vigentes_excluye_vencidas_y_usadas(client, admin, datos):
    vigente = insertar_receta(datos, vigencia_hasta=None, estado="vigente")
    insertar_receta(datos, vigencia_hasta=AYER, estado="vigente")
    insertar_receta(datos, vigencia_hasta=EN_UN_MES, estado="usada")
    resp = client.get("/api/recipes?solo_vigentes=true", headers=auth_header(admin))
    assert [r["id_receta"] for r in resp.json()["items"]] == [vigente]


def test_filtrar_por_cliente_cedula_y_producto(client, admin, datos, recetas):
    h = auth_header(admin)
    assert client.get(f"/api/recipes?id_cliente={datos['id_cliente']}", headers=h).json()["total"] == 3
    assert client.get("/api/recipes?cedula=1-1111-1111", headers=h).json()["total"] == 3
    assert client.get("/api/recipes?cedula=9-9999", headers=h).json()["total"] == 0
    assert client.get(f"/api/recipes?id_producto={datos['con_receta']}", headers=h).json()["total"] == 3
    assert client.get(f"/api/recipes?id_producto={datos['libre']}", headers=h).json()["total"] == 0


def test_filtrar_por_cliente_no_mezcla_clientes(client, admin, datos):
    otro = client.post(
        "/api/customers", json={"nombre": "Luis Rojas"}, headers=auth_header(admin)
    ).json()["id_cliente"]
    propia = insertar_receta(datos, vigencia_hasta=EN_UN_MES)
    crear_receta(client, admin, **receta_valida({**datos, "id_cliente": otro}))
    resp = client.get(f"/api/recipes?id_cliente={datos['id_cliente']}", headers=auth_header(admin))
    assert [r["id_receta"] for r in resp.json()["items"]] == [propia]


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


def test_listar_como_cliente_devuelve_403(client, datos, token_cliente):
    assert client.get("/api/recipes", headers=auth_header(token_cliente)).status_code == 403


# Detalle
def test_obtener_receta(client, admin, datos):
    id_receta = crear_receta(client, admin, **receta_valida(datos)).json()["id_receta"]
    resp = client.get(f"/api/recipes/{id_receta}", headers=auth_header(admin))
    assert resp.status_code == 200
    assert resp.json()["medico"] == "Dr. Salas"


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


def test_editar_como_cliente_devuelve_403(client, admin, datos, token_cliente):
    id_receta = crear(client, admin, datos).json()["id_receta"]
    resp = client.put(f"/api/recipes/{id_receta}", json={"cantidad": 2}, headers=auth_header(token_cliente))
    assert resp.status_code == 403


def test_editar_sin_token_devuelve_401(client):
    assert client.put("/api/recipes/1", json={"cantidad": 2}).status_code == 401


# Eliminar
def test_admin_elimina_receta(client, admin, datos):
    id_receta = crear_receta(client, admin, **receta_valida(datos)).json()["id_receta"]
    assert client.delete(f"/api/recipes/{id_receta}", headers=auth_header(admin)).status_code == 204
    assert client.get(f"/api/recipes/{id_receta}", headers=auth_header(admin)).status_code == 404


def test_empleado_no_puede_eliminar_receta(client, admin, empleado, datos):
    id_receta = crear_receta(client, admin, **receta_valida(datos)).json()["id_receta"]
    assert client.delete(f"/api/recipes/{id_receta}", headers=auth_header(empleado)).status_code == 403


def test_no_se_elimina_receta_usada(client, admin, recetas):
    resp = client.delete(f"/api/recipes/{recetas['usada']['id_receta']}", headers=auth_header(admin))
    assert resp.status_code == 409


def test_eliminar_inexistente_da_404(client, admin):
    assert client.delete("/api/recipes/9999", headers=auth_header(admin)).status_code == 404


# Validación de receta al vender (funciones que usa el servicio de ventas)
def validar(datos, *, id_cliente="__cliente__", id_producto=None, cantidad=1, hoy: Optional[date] = None):
    db = TestingSessionLocal()
    try:
        return recipe_service.validar_receta_vigente(
            db,
            datos["id_cliente"] if id_cliente == "__cliente__" else id_cliente,
            id_producto or datos["con_receta"],
            cantidad,
            hoy=hoy,
        )
    finally:
        db.close()


def test_venta_sin_receta_es_rechazada(client, datos):
    with pytest.raises(RecetaInvalidaError):
        validar(datos)


def test_venta_sin_cliente_es_rechazada(client, datos):
    with pytest.raises(RecetaInvalidaError):
        validar(datos, id_cliente=None)


def test_venta_con_receta_vigente_es_aceptada(client, datos):
    id_receta = insertar_receta(datos, cantidad=2, vigencia_hasta=EN_UN_MES)
    assert validar(datos, cantidad=2).id_receta == id_receta


def test_venta_con_receta_sin_fecha_limite_es_aceptada(client, datos):
    id_receta = insertar_receta(datos, cantidad=1, vigencia_hasta=None)
    assert validar(datos).id_receta == id_receta


def test_venta_con_receta_vigente_hasta_hoy_es_aceptada(client, datos):
    insertar_receta(datos, vigencia_hasta=HOY)
    assert validar(datos) is not None


def test_venta_con_receta_vencida_es_rechazada(client, datos):
    insertar_receta(datos, vigencia_hasta=AYER)
    with pytest.raises(RecetaInvalidaError):
        validar(datos)


def test_venta_con_receta_ya_usada_es_rechazada(client, datos):
    insertar_receta(datos, vigencia_hasta=EN_UN_MES, estado="usada")
    with pytest.raises(RecetaInvalidaError):
        validar(datos)


def test_venta_con_receta_de_otro_cliente_es_rechazada(client, admin, datos):
    otro = client.post(
        "/api/customers", json={"nombre": "Luis Rojas"}, headers=auth_header(admin)
    ).json()["id_cliente"]
    insertar_receta(datos, vigencia_hasta=EN_UN_MES)
    with pytest.raises(RecetaInvalidaError):
        validar(datos, id_cliente=otro)


def test_venta_con_receta_de_otro_producto_es_rechazada(client, datos):
    insertar_receta(datos, vigencia_hasta=EN_UN_MES)
    # La receta es de la amoxicilina; se intenta comprar otro producto que también pide receta
    db = TestingSessionLocal()
    otro = Producto(nombre="Diazepam 5mg", precio=2000, requiere_receta=True)
    db.add(otro)
    db.commit()
    id_otro = otro.id_producto
    db.close()
    with pytest.raises(RecetaInvalidaError):
        validar(datos, id_producto=id_otro)


def test_venta_con_mas_cantidad_que_la_receta_es_rechazada(client, datos):
    insertar_receta(datos, cantidad=2, vigencia_hasta=EN_UN_MES)
    with pytest.raises(RecetaInvalidaError):
        validar(datos, cantidad=3)


def test_se_usa_la_receta_que_vence_primero(client, datos):
    lejana = insertar_receta(datos, vigencia_hasta=HOY + timedelta(days=90))
    cercana = insertar_receta(datos, vigencia_hasta=HOY + timedelta(days=5))
    assert validar(datos).id_receta == cercana
    assert lejana != cercana


def test_producto_sin_receta_no_exige_nada(client, datos):
    db = TestingSessionLocal()
    try:
        libre = db.get(Producto, datos["libre"])
        assert recipe_service.validar_receta_para_item(db, None, libre, 5) is None
    finally:
        db.close()


def test_producto_con_receta_sin_receta_registrada_menciona_el_producto(client, datos):
    db = TestingSessionLocal()
    try:
        producto = db.get(Producto, datos["con_receta"])
        with pytest.raises(RecetaInvalidaError, match="Amoxicilina"):
            recipe_service.validar_receta_para_item(db, datos["id_cliente"], producto, 1)
    finally:
        db.close()


def test_marcar_receta_usada_la_bloquea_para_otra_venta(client, admin, datos):
    id_receta = insertar_receta(datos, cantidad=1, vigencia_hasta=EN_UN_MES)

    db = TestingSessionLocal()
    try:
        sucursal = Sucursal(nombre="Central")
        db.add(sucursal)
        db.flush()
        venta = Venta(id_sucursal=sucursal.id_sucursal, id_cliente=datos["id_cliente"], total=3500)
        db.add(venta)
        db.flush()
        receta = recipe_service.validar_receta_vigente(db, datos["id_cliente"], datos["con_receta"], 1)
        recipe_service.marcar_receta_usada(db, receta, venta.id_venta)
        db.commit()
        id_venta = venta.id_venta
    finally:
        db.close()

    # La misma receta no sirve para una segunda compra
    with pytest.raises(RecetaInvalidaError):
        validar(datos)

    # Y queda ligada a la venta, sin poder modificarse ni eliminarse
    body = client.get(f"/api/recipes/{id_receta}", headers=auth_header(admin)).json()
    assert body["estado"] == "usada"
    assert body["id_venta"] == id_venta
    assert client.put(
        f"/api/recipes/{id_receta}", json={"cantidad": 9}, headers=auth_header(admin)
    ).status_code == 409
    assert client.delete(f"/api/recipes/{id_receta}", headers=auth_header(admin)).status_code == 409