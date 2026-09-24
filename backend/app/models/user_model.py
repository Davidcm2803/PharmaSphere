from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base


class Usuario(Base):
    __tablename__ = "usuario"
    __table_args__ = (
        CheckConstraint(
            "firebase_uid IS NOT NULL OR password_hash IS NOT NULL",
            name="chk_usuario_auth",
        ),
        CheckConstraint("rol IN ('admin', 'empleado', 'cliente')", name="ck_usuario_rol"),
        Index("idx_usuario_cliente", "id_cliente"),
        Index("idx_usuario_empleado", "id_empleado"),
    )

    id_usuario: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    firebase_uid: Mapped[Optional[str]] = mapped_column(String(128), unique=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255))
    correo: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    nombre: Mapped[Optional[str]] = mapped_column(String(150))
    rol: Mapped[str] = mapped_column(String(20), nullable=False, default="cliente")
    id_cliente: Mapped[Optional[int]] = mapped_column(ForeignKey("cliente.id_cliente"))
    id_empleado: Mapped[Optional[int]] = mapped_column(ForeignKey("empleado.id_empleado"))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    # Relaciones
    cliente: Mapped[Optional["Cliente"]] = relationship(back_populates="usuario")
    empleado: Mapped[Optional["Empleado"]] = relationship(back_populates="usuario")
    compras: Mapped[List["Compra"]] = relationship(back_populates="usuario")
    movimientos: Mapped[List["MovimientoInventario"]] = relationship(back_populates="usuario")
    documentos: Mapped[List["Documento"]] = relationship(back_populates="usuario")