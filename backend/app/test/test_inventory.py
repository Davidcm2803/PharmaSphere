from types import SimpleNamespace

import pytest
from sqlalchemy import select

from app.models.branch_model import Sucursal
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

BASE = "/api/inventory"

CATALOGO = [
    {"nombre": "Paracetamol 500mg", "categoria": "Analgesicos", "precio": 1500, "costo": 800},
    {"nombre": "Ibuprofeno 400mg", "categoria": "Analgesicos", "precio": 1800, "costo": 950},
    {"nombre": "Vitamina C 1000mg", "categoria": "Suplementos", "precio": 2500, "costo": 1200},
]


# fixtures y helpers
@pytest.fixture()
def admin(client):
    return token_admin(client)


@pytest.fixture()
def cliente(client):
    return registrar_y_loguear(client).json()["access_token"]


@pytest.fixture()
def catalogo(client, admin):
    return [
        client.post("/api/products", json=p, headers=auth_header(admin)).json()
        for p in CATALOGO
    ]


@pytest.fixture()
def sucursales(client):
    db = TestingSessionLocal()
    central, norte, cerrada = (
        Sucursal(nombre="Central"),
        Sucursal(nombre="Norte"),
        Sucursal(nombre="Cerrada", activo=False),
    )
    db.add_all([central, norte, cerrada])
    db.commit()
    ids = SimpleNamespace(central=central.id_sucursal, norte=norte.id_sucursal, cerrada=cerrada.id_sucursal)
    db.close()
    return ids


def poner_stock(id_producto, id_sucursal, cantidad, minimo=0):
    db = TestingSessionLocal()
    db.add(Inventario(id_producto=id_producto, id_sucursal=id_sucursal, cantidad=cantidad, stock_minimo=minimo))
    db.commit()
    db.close()


def leer_stock(id_producto, id_sucursal):
    """Cantidad en BD, o None si no existe el registro."""
    db = TestingSessionLocal()
    inv = db.scalars(
        select(Inventario).where(
            Inventario.id_producto == id_producto,
            Inventario.id_sucursal == id_sucursal,
        )
    ).first()
    cantidad = inv.cantidad if inv else None
    db.close()
    return cantidad


def movimientos():
    db = TestingSessionLocal()
    rows = [
        {"tipo": m.tipo, "id_sucursal": m.id_sucursal, "cantidad": m.cantidad, "motivo": m.motivo}
        for m in db.scalars(select(MovimientoInventario)).all()
    ]
    db.close()
    return rows


def ajustar(client, token, **body):
    return client.post(f"{BASE}/adjust", json=body, headers=auth_header(token))


def transferir(client, token, **body):
    return client.post(f"{BASE}/transfer", json=body, headers=auth_header(token))


def nombres(resp):
    return [i["producto_nombre"] for i in resp.json()]


# Listar inventario
def test_listar_sin_token_devuelve_401(client):
    assert client.get(BASE).status_code == 401


def test_listar_como_cliente_devuelve_403(client, cliente):
    assert client.get(BASE, headers=auth_header(cliente)).status_code == 403


def test_listar_devuelve_stock_y_marca_stock_bajo(client, admin, catalogo, sucursales):
    poner_stock(catalogo[0]["id_producto"], sucursales.central, cantidad=1, minimo=5)
    poner_stock(catalogo[1]["id_producto"], sucursales.central, cantidad=10, minimo=5)

    resp = client.get(BASE, headers=auth_header(admin))
    assert resp.status_code == 200
    por_nombre = {i["producto_nombre"]: i for i in resp.json()}
    assert por_nombre["Paracetamol 500mg"]["stock_bajo"] is True
    assert por_nombre["Ibuprofeno 400mg"]["stock_bajo"] is False
    assert por_nombre["Ibuprofeno 400mg"]["sucursal_nombre"] == "Central"


def test_cantidad_igual_al_minimo_no_es_stock_bajo(client, admin, catalogo, sucursales):
    poner_stock(catalogo[0]["id_producto"], sucursales.central, cantidad=5, minimo=5)
    item = client.get(BASE, headers=auth_header(admin)).json()[0]
    assert item["stock_bajo"] is False


