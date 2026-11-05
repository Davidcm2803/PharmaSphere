from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.purchase_schema import LoteOut

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
    cantidad: int = Field(0, ge=-MAX_QTY, le=MAX_QTY, description="Positivo suma, negativo resta, 0 = sin cambio")
    motivo: Optional[str] = Field(None, max_length=255)
    stock_minimo: Optional[int] = Field(None, ge=0, le=MAX_QTY, description="Nuevo stock mínimo (opcional)")

    @field_validator("motivo", mode="before")
    @classmethod
    def _strip_motivo(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @model_validator(mode="after")
    def _validate_adjust(self):
        if self.cantidad == 0 and self.stock_minimo is None:
            raise ValueError("Indica una cantidad distinta de 0 o un nuevo stock mínimo")
        if self.cantidad != 0 and (not self.motivo or len(self.motivo) < 3):
            raise ValueError("El motivo es obligatorio (mínimo 3 caracteres) al ajustar la cantidad")
        return self


class StockAddIn(BaseModel):
    """Alta de un producto en el inventario de una sucursal."""

    id_producto: int = Field(ge=1)
    id_sucursal: int = Field(ge=1)
    cantidad: int = Field(0, ge=0, le=MAX_QTY)
    stock_minimo: int = Field(0, ge=0, le=MAX_QTY)
    motivo: Optional[str] = Field(None, max_length=200)

    @field_validator("motivo", mode="before")
    @classmethod
    def _strip_motivo(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v


class ProductoSinInventarioOut(BaseModel):
    id_producto: int
    nombre: str
    categoria: Optional[str] = None


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


class LoteVencimientoOut(LoteOut):
    nombre_producto: str
    dias_para_vencer: int  # negativo si ya venció