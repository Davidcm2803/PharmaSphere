from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base


class Documento(Base):
    __tablename__ = "documento"

    id_documento: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo: Mapped[Optional[str]] = mapped_column(String(50))
    contenido: Mapped[Optional[str]] = mapped_column(Text)
    ruta: Mapped[Optional[str]] = mapped_column(String(500))
    indexado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    id_usuario: Mapped[Optional[int]] = mapped_column(ForeignKey("usuario.id_usuario"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    # Relaciones
    usuario: Mapped[Optional["Usuario"]] = relationship(back_populates="documentos")