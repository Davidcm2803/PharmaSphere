from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base


class Cliente(Base):
    __tablename__ = "cliente"

    id_cliente: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    cedula: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(50))
    correo: Mapped[Optional[str]] = mapped_column(String(150), unique=True)
    direccion: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    # Relaciones
    usuario: Mapped[Optional["Usuario"]] = relationship(back_populates="cliente", uselist=False)
    ventas: Mapped[List["Venta"]] = relationship(back_populates="cliente")
    recetas: Mapped[List["Receta"]] = relationship(back_populates="cliente")