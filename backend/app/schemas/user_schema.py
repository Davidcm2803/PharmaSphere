from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRole(str, Enum):
    admin = "admin"
    empleado = "empleado"
    cliente = "cliente"

#Perfil base de usuario. Lo comparten el registro, la invitacion del admin y la respuesta
class UserBase(BaseModel):
    correo: EmailStr
    nombre: str = Field(min_length=2, max_length=150)

#Body de POST /auth/register. El rol NO se recibe: siempre nace como cliente
class UserRegister(UserBase):
    password: str = Field(min_length=8, max_length=72)

#Body de POST /auth/users. Solo lo usa el admin para dar acceso a una persona por correo
class UserCreateAdmin(UserBase):
    rol: UserRole
    id_empleado: Optional[int] = None


class UserLogin(BaseModel):
    correo: EmailStr
    password: str = Field(min_length=1, max_length=72)

#Body de POST /auth/firebase. El uid sale del token verificado, nunca del body
class FirebaseLogin(BaseModel):
    id_token: str = Field(min_length=10)
    nombre: Optional[str] = Field(default=None, max_length=150)

#Lo que devolvemos al front (nunca incluye la contrasena)
class UserOut(UserBase):

    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    rol: UserRole
    activo: bool
    id_cliente: Optional[int] = None
    created_at: Optional[datetime] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut