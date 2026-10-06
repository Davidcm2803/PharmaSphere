import pytest

from app.models.branch_model import Sucursal
from app.models.inventory_model import Inventario

# `client` es una fixture definida en test_auth.py
from app.test.test_auth import (  # noqa: F401
    TestingSessionLocal,
    auth_header,
    client,
    registrar_y_loguear,
    token_admin,
)

CATALOGO = [
    {"nombre": "Paracetamol 500mg", "categoria": "Analgesicos", "precio": 1500, "costo": 800},
    {"nombre": "Ibuprofeno 400mg", "categoria": "Analgesicos", "precio": 1800, "costo": 950},
    {"nombre": "Amoxicilina 500mg", "categoria": "Antibioticos", "precio": 3500, "costo": 1900, "requiere_receta": True},
    {"nombre": "Vitamina C 1000mg", "categoria": "Suplementos", "precio": 2500, "costo": 1200},
]


@pytest.fixture()
def admin(client):
    return token_admin(client)


def crear(client, token, **body):
    return client.post("/api/products", json=body, headers=auth_header(token))


@pytest.fixture()
def catalogo(client, admin):
    return [crear(client, admin, **p).json() for p in CATALOGO]


def nombres(resp):
    return [p["nombre"] for p in resp.json()["items"]]

#Listar y buscar (público)
def test_listar_sin_login(client, catalogo):
    resp = client.get("/api/products")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 4
    assert body["page"] == 1
    assert "costo" not in body["items"][0]


def test_buscar_por_nombre_ignora_mayusculas(client, catalogo):
    assert nombres(client.get("/api/products?q=IBU")) == ["Ibuprofeno 400mg"]


def test_buscar_trata_porcentaje_como_texto(client, catalogo):
    assert client.get("/api/products?q=%25").json()["total"] == 0


def test_filtrar_por_categoria(client, catalogo):
    resp = client.get("/api/products?categoria=analgesicos")
    assert nombres(resp) == ["Ibuprofeno 400mg", "Paracetamol 500mg"]


def test_filtrar_por_rango_de_precio(client, catalogo):
    resp = client.get("/api/products?precio_min=1600&precio_max=3000&orden=precio_asc")
    assert nombres(resp) == ["Ibuprofeno 400mg", "Vitamina C 1000mg"]


def test_rango_de_precio_invertido_devuelve_400(client, catalogo):
    assert client.get("/api/products?precio_min=3000&precio_max=1000").status_code == 400


def test_filtrar_por_receta(client, catalogo):
    assert nombres(client.get("/api/products?requiere_receta=true")) == ["Amoxicilina 500mg"]


def test_ordenar_por_precio(client, catalogo):
    asc = [p["precio"] for p in client.get("/api/products?orden=precio_asc").json()["items"]]
    desc = [p["precio"] for p in client.get("/api/products?orden=precio_desc").json()["items"]]
    assert asc == [1500, 1800, 2500, 3500]
    assert desc == [3500, 2500, 1800, 1500]


def test_paginacion(client, catalogo):
    p1 = client.get("/api/products?page_size=3").json()
    p2 = client.get("/api/products?page_size=3&page=2").json()
    assert (len(p1["items"]), p1["total"], p1["pages"]) == (3, 4, 2)
    assert len(p2["items"]) == 1


def test_page_size_maximo(client):
    assert client.get("/api/products?page_size=101").status_code == 422

#Detalle y stock
def test_detalle_con_stock_total(client, catalogo):
    id_producto = catalogo[0]["id_producto"]
    db = TestingSessionLocal()
    db.add_all([Sucursal(nombre="Central"), Sucursal(nombre="Norte")])
    db.flush()
    db.add_all([
        Inventario(id_producto=id_producto, id_sucursal=1, cantidad=10, stock_minimo=2),
        Inventario(id_producto=id_producto, id_sucursal=2, cantidad=5, stock_minimo=2),
    ])
    db.commit()
    db.close()

    assert client.get(f"/api/products/{id_producto}").json()["stock_total"] == 15
    listado = client.get("/api/products?q=paracetamol").json()["items"][0]
    assert listado["stock_total"] == 15


