from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _clean(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


class EmployeeBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    puesto: Optional[str] = Field(None, max_length=100)
    id_sucursal: int = Field(ge=1)

    @field_validator("nombre", mode="before")
    @classmethod
    def _strip_nombre(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("puesto", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        return _clean(v)


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=150)
    puesto: Optional[str] = Field(None, max_length=100)
    id_sucursal: Optional[int] = Field(None, ge=1)
    activo: Optional[bool] = None

    @field_validator("nombre", "puesto", mode="before")
    @classmethod
    def _clean_all(cls, v):
        return _clean(v)


class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_empleado: int
    nombre: str
    puesto: Optional[str] = None
    id_sucursal: Optional[int] = None
    sucursal_nombre: Optional[str] = None
    activo: bool
    created_at: datetime