def test_filtrar_por_sucursal(client, admin, catalogo, sucursales):
    poner_stock(catalogo[0]["id_producto"], sucursales.central, 10)
    poner_stock(catalogo[1]["id_producto"], sucursales.norte, 10)

    resp = client.get(f"{BASE}?id_sucursal={sucursales.norte}", headers=auth_header(admin))
    assert nombres(resp) == ["Ibuprofeno 400mg"]


def test_filtrar_por_producto(client, admin, catalogo, sucursales):
    id_producto = catalogo[0]["id_producto"]
    poner_stock(id_producto, sucursales.central, 10)
    poner_stock(id_producto, sucursales.norte, 4)
    poner_stock(catalogo[1]["id_producto"], sucursales.central, 7)

    resp = client.get(f"{BASE}?id_producto={id_producto}", headers=auth_header(admin))
    assert len(resp.json()) == 2
    assert set(nombres(resp)) == {"Paracetamol 500mg"}


def test_buscar_por_nombre_ignora_mayusculas(client, admin, catalogo, sucursales):
    poner_stock(catalogo[0]["id_producto"], sucursales.central, 10)
    poner_stock(catalogo[1]["id_producto"], sucursales.central, 10)

    resp = client.get(f"{BASE}?q=IBU", headers=auth_header(admin))
    assert nombres(resp) == ["Ibuprofeno 400mg"]


def test_buscar_trata_porcentaje_como_texto(client, admin, catalogo, sucursales):
    poner_stock(catalogo[0]["id_producto"], sucursales.central, 10)
    assert client.get(f"{BASE}?q=%25", headers=auth_header(admin)).json() == []


def test_filtrar_solo_stock_bajo(client, admin, catalogo, sucursales):
    poner_stock(catalogo[0]["id_producto"], sucursales.central, cantidad=1, minimo=5)
    poner_stock(catalogo[1]["id_producto"], sucursales.central, cantidad=10, minimo=5)

    resp = client.get(f"{BASE}?low_stock=true", headers=auth_header(admin))
    assert nombres(resp) == ["Paracetamol 500mg"]


def test_listar_ordena_por_nombre_y_sucursal(client, admin, catalogo, sucursales):
    poner_stock(catalogo[2]["id_producto"], sucursales.central, 1)
    poner_stock(catalogo[0]["id_producto"], sucursales.norte, 1)
    poner_stock(catalogo[0]["id_producto"], sucursales.central, 1)

    items = client.get(BASE, headers=auth_header(admin)).json()
    assert [(i["producto_nombre"], i["sucursal_nombre"]) for i in items] == [
        ("Paracetamol 500mg", "Central"),
        ("Paracetamol 500mg", "Norte"),
        ("Vitamina C 1000mg", "Central"),
    ]


def test_listar_excluye_productos_borrados(client, admin, catalogo, sucursales):
    id_producto = catalogo[0]["id_producto"]
    poner_stock(id_producto, sucursales.central, 10)
    client.delete(f"/api/products/{id_producto}", headers=auth_header(admin))

    assert client.get(BASE, headers=auth_header(admin)).json() == []


def test_listar_con_id_sucursal_invalido_devuelve_422(client, admin):
    assert client.get(f"{BASE}?id_sucursal=0", headers=auth_header(admin)).status_code == 422


# Stock de un producto en cada sucursal
def test_stock_de_producto_incluye_sucursales_activas_sin_registro(client, admin, catalogo, sucursales):
    id_producto = catalogo[0]["id_producto"]
    poner_stock(id_producto, sucursales.central, cantidad=8, minimo=2)

    resp = client.get(f"{BASE}/product/{id_producto}", headers=auth_header(admin))
    assert resp.status_code == 200
    items = resp.json()
    # Solo Central y Norte (la inactiva no aparece), ordenadas por nombre
    assert [i["sucursal_nombre"] for i in items] == ["Central", "Norte"]
    assert items[0]["cantidad"] == 8
    assert items[0]["id_inventario"] is not None
    assert items[1]["cantidad"] == 0
    assert items[1]["id_inventario"] is None
    assert items[1]["stock_bajo"] is False


