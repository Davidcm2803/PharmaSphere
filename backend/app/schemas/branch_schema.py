from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _clean(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


class BranchBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    direccion: Optional[str] = Field(None, max_length=255)
    telefono: Optional[str] = Field(None, max_length=50)

    @field_validator("nombre", mode="before")
    @classmethod
    def _strip_nombre(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("direccion", "telefono", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        return _clean(v)


class BranchCreate(BranchBase):
    pass


class BranchUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=150)
    direccion: Optional[str] = Field(None, max_length=255)
    telefono: Optional[str] = Field(None, max_length=50)
    activo: Optional[bool] = None

    @field_validator("nombre", "direccion", "telefono", mode="before")
    @classmethod
    def _clean_all(cls, v):
        return _clean(v)


class BranchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_sucursal: int
    nombre: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    activo: bool
    created_at: datetime