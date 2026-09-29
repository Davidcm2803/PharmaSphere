from sqlalchemy import Boolean, Column, DateTime, Integer, String, func

from app.db.session import Base


class Usuario(Base):
    __tablename__ = "usuario"

    id_usuario = Column(Integer, primary_key=True, index=True)
    # Opcional: solo se llena si el usuario viene de Firebase
    firebase_uid = Column(String(128), unique=True, nullable=True, index=True)
    nombre = Column(String(150), nullable=False)
    correo = Column(String(150), unique=True, nullable=False, index=True)
    # Opcional: un usuario de Firebase no tiene contraseña propia
    password_hash = Column(String(255), nullable=True)
    rol = Column(String(20), nullable=False, default="cliente")
    activo = Column(Boolean, nullable=False, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())