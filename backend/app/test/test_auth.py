import os

#Variables minimas para que Settings cargue aunque no exista .env (van ANTES de importar la app)
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
from app.services import auth_service, firebase_service

#Base de datos SQLite en memoria: los tests NO tocan tu Postgres
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

#Los admin no se registran por la API: se crean directo en la BD
def crear_admin():
    db = TestingSessionLocal()
    auth_service.create_user(
        db,
        nombre="Admin",
        correo="admin@mail.com",
        password="admin12345",
        rol="admin",
    )
    db.close()


def token_admin(client):
    crear_admin()
    resp = client.post(
        "/api/auth/login",
        json={"correo": "admin@mail.com", "password": "admin12345"},
    )
    return resp.json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}

#Simula que Firebase acepta el token y devuelve estos claims
def fake_firebase(monkeypatch, claims):
    monkeypatch.setattr(
        firebase_service, "verify_firebase_token", lambda id_token: claims
    )


FIREBASE_BODY = {"id_token": "token-de-prueba-123"}

#Registro y login
def test_registro_de_cliente(client):
    resp = client.post("/api/auth/register", json=CLIENTE)
    assert resp.status_code == 201
    body = resp.json()
    assert body["rol"] == "cliente"
    assert "password" not in body and "password_hash" not in body


def test_registro_crea_registro_de_cliente(client):
    resp = client.post("/api/auth/register", json=CLIENTE)
    assert resp.json()["id_cliente"] is not None


def test_registro_ignora_rol_enviado(client):
    resp = client.post("/api/auth/register", json={**CLIENTE, "rol": "admin"})
    assert resp.status_code == 201
    assert resp.json()["rol"] == "cliente"


def test_registro_ignora_firebase_uid_enviado(client):
    client.post("/api/auth/register", json={**CLIENTE, "firebase_uid": "uid-ajeno"})
    db = TestingSessionLocal()
    user = auth_service.get_user_by_email(db, CLIENTE["correo"])
    assert user.firebase_uid is None
    db.close()


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
        json={"correo": CLIENTE["correo"], "password": "clave-mala"},
    )
    assert resp.status_code == 401
    assert resp.json()["success"] is False


def test_login_usuario_inexistente(client):
    resp = client.post(
        "/api/auth/login",
        json={"correo": "nadie@mail.com", "password": "password123"},
    )
    assert resp.status_code == 401

