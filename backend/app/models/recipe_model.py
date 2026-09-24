from __future__ import annotations

from datetime import date
from typing import Optional

from sqlalchemy import CheckConstraint, Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base


class Receta(Base):
    __tablename__ = "receta"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_receta_cantidad"),
        CheckConstraint(
            "estado IN ('vigente', 'usada', 'vencida')", name="ck_receta_estado"
        ),
    )

    id_receta: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_cliente: Mapped[int] = mapped_column(ForeignKey("cliente.id_cliente"), nullable=False)
    medico: Mapped[Optional[str]] = mapped_column(String(150))
    id_producto: Mapped[int] = mapped_column(ForeignKey("producto.id_producto"), nullable=False)
    cantidad: Mapped[int] = mapped_column(nullable=False, default=1)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, server_default=func.current_date())
    vigencia_hasta: Mapped[Optional[date]] = mapped_column(Date)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="vigente")
    archivo_url: Mapped[Optional[str]] = mapped_column(String(500))
    id_venta: Mapped[Optional[int]] = mapped_column(ForeignKey("venta.id_venta"))

    # Relaciones
    cliente: Mapped["Cliente"] = relationship(back_populates="recetas")
    producto: Mapped["Producto"] = relationship(back_populates="recetas")
    venta: Mapped[Optional["Venta"]] = relationship(back_populates="recetas")