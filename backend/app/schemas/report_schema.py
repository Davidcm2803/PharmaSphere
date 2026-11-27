from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel


class SucursalVentasOut(BaseModel):
    id_sucursal: int
    nombre: str
    ventas: int
    total: float
    ganancia: float
    pct: float


class ProductoVendidoOut(BaseModel):
    id_producto: int
    nombre: str
    categoria: Optional[str] = None
    unidades: int
    ingresos: float
    costo: float
    ganancia: float


class GananciaOut(BaseModel):
    desde: date
    hasta: date
    id_sucursal: Optional[int] = None
    ventas: int
    ingresos: float
    costo: float
    ganancia: float
    margen_pct: float


class StockBajoOut(BaseModel):
    id_producto: int
    nombre: str
    categoria: Optional[str] = None
    id_sucursal: int
    sucursal: str
    cantidad: int
    stock_minimo: int
    faltante: int


class LoteVencimientoOut(BaseModel):
    id_lote: int
    id_producto: int
    nombre: str
    numero_lote: str
    id_sucursal: int
    sucursal: str
    fecha_vencimiento: date
    dias_restantes: int
    cantidad: int
    estado: Literal["vencido", "por_vencer"]
