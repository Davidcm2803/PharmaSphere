from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.product_schema import Money

MAX_ITEMS = 50
MAX_QTY_ITEM = 100


class SaleItemIn(BaseModel):
    id_producto: int = Field(ge=1)
    cantidad: int = Field(ge=1, le=MAX_QTY_ITEM)


# Base común: sucursal + carrito. El precio y el total nunca vienen del frontend
class _CarritoBase(BaseModel):
    id_sucursal: int = Field(ge=1, description="Sucursal donde se retira o se vende")
    items: List[SaleItemIn] = Field(min_length=1, max_length=MAX_ITEMS)

    @model_validator(mode="after")
    def _no_repeated_products(self):
        ids = [item.id_producto for item in self.items]
        if len(ids) != len(set(ids)):
            raise ValueError("Cada producto debe aparecer una sola vez")
        return self


def _blank_to_none(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


# Body de POST /sales (online). El cliente sale del token
class SaleCreate(_CarritoBase):
    # Datos del cliente del checkout: si vienen, se guardan en su perfil
    telefono: Optional[str] = Field(None, max_length=50)
    cedula: Optional[str] = Field(None, max_length=50)

    _limpiar = field_validator("telefono", "cedula", mode="before")(_blank_to_none)


# Body de POST /sales/mostrador (empleado/admin). El cliente es opcional y se busca por cédula
class SaleCounterCreate(_CarritoBase):
    cedula_cliente: Optional[str] = Field(None, max_length=50)
    metodo_pago: Literal["efectivo", "tarjeta"] = "efectivo"
    tarjeta_ultimos_4: Optional[str] = Field(None, pattern=r"^\d{4}$")

    _limpiar = field_validator("cedula_cliente", "tarjeta_ultimos_4", mode="before")(_blank_to_none)

    @model_validator(mode="after")
    def _tarjeta_solo_con_tarjeta(self):
        if self.tarjeta_ultimos_4 and self.metodo_pago != "tarjeta":
            raise ValueError("Los últimos 4 dígitos solo aplican al pago con tarjeta")
        return self


class SaleItemOut(BaseModel):
    id_producto: int
    nombre: str
    imagen_url: Optional[str] = None
    cantidad: int
    precio_unitario: Money
    subtotal: Money


# Lo que ve el cliente en sus pedidos
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


# Lo que ve el panel (admin/empleado): agrega cliente y empleado
class SaleAdminOut(SaleOut):
    id_cliente: Optional[int] = None
    cliente_nombre: Optional[str] = None
    cliente_cedula: Optional[str] = None
    id_empleado: Optional[int] = None
    tarjeta_ultimos_4: Optional[str] = None