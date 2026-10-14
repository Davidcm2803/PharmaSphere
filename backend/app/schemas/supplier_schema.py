from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _clean(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v = v.strip()
    return v or None


class SupplierBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    contacto: Optional[str] = Field(None, max_length=150)
    telefono: Optional[str] = Field(None, max_length=50)
    correo: Optional[str] = Field(None, max_length=150, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

    @field_validator("nombre")
    @classmethod
    def _nombre(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Mínimo 2 caracteres")
        return v

    @field_validator("contacto", "telefono", "correo", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        return _clean(v) if isinstance(v, str) else v


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    """Actualización parcial: solo cambia lo que se envía."""
    nombre: Optional[str] = Field(None, min_length=2, max_length=150)
    contacto: Optional[str] = Field(None, max_length=150)
    telefono: Optional[str] = Field(None, max_length=50)
    correo: Optional[str] = Field(None, max_length=150, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    activo: Optional[bool] = None

    @field_validator("nombre", "contacto", "telefono", "correo", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v


class SupplierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_proveedor: int
    nombre: str
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    activo: bool
    created_at: datetime


class SupplierOption(BaseModel):
    """Versión mínima para llenar dropdowns."""
    model_config = ConfigDict(from_attributes=True)

    id_proveedor: int
    nombre: str