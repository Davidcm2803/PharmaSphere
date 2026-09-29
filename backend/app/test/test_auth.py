import os

# Variables mínimas para que Settings cargue aunque no exista .env (van ANTES de importar la app)
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "clave-solo-para-tests")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.app import app
from app.db.base import Base
from app.db.session import get_db
from app.models.user_model import Usuario
from app.schemas.user_schema import UserRegister
from app.services import auth_service

# Base de datos SQLite en memoria: los tests NO tocan tu Postgres
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


CLIENTE = {
    "nombre": "Cliente Prueba",
    "correo": "cliente@mail.com",
    "password": "password123",
}


def registrar_y_loguear(client, datos=CLIENTE):
    client.post("/api/auth/register", json=datos)
    resp = client.post(
        "/api/auth/login",
        json={"correo": datos["correo"], "password": datos["password"]},
    )
    return resp


def crear_admin():
    """Los admin no se registran por la API: se crean directo en la BD."""
    db = TestingSessionLocal()
    auth_service.create_user(
        db,
        UserRegister(nombre="Admin", correo="admin@mail.com", password="admin12345"),
        rol="admin",
    )
    db.close()


# ---------- Registro y login ----------
def test_registro_de_cliente(client):
    resp = client.post("/api/auth/register", json=CLIENTE)
    assert resp.status_code == 201
    body = resp.json()
    assert body["rol"] == "cliente"
    assert "password" not in body and "password_hash" not in body


def test_registro_ignora_rol_enviado(client):
    resp = client.post("/api/auth/register", json={**CLIENTE, "rol": "admin"})
    assert resp.status_code == 201
    assert resp.json()["rol"] == "cliente"


def test_registro_correo_duplicado(client):
    client.post("/api/auth/register", json=CLIENTE)
    resp = client.post("/api/auth/register", json=CLIENTE)
    assert resp.status_code == 409
    assert resp.json()["success"] is False


def test_login_correcto(client):
    resp = registrar_y_loguear(client)
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["correo"] == CLIENTE["correo"]


def test_login_incorrecto(client):
    client.post("/api/auth/register", json=CLIENTE)
    resp = client.post(
        "/api/auth/login",
        json={"correo": CLIENTE["correo"], "password": "contraseña-mala"},
    )
    assert resp.status_code == 401
    assert resp.json()["success"] is False


def test_login_usuario_inexistente(client):
    resp = client.post(
        "/api/auth/login",
        json={"correo": "nadie@mail.com", "password": "password123"},
    )
    assert resp.status_code == 401


# ---------- Rutas protegidas ----------
def test_me_sin_token_devuelve_401(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_con_token_invalido_devuelve_401(client):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer token-falso"})
    assert resp.status_code == 401


def test_me_con_token_valido(client):
    token = registrar_y_loguear(client).json()["access_token"]
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["correo"] == CLIENTE["correo"]


def test_ruta_admin_sin_token_devuelve_401(client):
    resp = client.get("/api/auth/users")
    assert resp.status_code == 401


def test_ruta_admin_con_cliente_devuelve_403(client):
    token = registrar_y_loguear(client).json()["access_token"]
    resp = client.get("/api/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


def test_ruta_admin_con_admin_devuelve_200(client):
    crear_admin()
    resp = client.post(
        "/api/auth/login",
        json={"correo": "admin@mail.com", "password": "admin12345"},
    )
    token = resp.json()["access_token"]
    resp = client.get("/api/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ---------- Formato uniforme de errores ----------
def test_error_de_validacion_tiene_formato_uniforme(client):
    resp = client.post("/api/auth/register", json={"correo": "no-es-correo"})
    assert resp.status_code == 422
    body = resp.json()
    assert body["success"] is False
    assert body["status_code"] == 422
    assert isinstance(body["details"], list)