from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.product_schema import Money


def _strip(value):
    return value.strip() if isinstance(value, str) else value


def _blank_to_none(value):
    value = _strip(value)
    return None if value == "" else value


def _correo(value):
    value = _blank_to_none(value)
    if isinstance(value, str):
        if len(value) > 150:
            raise ValueError("El correo no puede superar 150 caracteres")
        return value.lower()
    return value


# Campos que se envian al crear un cliente (en mostrador o desde el panel)
class CustomerCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    cedula: Optional[str] = Field(default=None, max_length=50)
    telefono: Optional[str] = Field(default=None, max_length=50)
    correo: Optional[EmailStr] = None
    direccion: Optional[str] = Field(default=None, max_length=255)

    _strip_nombre = field_validator("nombre", mode="before")(_strip)
    _blank_texts = field_validator("cedula", "telefono", "direccion", mode="before")(_blank_to_none)
    _norm_correo = field_validator("correo", mode="before")(_correo)


# Todos los campos son opcionales: solo se cambia lo que se envia
class CustomerUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=150)
    cedula: Optional[str] = Field(default=None, max_length=50)
    telefono: Optional[str] = Field(default=None, max_length=50)
    correo: Optional[EmailStr] = None
    direccion: Optional[str] = Field(default=None, max_length=255)

    _blank_texts = field_validator(
        "nombre", "cedula", "telefono", "direccion", mode="before"
    )(_blank_to_none)
    _norm_correo = field_validator("correo", mode="before")(_correo)


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_cliente: int
    nombre: str
    cedula: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    direccion: Optional[str] = None
    created_at: Optional[datetime] = None


class SaleItemOut(BaseModel):
    id_producto: int
    producto_nombre: str
    cantidad: int
    precio_unitario: Money
    subtotal: Money


# Una compra del historial del cliente, con sus productos
class CustomerSaleOut(BaseModel):
    id_venta: int
    fecha: datetime
    id_sucursal: int
    sucursal_nombre: str
    tipo: str
    estado: str
    metodo_pago: Optional[str] = None
    total: Money
    items: List[SaleItemOut]