#Rutas protegidas
def test_me_sin_token_devuelve_401(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_con_token_invalido_devuelve_401(client):
    resp = client.get("/api/auth/me", headers=auth_header("token-falso"))
    assert resp.status_code == 401


def test_me_con_token_valido(client):
    token = registrar_y_loguear(client).json()["access_token"]
    resp = client.get("/api/auth/me", headers=auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["correo"] == CLIENTE["correo"]


def test_ruta_admin_sin_token_devuelve_401(client):
    resp = client.get("/api/auth/users")
    assert resp.status_code == 401


def test_ruta_admin_con_cliente_devuelve_403(client):
    token = registrar_y_loguear(client).json()["access_token"]
    resp = client.get("/api/auth/users", headers=auth_header(token))
    assert resp.status_code == 403


def test_ruta_admin_con_admin_devuelve_200(client):
    token = token_admin(client)
    resp = client.get("/api/auth/users", headers=auth_header(token))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

#Invitacion de usuarios por el admin
INVITADO = {"nombre": "Maria Empleada", "correo": "maria@mail.com", "rol": "empleado"}


def test_admin_invita_usuario(client):
    token = token_admin(client)
    resp = client.post("/api/auth/users", json=INVITADO, headers=auth_header(token))
    assert resp.status_code == 201
    assert resp.json()["rol"] == "empleado"
    assert resp.json()["correo"] == INVITADO["correo"]


def test_invitar_correo_duplicado_devuelve_409(client):
    token = token_admin(client)
    client.post("/api/auth/users", json=INVITADO, headers=auth_header(token))
    resp = client.post("/api/auth/users", json=INVITADO, headers=auth_header(token))
    assert resp.status_code == 409


def test_invitar_sin_token_devuelve_401(client):
    resp = client.post("/api/auth/users", json=INVITADO)
    assert resp.status_code == 401


def test_invitar_con_cliente_devuelve_403(client):
    token = registrar_y_loguear(client).json()["access_token"]
    resp = client.post("/api/auth/users", json=INVITADO, headers=auth_header(token))
    assert resp.status_code == 403


def test_invitado_no_entra_con_login_local(client):
    token = token_admin(client)
    client.post("/api/auth/users", json=INVITADO, headers=auth_header(token))
    resp = client.post(
        "/api/auth/login",
        json={"correo": INVITADO["correo"], "password": "cualquier-clave"},
    )
    assert resp.status_code == 401

#Login con Firebase
def test_firebase_token_invalido_devuelve_401(client, monkeypatch):
    def rechazar(id_token):
        raise firebase_service.InvalidFirebaseToken("token malo")

    monkeypatch.setattr(firebase_service, "verify_firebase_token", rechazar)
    resp = client.post("/api/auth/firebase", json=FIREBASE_BODY)
    assert resp.status_code == 401


def test_firebase_crea_cliente_nuevo(client, monkeypatch):
    fake_firebase(
        monkeypatch,
        {"uid": "uid-1", "email": "nuevo@mail.com", "email_verified": True, "name": "Nuevo Usuario"},
    )
    resp = client.post("/api/auth/firebase", json=FIREBASE_BODY)
    assert resp.status_code == 200
    user = resp.json()["user"]
    assert user["rol"] == "cliente"
    assert user["id_cliente"] is not None
    assert resp.json()["access_token"]


def test_firebase_segundo_ingreso_reutiliza_usuario(client, monkeypatch):
    fake_firebase(
        monkeypatch,
        {"uid": "uid-1", "email": "nuevo@mail.com", "email_verified": True, "name": "Nuevo Usuario"},
    )
    primero = client.post("/api/auth/firebase", json=FIREBASE_BODY).json()["user"]
    segundo = client.post("/api/auth/firebase", json=FIREBASE_BODY).json()["user"]
    assert primero["id_usuario"] == segundo["id_usuario"]


def test_firebase_vincula_usuario_invitado(client, monkeypatch):
    token = token_admin(client)
    client.post("/api/auth/users", json=INVITADO, headers=auth_header(token))

    fake_firebase(
        monkeypatch,
        {"uid": "uid-maria", "email": INVITADO["correo"], "email_verified": True},
    )
    resp = client.post("/api/auth/firebase", json=FIREBASE_BODY)
    assert resp.status_code == 200
    assert resp.json()["user"]["rol"] == "empleado"

    db = TestingSessionLocal()
    user = auth_service.get_user_by_email(db, INVITADO["correo"])
    assert user.firebase_uid == "uid-maria"
    db.close()


def test_firebase_correo_no_verificado_no_vincula(client, monkeypatch):
    token = token_admin(client)
    client.post("/api/auth/users", json=INVITADO, headers=auth_header(token))

    fake_firebase(
        monkeypatch,
        {"uid": "uid-impostor", "email": INVITADO["correo"], "email_verified": False},
    )
    resp = client.post("/api/auth/firebase", json=FIREBASE_BODY)
    assert resp.status_code == 409

    db = TestingSessionLocal()
    user = auth_service.get_user_by_email(db, INVITADO["correo"])
    assert user.firebase_uid is None
    db.close()


def test_firebase_usuario_inactivo_devuelve_403(client, monkeypatch):
    token = token_admin(client)
    client.post("/api/auth/users", json=INVITADO, headers=auth_header(token))

    db = TestingSessionLocal()
    user = auth_service.get_user_by_email(db, INVITADO["correo"])
    user.activo = False
    db.commit()
    db.close()

    fake_firebase(
        monkeypatch,
        {"uid": "uid-maria", "email": INVITADO["correo"], "email_verified": True},
    )
    resp = client.post("/api/auth/firebase", json=FIREBASE_BODY)
    assert resp.status_code == 403

#Formato uniforme de errores
def test_error_de_validacion_tiene_formato_uniforme(client):
    resp = client.post("/api/auth/register", json={"correo": "no-es-correo"})
    assert resp.status_code == 422
    body = resp.json()
    assert body["success"] is False
    assert body["status_code"] == 422
    assert isinstance(body["details"], list)