from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class CasoEscaladoOut(BaseModel):
    id_caso: int
    nivel: Literal["moderado", "grave", "emergencia"]
    motivo: str
    mensaje_usuario: str
    estado: Literal["abierto", "atendido", "cerrado"]
    created_at: datetime
    id_usuario: int
    cliente_nombre: Optional[str] = None
    cliente_correo: Optional[str] = None
    id_empleado_atiende: Optional[int] = None
    empleado_nombre: Optional[str] = None