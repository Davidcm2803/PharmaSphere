from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base


class Lote(Base):
    __tablename__ = "lote"
    __table_args__ = (
        UniqueConstraint(
            "id_producto",
            "id_sucursal",
            "numero_lote",
            name="lote_id_producto_id_sucursal_numero_lote_key",
        ),
        CheckConstraint("cantidad >= 0", name="ck_lote_cantidad"),
        Index("idx_lote_producto", "id_producto"),
        Index("idx_lote_vencimiento", "fecha_vencimiento"),
    )

    id_lote: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_producto: Mapped[int] = mapped_column(ForeignKey("producto.id_producto"), nullable=False)
    id_sucursal: Mapped[int] = mapped_column(ForeignKey("sucursal.id_sucursal"), nullable=False)
    id_compra: Mapped[Optional[int]] = mapped_column(ForeignKey("compra.id_compra"))
    numero_lote: Mapped[str] = mapped_column(String(100), nullable=False)
    fecha_vencimiento: Mapped[date] = mapped_column(Date, nullable=False)
    cantidad: Mapped[int] = mapped_column(nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    # Relaciones
    producto: Mapped["Producto"] = relationship(back_populates="lotes")
    sucursal: Mapped["Sucursal"] = relationship(back_populates="lotes")
    compra: Mapped[Optional["Compra"]] = relationship(back_populates="lotes")
    movimientos: Mapped[List["MovimientoInventario"]] = relationship(back_populates="lote")