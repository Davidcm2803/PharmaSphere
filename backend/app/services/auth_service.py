from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user_model import Usuario
from app.schemas.user_schema import UserRegister

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------- Contraseñas ----------
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    # Un usuario de Firebase no tiene password_hash
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


# ---------- Tokens JWT ----------
def create_access_token(user: Usuario) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": str(user.id_usuario), "rol": user.rol, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> Optional[dict]:
    """Devuelve el payload o None si el token es inválido o expiró."""
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None


# ---------- Usuarios ----------
def get_user_by_email(db: Session, correo: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.correo == correo.lower()).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.id_usuario == user_id).first()


def create_user(db: Session, data: UserRegister, rol: str = "cliente") -> Usuario:
    user = Usuario(
        firebase_uid=data.firebase_uid,
        nombre=data.nombre,
        correo=data.correo.lower(),
        password_hash=hash_password(data.password),
        rol=rol,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, correo: str, password: str) -> Optional[Usuario]:
    user = get_user_by_email(db, correo)
    if not user or not user.activo:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user