def test_stock_de_producto_inexistente_devuelve_404(client, admin, sucursales):
    assert client.get(f"{BASE}/product/999", headers=auth_header(admin)).status_code == 404


def test_stock_de_producto_sin_token_devuelve_401(client, catalogo):
    assert client.get(f"{BASE}/product/{catalogo[0]['id_producto']}").status_code == 401


def test_stock_de_producto_como_cliente_devuelve_403(client, cliente, catalogo):
    resp = client.get(f"{BASE}/product/{catalogo[0]['id_producto']}", headers=auth_header(cliente))
    assert resp.status_code == 403


# Ajuste manual
def test_ajuste_positivo_crea_registro_y_movimiento(client, admin, catalogo, sucursales):
    id_producto = catalogo[0]["id_producto"]
    resp = ajustar(client, admin, id_producto=id_producto, id_sucursal=sucursales.central,
                   cantidad=10, motivo="Compra inicial")
    assert resp.status_code == 200
    body = resp.json()
    assert body["cantidad"] == 10
    assert body["id_inventario"] is not None
    assert body["sucursal_nombre"] == "Central"
    assert leer_stock(id_producto, sucursales.central) == 10

    movs = movimientos()
    assert len(movs) == 1
    assert movs[0]["tipo"] == "ajuste"
    assert movs[0]["cantidad"] == 10
    assert movs[0]["motivo"] == "Compra inicial"


def test_ajuste_negativo_resta_stock(client, admin, catalogo, sucursales):
    id_producto = catalogo[0]["id_producto"]
    poner_stock(id_producto, sucursales.central, 10)

    resp = ajustar(client, admin, id_producto=id_producto, id_sucursal=sucursales.central,
                   cantidad=-4, motivo="Producto vencido")
    assert resp.status_code == 200
    assert resp.json()["cantidad"] == 6
    assert movimientos()[0]["cantidad"] == -4


def test_ajuste_conserva_stock_minimo(client, admin, catalogo, sucursales):
    id_producto = catalogo[0]["id_producto"]
    poner_stock(id_producto, sucursales.central, cantidad=10, minimo=5)

    resp = ajustar(client, admin, id_producto=id_producto, id_sucursal=sucursales.central,
                   cantidad=-6, motivo="Merma")
    assert resp.json()["stock_minimo"] == 5
    assert resp.json()["stock_bajo"] is True


def test_ajuste_que_deja_stock_negativo_devuelve_409(client, admin, catalogo, sucursales):
    id_producto = catalogo[0]["id_producto"]
    poner_stock(id_producto, sucursales.central, 3)

    resp = ajustar(client, admin, id_producto=id_producto, id_sucursal=sucursales.central,
                   cantidad=-5, motivo="Merma")
    assert resp.status_code == 409
    assert leer_stock(id_producto, sucursales.central) == 3
    assert movimientos() == []


def test_restar_sin_registro_previo_devuelve_409(client, admin, catalogo, sucursales):
    id_producto = catalogo[0]["id_producto"]
    resp = ajustar(client, admin, id_producto=id_producto, id_sucursal=sucursales.central,
                   cantidad=-1, motivo="Merma")
    assert resp.status_code == 409
    assert leer_stock(id_producto, sucursales.central) is None
    assert movimientos() == []


def test_ajuste_cantidad_cero_devuelve_422(client, admin, catalogo, sucursales):
    resp = ajustar(client, admin, id_producto=catalogo[0]["id_producto"],
                   id_sucursal=sucursales.central, cantidad=0, motivo="Nada")
    assert resp.status_code == 422


def test_ajuste_cantidad_fuera_de_rango_devuelve_422(client, admin, catalogo, sucursales):
    resp = ajustar(client, admin, id_producto=catalogo[0]["id_producto"],
                   id_sucursal=sucursales.central, cantidad=1_000_001, motivo="Demasiado")
    assert resp.status_code == 422


def test_ajuste_motivo_corto_devuelve_422(client, admin, catalogo, sucursales):
    # Con espacios sobrantes: tras el strip queda de 2 caracteres
    resp = ajustar(client, admin, id_producto=catalogo[0]["id_producto"],
                   id_sucursal=sucursales.central, cantidad=5, motivo="  ab  ")
    assert resp.status_code == 422


