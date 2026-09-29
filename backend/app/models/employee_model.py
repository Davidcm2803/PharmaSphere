from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base


class Empleado(Base):
    __tablename__ = "empleado"

    id_empleado: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    puesto: Mapped[Optional[str]] = mapped_column(String(100))
    id_sucursal: Mapped[Optional[int]] = mapped_column(ForeignKey("sucursal.id_sucursal"))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    # Relaciones
    sucursal: Mapped[Optional["Sucursal"]] = relationship(back_populates="empleados")
    usuario: Mapped[Optional["Usuario"]] = relationship(back_populates="empleado", uselist=False)
    ventas: Mapped[List["Venta"]] = relationship(back_populates="empleado")