from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base


class Venta(Base):
    __tablename__ = "venta"
    __table_args__ = (
        CheckConstraint("tipo IN ('online', 'mostrador')", name="ck_venta_tipo"),
        CheckConstraint(
            "estado IN ('pendiente', 'pagada', 'retirada', 'cancelada')", name="ck_venta_estado"
        ),
        CheckConstraint("total >= 0", name="ck_venta_total"),
    )

    id_venta: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    fecha: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    id_sucursal: Mapped[int] = mapped_column(ForeignKey("sucursal.id_sucursal"), nullable=False)
    id_empleado: Mapped[Optional[int]] = mapped_column(ForeignKey("empleado.id_empleado"))
    id_cliente: Mapped[Optional[int]] = mapped_column(ForeignKey("cliente.id_cliente"))
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, default="mostrador")
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pagada")
    metodo_pago: Mapped[Optional[str]] = mapped_column(String(50))
    tarjeta_ultimos_4: Mapped[Optional[str]] = mapped_column(String(4))

    # Relaciones
    sucursal: Mapped["Sucursal"] = relationship(back_populates="ventas")
    empleado: Mapped[Optional["Empleado"]] = relationship(back_populates="ventas")
    cliente: Mapped[Optional["Cliente"]] = relationship(back_populates="ventas")
    detalles: Mapped[List["DetalleVenta"]] = relationship(
        back_populates="venta", cascade="all, delete-orphan"
    )
    recetas: Mapped[List["Receta"]] = relationship(back_populates="venta")
    movimientos: Mapped[List["MovimientoInventario"]] = relationship(back_populates="venta")


class DetalleVenta(Base):
    __tablename__ = "detalleventa"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_detalleventa_cantidad"),
        CheckConstraint("precio_unitario >= 0", name="ck_detalleventa_precio"),
    )

    id_detalleventa: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_venta: Mapped[int] = mapped_column(
        ForeignKey("venta.id_venta", ondelete="CASCADE"), nullable=False
    )
    id_producto: Mapped[int] = mapped_column(ForeignKey("producto.id_producto"), nullable=False)
    cantidad: Mapped[int] = mapped_column(nullable=False)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Relaciones
    venta: Mapped["Venta"] = relationship(back_populates="detalles")
    producto: Mapped["Producto"] = relationship(back_populates="detalles_venta")