def test_ajuste_sin_motivo_devuelve_422(client, admin, catalogo, sucursales):
    resp = ajustar(client, admin, id_producto=catalogo[0]["id_producto"],
                   id_sucursal=sucursales.central, cantidad=5)
    assert resp.status_code == 422


def test_ajuste_sucursal_inexistente_devuelve_404(client, admin, catalogo, sucursales):
    resp = ajustar(client, admin, id_producto=catalogo[0]["id_producto"],
                   id_sucursal=999, cantidad=5, motivo="Compra")
    assert resp.status_code == 404


def test_ajuste_sucursal_inactiva_devuelve_400(client, admin, catalogo, sucursales):
    resp = ajustar(client, admin, id_producto=catalogo[0]["id_producto"],
                   id_sucursal=sucursales.cerrada, cantidad=5, motivo="Compra")
    assert resp.status_code == 400


def test_ajuste_producto_inexistente_devuelve_404(client, admin, sucursales):
    resp = ajustar(client, admin, id_producto=999, id_sucursal=sucursales.central,
                   cantidad=5, motivo="Compra")
    assert resp.status_code == 404


def test_ajuste_sin_token_devuelve_401(client, catalogo, sucursales):
    resp = client.post(f"{BASE}/adjust", json={
        "id_producto": catalogo[0]["id_producto"], "id_sucursal": sucursales.central,
        "cantidad": 5, "motivo": "Compra",
    })
    assert resp.status_code == 401


def test_ajuste_como_cliente_devuelve_403(client, cliente, catalogo, sucursales):
    resp = ajustar(client, cliente, id_producto=catalogo[0]["id_producto"],
                   id_sucursal=sucursales.central, cantidad=5, motivo="Compra")
    assert resp.status_code == 403


# Transferencia
def test_transferencia_mueve_stock_y_registra_dos_movimientos(client, admin, catalogo, sucursales):
    id_producto = catalogo[0]["id_producto"]
    poner_stock(id_producto, sucursales.central, 10)
    poner_stock(id_producto, sucursales.norte, 2)

    resp = transferir(client, admin, id_producto=id_producto, id_origen=sucursales.central,
                      id_destino=sucursales.norte, cantidad=4, motivo="Reposición")
    assert resp.status_code == 200
    body = resp.json()
    assert body["stock_origen"] == 6
    assert body["stock_destino"] == 6
    assert body["cantidad"] == 4
    assert body["producto_nombre"] == "Paracetamol 500mg"
    assert leer_stock(id_producto, sucursales.central) == 6
    assert leer_stock(id_producto, sucursales.norte) == 6

    por_tipo = {m["tipo"]: m for m in movimientos()}
    assert por_tipo["transferencia_salida"]["id_sucursal"] == sucursales.central
    assert por_tipo["transferencia_salida"]["cantidad"] == -4
    assert por_tipo["transferencia_entrada"]["id_sucursal"] == sucursales.norte
    assert por_tipo["transferencia_entrada"]["cantidad"] == 4


def test_transferencia_crea_registro_en_destino_si_no_existe(client, admin, catalogo, sucursales):
    id_producto = catalogo[0]["id_producto"]
    poner_stock(id_producto, sucursales.central, 10)

    resp = transferir(client, admin, id_producto=id_producto, id_origen=sucursales.central,
                      id_destino=sucursales.norte, cantidad=10)
    assert resp.status_code == 200
    assert resp.json()["stock_origen"] == 0
    assert resp.json()["stock_destino"] == 10
    assert leer_stock(id_producto, sucursales.norte) == 10


def test_transferencia_sin_motivo_usa_texto_por_defecto(client, admin, catalogo, sucursales):
    id_producto = catalogo[0]["id_producto"]
    poner_stock(id_producto, sucursales.central, 5)

    transferir(client, admin, id_producto=id_producto, id_origen=sucursales.central,
               id_destino=sucursales.norte, cantidad=1, motivo="   ")
    por_tipo = {m["tipo"]: m for m in movimientos()}
    assert por_tipo["transferencia_salida"]["motivo"] == "Transferencia entre sucursales → Norte"
    assert por_tipo["transferencia_entrada"]["motivo"] == "Transferencia entre sucursales ← Central"


