from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRole(str, Enum):
    admin = "admin"
    empleado = "empleado"
    cliente = "cliente"


class UserBase(BaseModel):
    """Perfil de usuario. Sirve para registro manual y para usuarios de Firebase."""

    firebase_uid: Optional[str] = Field(default=None, max_length=128)
    correo: EmailStr
    nombre: str = Field(min_length=2, max_length=150)


class UserRegister(UserBase):
    """Body de POST /auth/register. El rol NO se recibe: siempre nace como cliente."""

    password: str = Field(min_length=8, max_length=72)


class UserLogin(BaseModel):
    """Body de POST /auth/login."""

    correo: EmailStr
    password: str = Field(min_length=1, max_length=72)


class UserOut(UserBase):
    """Lo que devolvemos al front (nunca incluye la contraseña)."""

    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    rol: UserRole
    activo: bool
    creado_en: Optional[datetime] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut