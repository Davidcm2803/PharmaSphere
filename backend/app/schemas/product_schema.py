from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer, field_validator

#Los precios salen como número en el JSON (por defecto Pydantic serializa Decimal como texto)
Money = Annotated[
    Decimal, PlainSerializer(lambda v: float(v), return_type=float, when_used="json")
]


class ProductSort(str, Enum):
    nombre = "nombre"
    precio_asc = "precio_asc"
    precio_desc = "precio_desc"
    recientes = "recientes"


def _strip(value):
    return value.strip() if isinstance(value, str) else value

#Campos que el admin puede enviar al crear un producto
class ProductCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    categoria: Optional[str] = Field(default=None, max_length=100)
    precio: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    costo: Decimal = Field(default=Decimal("0"), ge=0, max_digits=10, decimal_places=2)
    requiere_receta: bool = False
    imagen_url: Optional[str] = Field(default=None, max_length=500)
    id_proveedor: Optional[int] = Field(default=None, ge=1)

    _strip_texts = field_validator("nombre", "descripcion", "categoria", mode="before")(_strip)

#Todos los campos son opcionales: solo se cambia lo que se envia
class ProductUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=150)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    categoria: Optional[str] = Field(default=None, max_length=100)
    precio: Optional[Decimal] = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    costo: Optional[Decimal] = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    requiere_receta: Optional[bool] = None
    imagen_url: Optional[str] = Field(default=None, max_length=500)
    id_proveedor: Optional[int] = Field(default=None, ge=1)
    activo: Optional[bool] = None

    _strip_texts = field_validator("nombre", "descripcion", "categoria", mode="before")(_strip)

#Este se ve en cliente y no incluye costo ni datos internos
class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_producto: int
    nombre: str
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    precio: Money
    requiere_receta: bool
    imagen_url: Optional[str] = None
    id_proveedor: Optional[int] = None
    stock_total: int = 0

#Lo que ve el admin
class ProductAdminOut(ProductOut):
    costo: Money
    activo: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None