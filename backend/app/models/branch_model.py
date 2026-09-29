from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base


class Sucursal(Base):
    __tablename__ = "sucursal"

    id_sucursal: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    direccion: Mapped[Optional[str]] = mapped_column(String(255))
    telefono: Mapped[Optional[str]] = mapped_column(String(50))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    # Relaciones
    empleados: Mapped[List["Empleado"]] = relationship(back_populates="sucursal")
    inventarios: Mapped[List["Inventario"]] = relationship(back_populates="sucursal")
    compras: Mapped[List["Compra"]] = relationship(back_populates="sucursal")
    lotes: Mapped[List["Lote"]] = relationship(back_populates="sucursal")
    ventas: Mapped[List["Venta"]] = relationship(back_populates="sucursal")
    movimientos: Mapped[List["MovimientoInventario"]] = relationship(back_populates="sucursal")