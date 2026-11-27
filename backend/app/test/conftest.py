<<<<<<< HEAD
"""Fixtures compartidos de los tests.

Los tests corren contra una base APARTE (`<base>_test`), nunca contra la de desarrollo.
Al empezar la sesión de pytest se crea esa base con el mismo flujo que scripts/reset-db:
init.sql + seed.sql, `alembic stamp 6033595434e9` y `alembic upgrade head`.

Variables opcionales:
    REUSE_TEST_DB=1   no recrea la base si ya existe (más rápido, pero hereda su estado)
"""
import os
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.orm import Session

from app.core.config import settings

BACKEND_DIR = Path(__file__).resolve().parents[2]  # /app
INIT_DIR = BACKEND_DIR / "app" / "db" / "init"
ALEMBIC_BASE = "6033595434e9"  # mismo punto de partida que scripts/reset-db


def _apuntar_a_base_de_pruebas() -> URL:
    """Cambia la URL de la base ANTES de que app.db.session cree el engine."""
    actual = make_url(settings.database_url)
    destino = actual if actual.database.endswith("_test") else actual.set(
        database=f"{actual.database}_test"
    )
    url = destino.render_as_string(hide_password=False)
    settings.database_url = url
    os.environ["DATABASE_URL"] = url  # lo lee alembic (subproceso)
    # el cache de Redis no se comparte con el de desarrollo
    settings.cache_prefix = "pstest:"
    os.environ["CACHE_PREFIX"] = "pstest:"
    return destino


URL_PRUEBAS = _apuntar_a_base_de_pruebas()

# Estos imports van DESPUÉS de cambiar la URL a propósito
import app.db.base  # noqa: E402,F401
from app.app import app  # noqa: E402
from app.db.session import engine, get_db  # noqa: E402
from app.models.branch_model import Sucursal  # noqa: E402
from app.models.product_model import Producto  # noqa: E402
from app.models.supplier_model import Proveedor  # noqa: E402


def _crear_base(destino: URL) -> bool:
    """Crea la base vacía. Devuelve False si se reutiliza una existente."""
    admin = create_engine(destino.set(database="postgres"), isolation_level="AUTOCOMMIT")
    try:
        with admin.connect() as con:
            if os.getenv("REUSE_TEST_DB") == "1":
                existe = con.scalar(
                    text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": destino.database}
                )
                if existe:
                    return False
            con.execute(text(f'DROP DATABASE IF EXISTS "{destino.database}" WITH (FORCE)'))
            con.execute(text(f'CREATE DATABASE "{destino.database}"'))
    finally:
        admin.dispose()
    return True


def _cargar_sql(destino: URL) -> None:
    """Ejecuta init.sql y luego seed.sql (orden alfabético, igual que docker-entrypoint-initdb.d)."""
    eng = create_engine(destino)
    raw = eng.raw_connection()
    try:
        cur = raw.cursor()
        for archivo in sorted(INIT_DIR.glob("*.sql")):
            cur.execute(archivo.read_text(encoding="utf-8-sig"))
        raw.commit()
    finally:
        raw.close()
        eng.dispose()


def _migrar() -> None:
    for args in (["stamp", ALEMBIC_BASE], ["upgrade", "head"]):
        res = subprocess.run(
            [sys.executable, "-m", "alembic", *args],
            cwd=BACKEND_DIR,
            env=os.environ.copy(),
            capture_output=True,
            text=True,
        )
        if res.returncode != 0:
            raise RuntimeError(f"alembic {' '.join(args)} falló:\n{res.stdout}\n{res.stderr}")


@pytest.fixture(scope="session", autouse=True)
def base_de_pruebas():
    # Guard: jamás correr los tests contra la base de desarrollo
    assert engine.url.database.endswith("_test"), (
        f"Los tests apuntan a '{engine.url.database}', que no es una base _test"
    )
    if _crear_base(URL_PRUEBAS):
        _cargar_sql(URL_PRUEBAS)
        _migrar()
    yield
=======

def _cargar_sql(destino: URL) -> None:
    """Ejecuta init.sql y seed.sql para preparar la base de pruebas."""
    eng = create_engine(destino)
    raw = eng.raw_connection()
>>>>>>> 93e6603 (fix: isolate demo seed from test database)

    try:
        cur = raw.cursor()

        # La base de pruebas utiliza únicamente los datos
        # originales para mantener los resultados esperados.
        archivos = ("init.sql", "seed.sql")

        for nombre in archivos:
            archivo = INIT_DIR / nombre

            if not archivo.exists():
                raise FileNotFoundError(
                    f"No se encontró el archivo SQL requerido: {archivo}"
                )

            cur.execute(
                archivo.read_text(encoding="utf-8-sig")
            )

        raw.commit()

    finally:
<<<<<<< HEAD
        sesion.close()
        transaccion.rollback()
        conexion.close()


@pytest.fixture
def client(db):
    from fastapi.testclient import TestClient

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
=======
        raw.close()
        eng.dispose()
>>>>>>> 93e6603 (fix: isolate demo seed from test database)
