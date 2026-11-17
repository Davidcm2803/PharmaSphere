from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base


class CasoEscalado(Base):
    """Caso que el copiloto de cliente deja para que un encargado lo atienda."""

    __tablename__ = "caso_escalado"
    __table_args__ = (
        CheckConstraint("nivel IN ('moderado', 'grave', 'emergencia')", name="ck_caso_nivel"),
        CheckConstraint("estado IN ('abierto', 'atendido', 'cerrado')", name="ck_caso_estado"),
        Index("idx_caso_usuario", "id_usuario"),
        Index("idx_caso_estado", "estado"),
    )

    id_caso: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("usuario.id_usuario"), nullable=False)
    nivel: Mapped[str] = mapped_column(String(20), nullable=False)
    motivo: Mapped[str] = mapped_column(String(200), nullable=False)
    mensaje_usuario: Mapped[str] = mapped_column(Text, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="abierto")
    id_empleado_atiende: Mapped[Optional[int]] = mapped_column(
        ForeignKey("empleado.id_empleado"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    usuario: Mapped["Usuario"] = relationship()
    empleado: Mapped[Optional["Empleado"]] = relationship()