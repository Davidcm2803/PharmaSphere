from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

_EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


def _strip(value):
    return value.strip() if isinstance(value, str) else value

#Los campos opcionales vacios ("" o solo espacios) se guardan como null
def _blank_to_none(value):
    if isinstance(value, str):
        return value.strip() or None
    return value

#Campos que el admin puede enviar al crear un proveedor
class SupplierCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    contacto: Optional[str] = Field(default=None, max_length=150)
    telefono: Optional[str] = Field(default=None, max_length=50)
    correo: Optional[str] = Field(default=None, max_length=150, pattern=_EMAIL)

    _strip_nombre = field_validator("nombre", mode="before")(_strip)
    _blank_texts = field_validator("contacto", "telefono", "correo", mode="before")(_blank_to_none)

    @field_validator("nombre")
    @classmethod
    def _nombre_min(cls, v: str) -> str:
        if len(v) < 2:
            raise ValueError("Mínimo 2 caracteres")
        return v

class SupplierUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=150)
    contacto: Optional[str] = Field(default=None, max_length=150)
    telefono: Optional[str] = Field(default=None, max_length=50)
    correo: Optional[str] = Field(default=None, max_length=150, pattern=_EMAIL)
    activo: Optional[bool] = None