from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

MAX_CANTIDAD = 1000


def _blank_to_none(value):
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def _check_archivo(value):
    value = _blank_to_none(value)
    if value is None:
        return None
    if not value.startswith(("http://", "https://", "/static/")):
        raise ValueError("El archivo debe ser una URL http(s) o una ruta /static/")
    return value


# Una receta es de UN producto y de UN cliente. Nace siempre "vigente"
class RecipeCreate(BaseModel):
    id_cliente: int = Field(ge=1)
    id_producto: int = Field(ge=1)
    cantidad: int = Field(default=1, ge=1, le=MAX_CANTIDAD)
    medico: Optional[str] = Field(default=None, max_length=150)
    fecha: Optional[date] = Field(default=None, description="Por defecto, hoy")
    vigencia_hasta: Optional[date] = None
    archivo_url: Optional[str] = Field(default=None, max_length=500)

    _blank = field_validator("medico", mode="before")(_blank_to_none)
    _archivo = field_validator("archivo_url", mode="before")(_check_archivo)


# Todo opcional. Cliente y producto no se cambian (se crea otra receta).
# "usada" no se puede poner a mano: solo la deja así una venta
class RecipeUpdate(BaseModel):
    cantidad: Optional[int] = Field(default=None, ge=1, le=MAX_CANTIDAD)
    medico: Optional[str] = Field(default=None, max_length=150)
    fecha: Optional[date] = None
    vigencia_hasta: Optional[date] = None
    archivo_url: Optional[str] = Field(default=None, max_length=500)
    estado: Optional[Literal["vigente", "vencida"]] = None

    _blank = field_validator("medico", mode="before")(_blank_to_none)
    _archivo = field_validator("archivo_url", mode="before")(_check_archivo)


class RecipeOut(BaseModel):
    id_receta: int
    id_cliente: int
    cliente_nombre: str
    cliente_cedula: Optional[str] = None
    id_producto: int
    producto_nombre: str
    medico: Optional[str] = None
    cantidad: int
    fecha: date
    vigencia_hasta: Optional[date] = None
    # Estado real: una receta "vigente" cuya fecha ya pasó se muestra como "vencida"
    estado: str
    archivo_url: Optional[str] = None
    id_venta: Optional[int] = None