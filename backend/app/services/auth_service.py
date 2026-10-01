import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.customer_model import Cliente
from app.models.user_model import Usuario

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

#Error de negocio al entrar con Firebase. El mensaje se le muestra al usuario
class FirebaseAuthError(Exception):
    pass

#Contrasenas
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

#Un usuario de Firebase o invitado sin clave real no tiene password_hash valido
def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)

#Tokens JWT
def create_access_token(user: Usuario) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": str(user.id_usuario), "rol": user.rol, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

#Devuelve el payload o None si el token es invalido o expiro
def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None

#Usuarios
def get_user_by_email(db: Session, correo: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.correo == correo.lower()).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.id_usuario == user_id).first()


def get_user_by_firebase_uid(db: Session, uid: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.firebase_uid == uid).first()

#Enlaza con un cliente existente (ej. creado en mostrador) o crea uno nuevo
def _get_or_create_cliente(db: Session, nombre: str, correo: str) -> Cliente:
    cliente = db.query(Cliente).filter(Cliente.correo == correo).first()
    if cliente is None:
        cliente = Cliente(nombre=nombre, correo=correo)
        db.add(cliente)
        db.flush()
    return cliente

#Crea un usuario. Si es cliente, tambien crea o enlaza su registro en la tabla cliente
def create_user(
    db: Session,
    *,
    nombre: str,
    correo: str,
    password: Optional[str] = None,
    firebase_uid: Optional[str] = None,
    rol: str = "cliente",
) -> Usuario:
    correo = correo.lower()
    user = Usuario(
        firebase_uid=firebase_uid,
        nombre=nombre,
        correo=correo,
        password_hash=hash_password(password) if password else None,
        rol=rol,
    )
    if rol == "cliente":
        user.id_cliente = _get_or_create_cliente(db, nombre, correo).id_cliente
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

#Usuario creado por el admin. Se guarda un password_hash aleatorio que nadie conoce para cumplir el CHECK chk_usuario_auth. La persona entra luego por Firebase
# y el login por correo la vincula (firebase_uid se llena en el primer ingreso)
def invite_user(
    db: Session,
    *,
    nombre: str,
    correo: str,
    rol: str,
    id_empleado: Optional[int] = None,
) -> Usuario:
    correo = correo.lower()
    user = Usuario(
        nombre=nombre,
        correo=correo,
        rol=rol,
        id_empleado=id_empleado,
        password_hash=hash_password(secrets.token_urlsafe(32)),
    )
    if rol == "cliente":
        user.id_cliente = _get_or_create_cliente(db, nombre, correo).id_cliente
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

#Login local (admin o empleado creados con contrasena)
def authenticate_user(db: Session, correo: str, password: str) -> Optional[Usuario]:
    user = get_user_by_email(db, correo)
    if not user or not user.activo:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

#Firebase
#Busca por firebase_uid, luego por correo (solo si esta verificado) y,
#si no existe, crea un cliente nuevo
def login_with_firebase(db: Session, claims: dict, nombre: Optional[str]) -> Usuario:
    uid = claims["uid"]
    correo = (claims.get("email") or "").lower()
    if not correo:
        raise FirebaseAuthError("La cuenta de Firebase no tiene correo asociado")

    user = get_user_by_firebase_uid(db, uid)
    if user is not None:
        return user

    user = get_user_by_email(db, correo)
    if user is not None:
        if user.firebase_uid and user.firebase_uid != uid:
            raise FirebaseAuthError("Este correo ya está vinculado a otra cuenta")
        if not claims.get("email_verified"):
            raise FirebaseAuthError(
                "Debes verificar tu correo antes de vincular una cuenta existente"
            )
        user.firebase_uid = uid
        db.commit()
        db.refresh(user)
        return user

    display_name = (claims.get("name") or nombre or correo.split("@")[0]).strip()
    if len(display_name) < 2:
        display_name = correo.split("@")[0]
    return create_user(
        db, nombre=display_name, correo=correo, firebase_uid=uid, rol="cliente"
    )