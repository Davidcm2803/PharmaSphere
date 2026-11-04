from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DetalleCompraIn(BaseModel):
    id_producto: int
    cantidad: int = Field(gt=0)
    costo_unitario: Decimal = Field(ge=0, max_digits=10, decimal_places=2)


class CompraCreate(BaseModel):
    id_proveedor: int
    id_sucursal: int
    id_usuario: int | None = None
    detalles: list[DetalleCompraIn] = Field(min_length=1)

    @model_validator(mode="after")
    def sin_productos_repetidos(self):
        ids = [d.id_producto for d in self.detalles]
        if len(ids) != len(set(ids)):
            raise ValueError("Un producto no puede repetirse en la orden")
        return self


class LoteRecibido(BaseModel):
    numero_lote: str = Field(min_length=1, max_length=100)
    fecha_vencimiento: date
    cantidad: int = Field(gt=0)


class RecepcionLinea(BaseModel):
    id_producto: int
    lotes: list[LoteRecibido] = Field(min_length=1)


class CompraReceive(BaseModel):
    lineas: list[RecepcionLinea] = Field(min_length=1)


class DetalleCompraOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id_producto: int
    cantidad: int
    costo_unitario: Decimal


class CompraOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id_compra: int
    id_proveedor: int
    id_sucursal: int
    estado: str
    total: Decimal
    fecha: datetime
    fecha_recepcion: datetime | None
    detalles: list[DetalleCompraOut]


class LoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id_lote: int
    id_producto: int
    id_sucursal: int
    id_compra: int | None
    numero_lote: str
    fecha_vencimiento: date
    cantidad: int


class RecepcionOut(BaseModel):
    compra: CompraOut
    lotes: list[LoteOut]