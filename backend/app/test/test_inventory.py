from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.models.inventory_model import Inventario
from app.models.lot_model import Lote
from app.models.movement_model import MovimientoInventario
from app.services.inventory_service import InventoryError, descontar_fefo


def _lote(db, suc, prod, numero, dias, cantidad):
    l = Lote(id_producto=prod.id_producto, id_sucursal=suc.id_sucursal, numero_lote=numero,
             fecha_vencimiento=date.today() + timedelta(days=dias), cantidad=cantidad)
    db.add(l)
    db.flush()
    return l


def _inventario(db, suc, prod, cantidad):
    inv = Inventario(id_producto=prod.id_producto, id_sucursal=suc.id_sucursal, cantidad=cantidad)
    db.add(inv)
    db.flush()
    return inv


def test_fefo_descuenta_del_lote_que_vence_primero(db, escenario):
    _, suc, prod = escenario
    cerca = _lote(db, suc, prod, "CERCA", 10, 5)
    lejos = _lote(db, suc, prod, "LEJOS", 60, 10)
    vencido = _lote(db, suc, prod, "VENCIDO", -1, 7)
    inv = _inventario(db, suc, prod, 22)

    descontar_fefo(db, prod.id_producto, suc.id_sucursal, 8)

    assert (cerca.cantidad, lejos.cantidad, vencido.cantidad) == (0, 7, 7)
    assert inv.cantidad == 14
    movs = db.scalars(select(MovimientoInventario).where(MovimientoInventario.tipo == "venta",
                      MovimientoInventario.id_producto == prod.id_producto)).all()
    assert sorted(m.cantidad for m in movs) == [-5, -3]


def test_fefo_stock_vendible_insuficiente_no_modifica_nada(db, escenario):
    _, suc, prod = escenario
    buen = _lote(db, suc, prod, "OK", 30, 15)
    _lote(db, suc, prod, "VENCIDO", -1, 7)
    inv = _inventario(db, suc, prod, 22)

    with pytest.raises(InventoryError) as e:
        descontar_fefo(db, prod.id_producto, suc.id_sucursal, 16)
    assert e.value.status_code == 409
    assert buen.cantidad == 15 and inv.cantidad == 22


def test_expiring_devuelve_solo_los_lotes_correctos(client, db, escenario):
    _, suc, prod = escenario
    _lote(db, suc, prod, "HOY", 0, 5)
    _lote(db, suc, prod, "D30", 30, 5)
    _lote(db, suc, prod, "D31", 31, 5)
    _lote(db, suc, prod, "AYER", -1, 5)
    _lote(db, suc, prod, "VACIO", 10, 0)

    r = client.get("/api/inventory/expiring", params={"days": 30, "id_sucursal": suc.id_sucursal})
    assert r.status_code == 200
    assert [l["numero_lote"] for l in r.json()] == ["HOY", "D30"]


def test_expired_devuelve_solo_vencidos_con_stock(client, db, escenario):
    _, suc, prod = escenario
    _lote(db, suc, prod, "AYER", -1, 5)
    _lote(db, suc, prod, "VIEJO_VACIO", -30, 0)
    _lote(db, suc, prod, "HOY", 0, 5)

    r = client.get("/api/inventory/expired", params={"id_sucursal": suc.id_sucursal})
    assert [l["numero_lote"] for l in r.json()] == ["AYER"]