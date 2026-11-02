from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.product_schema import Money

MAX_ITEMS = 50
MAX_QTY_ITEM = 100


class SaleItemIn(BaseModel):
    id_producto: int = Field(ge=1)
    cantidad: int = Field(ge=1, le=MAX_QTY_ITEM)


#Body de POST /sales. El cliente sale del token, el precio y el total los calcula el servidor
class SaleCreate(BaseModel):
    id_sucursal: int = Field(ge=1, description="Sucursal donde retira el pedido")
    items: List[SaleItemIn] = Field(min_length=1, max_length=MAX_ITEMS)
    # Datos del cliente del checkout: si vienen, se guardan en su perfil
    telefono: Optional[str] = Field(None, max_length=50)
    cedula: Optional[str] = Field(None, max_length=50)

    @field_validator("telefono", "cedula", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @model_validator(mode="after")
    def _no_repeated_products(self):
        ids = [item.id_producto for item in self.items]
        if len(ids) != len(set(ids)):
            raise ValueError("Cada producto debe aparecer una sola vez")
        return self


class SaleItemOut(BaseModel):
    id_producto: int
    nombre: str
    imagen_url: Optional[str] = None
    cantidad: int
    precio_unitario: Money
    subtotal: Money


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_venta: int
    fecha: datetime
    estado: str
    tipo: str
    metodo_pago: Optional[str] = None
    total: Money
    id_sucursal: int
    sucursal_nombre: str
    items: List[SaleItemOut]