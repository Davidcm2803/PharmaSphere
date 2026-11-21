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


class VentanaOut(BaseModel):
    desde: date
    hasta: date


class CalculoReposicionOut(BaseModel):
    dias_ventana: int
    dias_cobertura: int
    demanda_cobertura: int
    stock_objetivo: int


class ReposicionItemOut(BaseModel):
    id_producto: int
    nombre: str
    categoria: Optional[str] = None
    id_sucursal: int
    sucursal: str
    stock_actual: int
    stock_minimo: int
    vendido_reciente: int
    vendido_previo: int
    promedio_diario: float
    promedio_semanal: float
    promedio_mensual: float
    tendencia: Literal["sube", "baja", "estable", "sin_ventas"]
    variacion_pct: Optional[float] = None
    dias_de_stock: Optional[float] = None
    cantidad_sugerida: int
    prioridad: Literal["alta", "media", "baja"]
    calculo: CalculoReposicionOut
    explicacion: str


class ResumenReposicionOut(BaseModel):
    analizados: int
    requieren_reposicion: int
    prioridad_alta: int
    unidades_sugeridas: int


class PronosticoOut(BaseModel):
    al: date
    semanas: int
    dias_cobertura: int
    ventana_reciente: VentanaOut
    ventana_previa: VentanaOut
    resumen: ResumenReposicionOut
    items: list[ReposicionItemOut]
