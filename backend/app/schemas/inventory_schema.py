from datetime import date
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
    proximo_vencimiento: Optional[date] = None  # lote con stock que vence primero
    lotes_cantidad: Optional[int] = None  # suma de unidades en lotes
    lotes_con_stock: Optional[int] = None  # cantidad de lotes con unidades


class StockAdjustIn(BaseModel):
    id_producto: int = Field(ge=1)
    id_sucursal: int = Field(ge=1)
    cantidad: int = Field(0, ge=-MAX_QTY, le=MAX_QTY, description="Positivo suma, negativo resta, 0 = sin cambio")
    motivo: Optional[str] = Field(None, max_length=255)
    stock_minimo: Optional[int] = Field(None, ge=0, le=MAX_QTY, description="Nuevo stock mínimo (opcional)")
    numero_lote: Optional[str] = Field(None, max_length=100, description="Obligatorio si cantidad > 0")
    fecha_vencimiento: Optional[date] = Field(None, description="Obligatorio si cantidad > 0")
    id_lote: Optional[int] = Field(None, ge=1, description="Opcional si cantidad < 0: lote del que restar")

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
        if self.numero_lote is not None:
            self.numero_lote = self.numero_lote.strip() or None
        if self.cantidad > 0 and (not self.numero_lote or not self.fecha_vencimiento):
            raise ValueError("Para sumar stock indica número de lote y fecha de vencimiento")
        return self


class StockAddIn(BaseModel):
    """Alta de un producto en el inventario de una sucursal."""

    id_producto: int = Field(ge=1)
    id_sucursal: int = Field(ge=1)
    cantidad: int = Field(0, ge=0, le=MAX_QTY)
    stock_minimo: int = Field(0, ge=0, le=MAX_QTY)
    numero_lote: Optional[str] = Field(None, max_length=100, description="Obligatorio si cantidad > 0")
    fecha_vencimiento: Optional[date] = Field(None, description="Obligatorio si cantidad > 0")
    motivo: Optional[str] = Field(None, max_length=200)

    @field_validator("motivo", mode="before")
    @classmethod
    def _strip_motivo(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @model_validator(mode="after")
    def _lote_si_hay_stock(self):
        if self.numero_lote is not None:
            self.numero_lote = self.numero_lote.strip() or None
        if self.cantidad > 0 and (not self.numero_lote or not self.fecha_vencimiento):
            raise ValueError("Con cantidad inicial indica número de lote y fecha de vencimiento")
        return self


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


class LoteUpdateIn(BaseModel):
    """Corrección de un lote (número o vencimiento). El motivo es obligatorio."""

    numero_lote: Optional[str] = Field(None, max_length=100)
    fecha_vencimiento: Optional[date] = None
    motivo: str = Field(min_length=3, max_length=255)

    @field_validator("numero_lote", "motivo", mode="before")
    @classmethod
    def _strip(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @model_validator(mode="after")
    def _algo_que_cambiar(self):
        if not self.numero_lote and not self.fecha_vencimiento:
            raise ValueError("Indica el nuevo número de lote o la nueva fecha de vencimiento")
        return self


class LoteWriteOffIn(BaseModel):
    """Baja de unidades de un lote (vencido, dañado, retiro...). Sin cantidad = todo el lote."""

    cantidad: Optional[int] = Field(None, gt=0, le=MAX_QTY)
    motivo: str = Field(min_length=3, max_length=255)

    @field_validator("motivo", mode="before")
    @classmethod
    def _strip_motivo(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v
