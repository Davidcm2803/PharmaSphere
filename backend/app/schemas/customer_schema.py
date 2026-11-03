from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Correo simple (sin depender de email-validator): algo@dominio.ext
_CORREO = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


def _strip(value):
    return value.strip() if isinstance(value, str) else value


def _blank_to_none(value):
    value = _strip(value)
    return value or None


# Campos que el empleado o admin envía al registrar un cliente (por ejemplo desde el POS)
class CustomerCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    cedula: Optional[str] = Field(default=None, max_length=50)
    telefono: Optional[str] = Field(default=None, max_length=50)
    correo: Optional[str] = Field(default=None, max_length=150, pattern=_CORREO)
    direccion: Optional[str] = Field(default=None, max_length=255)

    _strip_nombre = field_validator("nombre", mode="before")(_strip)
    _blank = field_validator("cedula", "telefono", "correo", "direccion", mode="before")(
        _blank_to_none
    )


# Todo opcional: solo se cambia lo que se envía. En campos con texto, "" equivale a null
class CustomerUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=150)
    cedula: Optional[str] = Field(default=None, max_length=50)
    telefono: Optional[str] = Field(default=None, max_length=50)
    correo: Optional[str] = Field(default=None, max_length=150, pattern=_CORREO)
    direccion: Optional[str] = Field(default=None, max_length=255)

    _blank = field_validator(
        "nombre", "cedula", "telefono", "correo", "direccion", mode="before"
    )(_blank_to_none)


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_cliente: int
    nombre: str
    cedula: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    direccion: Optional[str] = None
    created_at: Optional[datetime] = None