def test_detalle_publico_no_expone_costo(client, catalogo):
    body = client.get(f"/api/products/{catalogo[0]['id_producto']}").json()
    assert "costo" not in body and "activo" not in body


def test_detalle_admin_incluye_costo(client, admin, catalogo):
    resp = client.get(f"/api/products/{catalogo[0]['id_producto']}", headers=auth_header(admin))
    assert resp.json()["costo"] == 800


def test_detalle_inexistente_devuelve_404(client):
    resp = client.get("/api/products/999")
    assert resp.status_code == 404
    assert resp.json()["success"] is False

#Crear
def test_admin_crea_producto(client, admin):
    resp = crear(client, admin, **CATALOGO[0])
    assert resp.status_code == 201
    assert resp.json()["costo"] == 800
    assert resp.json()["activo"] is True


def test_crear_sin_token_devuelve_401(client):
    assert client.post("/api/products", json=CATALOGO[0]).status_code == 401


def test_crear_como_cliente_devuelve_403(client):
    token = registrar_y_loguear(client).json()["access_token"]
    assert crear(client, token, **CATALOGO[0]).status_code == 403


def test_crear_con_precio_invalido_devuelve_422(client, admin):
    assert crear(client, admin, **{**CATALOGO[0], "precio": 0}).status_code == 422


def test_crear_con_proveedor_inexistente_devuelve_400(client, admin):
    assert crear(client, admin, **{**CATALOGO[0], "id_proveedor": 999}).status_code == 400

#Editar
def test_admin_edita_producto(client, admin, catalogo):
    id_producto = catalogo[0]["id_producto"]
    resp = client.put(f"/api/products/{id_producto}", json={"precio": 2000}, headers=auth_header(admin))
    assert resp.status_code == 200
    assert resp.json()["precio"] == 2000
    assert resp.json()["nombre"] == "Paracetamol 500mg"


def test_editar_como_cliente_devuelve_403(client, catalogo):
    token = registrar_y_loguear(client).json()["access_token"]
    resp = client.put(f"/api/products/{catalogo[0]['id_producto']}", json={"precio": 1}, headers=auth_header(token))
    assert resp.status_code == 403


def test_editar_inexistente_devuelve_404(client, admin):
    resp = client.put("/api/products/999", json={"precio": 100}, headers=auth_header(admin))
    assert resp.status_code == 404

#Borrar
def test_borrar_deshabilita_el_producto(client, admin, catalogo):
    id_producto = catalogo[0]["id_producto"]
    assert client.delete(f"/api/products/{id_producto}", headers=auth_header(admin)).status_code == 204

    assert client.get("/api/products").json()["total"] == 3
    assert client.get(f"/api/products/{id_producto}").status_code == 404
    admin_view = client.get(f"/api/products/{id_producto}", headers=auth_header(admin))
    assert admin_view.json()["activo"] is False


def test_borrar_sin_token_devuelve_401(client, catalogo):
    assert client.delete(f"/api/products/{catalogo[0]['id_producto']}").status_code == 401


def test_borrar_como_cliente_devuelve_403(client, catalogo):
    token = registrar_y_loguear(client).json()["access_token"]
    resp = client.delete(f"/api/products/{catalogo[0]['id_producto']}", headers=auth_header(token))
    assert resp.status_code == 403

#Categorías
def test_categorias_unicas_y_ordenadas(client, catalogo):
    resp = client.get("/api/categories")
    assert resp.status_code == 200
    assert resp.json() == ["Analgesicos", "Antibioticos", "Suplementos"]


def test_categorias_ignoran_productos_borrados(client, admin, catalogo):
    client.delete(f"/api/products/{catalogo[3]['id_producto']}", headers=auth_header(admin))
    assert "Suplementos" not in client.get("/api/categories").json()