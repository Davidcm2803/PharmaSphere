from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator

MAX_QTY = 1_000_000


class InventoryItemOut(BaseModel):
    id_inventario: Optional[int] = None  # None si el producto nunca se registró ahí
    id_producto: int
    producto_nombre: str
    categoria: Optional[str] = None
    id_sucursal: int
    sucursal_nombre: str
    cantidad: int
    stock_minimo: int
    stock_bajo: bool


class StockAdjustIn(BaseModel):
    id_producto: int = Field(ge=1)
    id_sucursal: int = Field(ge=1)
    cantidad: int = Field(ge=-MAX_QTY, le=MAX_QTY, description="Positivo suma, negativo resta")
    motivo: str = Field(min_length=3, max_length=255)

    @field_validator("motivo", mode="before")
    @classmethod
    def _strip_motivo(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("cantidad")
    @classmethod
    def _not_zero(cls, v: int) -> int:
        if v == 0:
            raise ValueError("La cantidad no puede ser 0")
        return v


class StockTransferIn(BaseModel):
    id_producto: int = Field(ge=1)
    id_origen: int = Field(ge=1)
    id_destino: int = Field(ge=1)
    cantidad: int = Field(gt=0, le=MAX_QTY)
    motivo: Optional[str] = Field(None, max_length=200)

    @field_validator("motivo", mode="before")
    @classmethod
    def _strip_motivo(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @model_validator(mode="after")
    def _different_branches(self):
        if self.id_origen == self.id_destino:
            raise ValueError("La sucursal de origen y destino deben ser distintas")
        return self


class StockTransferOut(BaseModel):
    id_producto: int
    producto_nombre: str
    id_origen: int
    id_destino: int
    cantidad: int
    stock_origen: int
    stock_destino: int