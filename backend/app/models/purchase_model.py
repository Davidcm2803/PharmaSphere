from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base


class Compra(Base):
    __tablename__ = "compra"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('pendiente', 'recibida', 'cancelada')", name="ck_compra_estado"
        ),
        CheckConstraint("total >= 0", name="ck_compra_total"),
    )

    id_compra: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_proveedor: Mapped[int] = mapped_column(ForeignKey("proveedor.id_proveedor"), nullable=False)
    id_sucursal: Mapped[int] = mapped_column(ForeignKey("sucursal.id_sucursal"), nullable=False)
    id_usuario: Mapped[Optional[int]] = mapped_column(ForeignKey("usuario.id_usuario"))
    fecha: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    fecha_recepcion: Mapped[Optional[datetime]] = mapped_column(DateTime)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    # Relaciones
    proveedor: Mapped["Proveedor"] = relationship(back_populates="compras")
    sucursal: Mapped["Sucursal"] = relationship(back_populates="compras")
    usuario: Mapped[Optional["Usuario"]] = relationship(back_populates="compras")
    detalles: Mapped[List["DetalleCompra"]] = relationship(
        back_populates="compra", cascade="all, delete-orphan"
    )
    lotes: Mapped[List["Lote"]] = relationship(back_populates="compra")
    movimientos: Mapped[List["MovimientoInventario"]] = relationship(back_populates="compra")


class DetalleCompra(Base):
    __tablename__ = "detallecompra"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_detallecompra_cantidad"),
        CheckConstraint("costo_unitario >= 0", name="ck_detallecompra_costo"),
    )

    id_detallecompra: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_compra: Mapped[int] = mapped_column(
        ForeignKey("compra.id_compra", ondelete="CASCADE"), nullable=False
    )
    id_producto: Mapped[int] = mapped_column(ForeignKey("producto.id_producto"), nullable=False)
    cantidad: Mapped[int] = mapped_column(nullable=False)
    costo_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Relaciones
    compra: Mapped["Compra"] = relationship(back_populates="detalles")
    producto: Mapped["Producto"] = relationship(back_populates="detalles_compra")