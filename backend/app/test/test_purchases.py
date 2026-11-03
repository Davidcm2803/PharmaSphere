from datetime import date, timedelta

from sqlalchemy import select

from app.models.inventory_model import Inventario
from app.models.lot_model import Lote
from app.models.movement_model import MovimientoInventario


def _crear_compra(client, prov, suc, prod, cantidad=100):
    r = client.post("/api/purchases", json={
        "id_proveedor": prov.id_proveedor,
        "id_sucursal": suc.id_sucursal,
        "detalles": [{"id_producto": prod.id_producto, "cantidad": cantidad, "costo_unitario": "500.00"}],
    })
    assert r.status_code == 201, r.text
    return r.json()


def _body_recepcion(prod, lotes):
    return {"lineas": [{"id_producto": prod.id_producto, "lotes": lotes}]}


def _lote(numero, dias, cantidad):
    return {"numero_lote": numero, "fecha_vencimiento": str(date.today() + timedelta(days=dias)), "cantidad": cantidad}


def test_crear_compra_calcula_total(client, escenario):
    prov, suc, prod = escenario
    compra = _crear_compra(client, prov, suc, prod, cantidad=10)
    assert compra["estado"] == "pendiente"
    assert float(compra["total"]) == 5000.0


def test_recibir_compra_crea_lotes_y_sube_stock(client, db, escenario):
    prov, suc, prod = escenario
    compra = _crear_compra(client, prov, suc, prod, cantidad=100)

    r = client.post(
        f"/api/purchases/{compra['id_compra']}/receive",
        json=_body_recepcion(prod, [_lote("L-A", 90, 60), _lote("L-B", 200, 40)]),
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


def test_recibir_dos_veces_da_409_y_no_duplica_stock(client, db, escenario):
    prov, suc, prod = escenario
    compra = _crear_compra(client, prov, suc, prod, cantidad=10)
    url = f"/api/purchases/{compra['id_compra']}/receive"
    body = _body_recepcion(prod, [_lote("L-A", 90, 10)])
    assert client.post(url, json=body).status_code == 200
    assert client.post(url, json=body).status_code == 409
    inv = db.scalar(select(Inventario).where(Inventario.id_producto == prod.id_producto))
    assert inv.cantidad == 10


def test_recibir_con_cantidad_distinta_no_crea_nada(client, db, escenario):
    prov, suc, prod = escenario
    compra = _crear_compra(client, prov, suc, prod, cantidad=10)
    r = client.post(f"/api/purchases/{compra['id_compra']}/receive",
                    json=_body_recepcion(prod, [_lote("L-A", 90, 7)]))
    assert r.status_code == 422
    assert db.scalars(select(Lote).where(Lote.id_producto == prod.id_producto)).all() == []


def test_recibir_lote_ya_vencido_se_rechaza(client, escenario):
    prov, suc, prod = escenario
    compra = _crear_compra(client, prov, suc, prod, cantidad=10)
    r = client.post(f"/api/purchases/{compra['id_compra']}/receive",
                    json=_body_recepcion(prod, [_lote("L-A", -1, 10)]))
    assert r.status_code == 422