def test_transferencia_con_stock_insuficiente_devuelve_409_sin_cambios(client, admin, catalogo, sucursales):
    id_producto = catalogo[0]["id_producto"]
    poner_stock(id_producto, sucursales.central, 3)
    poner_stock(id_producto, sucursales.norte, 1)

    resp = transferir(client, admin, id_producto=id_producto, id_origen=sucursales.central,
                      id_destino=sucursales.norte, cantidad=5)
    assert resp.status_code == 409
    assert leer_stock(id_producto, sucursales.central) == 3
    assert leer_stock(id_producto, sucursales.norte) == 1
    assert movimientos() == []


def test_transferencia_sin_registro_en_origen_devuelve_409(client, admin, catalogo, sucursales):
    id_producto = catalogo[0]["id_producto"]
    resp = transferir(client, admin, id_producto=id_producto, id_origen=sucursales.central,
                      id_destino=sucursales.norte, cantidad=1)
    assert resp.status_code == 409
    assert leer_stock(id_producto, sucursales.norte) is None


def test_transferencia_a_la_misma_sucursal_devuelve_422(client, admin, catalogo, sucursales):
    resp = transferir(client, admin, id_producto=catalogo[0]["id_producto"],
                      id_origen=sucursales.central, id_destino=sucursales.central, cantidad=1)
    assert resp.status_code == 422


@pytest.mark.parametrize("cantidad", [0, -3, 1_000_001])
def test_transferencia_con_cantidad_invalida_devuelve_422(client, admin, catalogo, sucursales, cantidad):
    resp = transferir(client, admin, id_producto=catalogo[0]["id_producto"],
                      id_origen=sucursales.central, id_destino=sucursales.norte, cantidad=cantidad)
    assert resp.status_code == 422


def test_transferencia_motivo_demasiado_largo_devuelve_422(client, admin, catalogo, sucursales):
    resp = transferir(client, admin, id_producto=catalogo[0]["id_producto"],
                      id_origen=sucursales.central, id_destino=sucursales.norte,
                      cantidad=1, motivo="x" * 201)
    assert resp.status_code == 422


def test_transferencia_origen_inexistente_devuelve_404(client, admin, catalogo, sucursales):
    resp = transferir(client, admin, id_producto=catalogo[0]["id_producto"],
                      id_origen=999, id_destino=sucursales.norte, cantidad=1)
    assert resp.status_code == 404


def test_transferencia_destino_inactivo_devuelve_400(client, admin, catalogo, sucursales):
    id_producto = catalogo[0]["id_producto"]
    poner_stock(id_producto, sucursales.central, 5)
    resp = transferir(client, admin, id_producto=id_producto, id_origen=sucursales.central,
                      id_destino=sucursales.cerrada, cantidad=1)
    assert resp.status_code == 400
    assert leer_stock(id_producto, sucursales.central) == 5


def test_transferencia_origen_inactivo_devuelve_400(client, admin, catalogo, sucursales):
    resp = transferir(client, admin, id_producto=catalogo[0]["id_producto"],
                      id_origen=sucursales.cerrada, id_destino=sucursales.norte, cantidad=1)
    assert resp.status_code == 400


def test_transferencia_producto_inexistente_devuelve_404(client, admin, sucursales):
    resp = transferir(client, admin, id_producto=999, id_origen=sucursales.central,
                      id_destino=sucursales.norte, cantidad=1)
    assert resp.status_code == 404


def test_transferencia_sin_token_devuelve_401(client, catalogo, sucursales):
    resp = client.post(f"{BASE}/transfer", json={
        "id_producto": catalogo[0]["id_producto"], "id_origen": sucursales.central,
        "id_destino": sucursales.norte, "cantidad": 1,
    })
    assert resp.status_code == 401


def test_transferencia_como_cliente_devuelve_403(client, cliente, catalogo, sucursales):
    resp = transferir(client, cliente, id_producto=catalogo[0]["id_producto"],
                      id_origen=sucursales.central, id_destino=sucursales.norte, cantidad=1)
    assert resp.status_code == 403