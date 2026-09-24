from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base


class Producto(Base):
    __tablename__ = "producto"
    __table_args__ = (
        CheckConstraint("precio > 0", name="ck_producto_precio"),
        CheckConstraint("costo >= 0", name="ck_producto_costo"),
        Index("idx_producto_proveedor", "id_proveedor"),
        Index("idx_producto_nombre", "nombre"),
        Index("idx_producto_categoria", "categoria"),
    )

    id_producto: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(500))
    categoria: Mapped[Optional[str]] = mapped_column(String(100))
    precio: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    costo: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    requiere_receta: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    imagen_url: Mapped[Optional[str]] = mapped_column(String(500))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    id_proveedor: Mapped[Optional[int]] = mapped_column(ForeignKey("proveedor.id_proveedor"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relaciones
    proveedor: Mapped[Optional["Proveedor"]] = relationship(back_populates="productos")
    inventarios: Mapped[List["Inventario"]] = relationship(back_populates="producto")
    detalles_compra: Mapped[List["DetalleCompra"]] = relationship(back_populates="producto")
    lotes: Mapped[List["Lote"]] = relationship(back_populates="producto")
    detalles_venta: Mapped[List["DetalleVenta"]] = relationship(back_populates="producto")
    recetas: Mapped[List["Receta"]] = relationship(back_populates="producto")
    movimientos: Mapped[List["MovimientoInventario"]] = relationship(back_populates="producto")