import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import app.db.base  # noqa: F401
from app.app import app
from app.db.session import engine, get_db
from app.models.branch_model import Sucursal
from app.models.product_model import Producto
from app.models.supplier_model import Proveedor


@pytest.fixture
def db():
    conexion = engine.connect()
    transaccion = conexion.begin()
    sesion = Session(bind=conexion, join_transaction_mode="create_savepoint")
    try:
        yield sesion
    finally:
        sesion.close()
        transaccion.rollback()
        conexion.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def escenario(db):
    prov = Proveedor(nombre="Prov Test")
    suc = Sucursal(nombre="Sucursal Test")
    prod = Producto(nombre="Producto Test", precio=1000, costo=500)
    db.add_all([prov, suc, prod])
    db.flush()
    return prov, suc, prod