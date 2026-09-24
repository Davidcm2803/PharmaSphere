from __future__ import annotations

from sqlalchemy import CheckConstraint, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Inventario(Base):
    __tablename__ = "inventario"
    __table_args__ = (
        UniqueConstraint("id_producto", "id_sucursal", name="uq_inventario_producto_sucursal"),
        CheckConstraint("cantidad >= 0", name="ck_inventario_cantidad"),
        CheckConstraint("stock_minimo >= 0", name="ck_inventario_stock_minimo"),
    )

    id_inventario: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_producto: Mapped[int] = mapped_column(ForeignKey("producto.id_producto"), nullable=False)
    id_sucursal: Mapped[int] = mapped_column(ForeignKey("sucursal.id_sucursal"), nullable=False)
    cantidad: Mapped[int] = mapped_column(nullable=False, default=0)
    stock_minimo: Mapped[int] = mapped_column(nullable=False, default=0)

    # Relaciones
    producto: Mapped["Producto"] = relationship(back_populates="inventarios")
    sucursal: Mapped["Sucursal"] = relationship(back_populates="inventarios")