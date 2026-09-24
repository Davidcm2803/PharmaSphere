from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base

TIPOS_MOVIMIENTO = (
    "venta",
    "compra",
    "ajuste",
    "transferencia_entrada",
    "transferencia_salida",
    "vencimiento",
)

class MovimientoInventario(Base):
    __tablename__ = "movimiento_inventario"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('venta','compra','ajuste','transferencia_entrada',"
            "'transferencia_salida','vencimiento')",
            name="ck_movimiento_tipo",
        ),
        CheckConstraint("cantidad <> 0", name="ck_movimiento_cantidad"),
    )

    id_movimiento: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_producto: Mapped[int] = mapped_column(ForeignKey("producto.id_producto"), nullable=False)
    id_sucursal: Mapped[int] = mapped_column(ForeignKey("sucursal.id_sucursal"), nullable=False)
    id_lote: Mapped[Optional[int]] = mapped_column(ForeignKey("lote.id_lote"))
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    cantidad: Mapped[int] = mapped_column(nullable=False)
    motivo: Mapped[Optional[str]] = mapped_column(String(255))
    id_usuario: Mapped[Optional[int]] = mapped_column(ForeignKey("usuario.id_usuario"))
    id_venta: Mapped[Optional[int]] = mapped_column(ForeignKey("venta.id_venta"))
    id_compra: Mapped[Optional[int]] = mapped_column(ForeignKey("compra.id_compra"))
    fecha: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    # Relaciones
    producto: Mapped["Producto"] = relationship(back_populates="movimientos")
    sucursal: Mapped["Sucursal"] = relationship(back_populates="movimientos")
    lote: Mapped[Optional["Lote"]] = relationship(back_populates="movimientos")
    usuario: Mapped[Optional["Usuario"]] = relationship(back_populates="movimientos")
    venta: Mapped[Optional["Venta"]] = relationship(back_populates="movimientos")
    compra: Mapped[Optional["Compra"]] = relationship(back_populates="movimientos")