from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _strip(value):
    return value.strip() if isinstance(value, str) else value


class SearchRequest(BaseModel):
    pregunta: str = Field(min_length=2, max_length=500)
    limite: int = Field(default=3, ge=1, le=10)

    _strip_texts = field_validator("pregunta", mode="before")(_strip)


class SearchResultOut(BaseModel):
    origen: str  # documento | producto
    id_documento: Optional[int] = None
    id_producto: Optional[int] = None
    titulo: str
    fragmento: str
    indice_chunk: Optional[int] = None
    score: float


class DocumentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_documento: int
    titulo: str
    tipo: Optional[str] = None
    ruta: Optional[str] = None
    indexado: bool
    id_usuario: Optional[int] = None
    created_at: Optional[datetime] = None
    # solo viene al subir el documento
    chunks: Optional[int] = None


# solo user y assistant: el cliente no puede inyectar mensajes de sistema
class ChatMessage(BaseModel):
    rol: Literal["user", "assistant"]
    contenido: str = Field(min_length=1, max_length=2000)

    _strip_texts = field_validator("contenido", mode="before")(_strip)


class ChatRequest(BaseModel):
    pregunta: str = Field(min_length=2, max_length=1000)
    historial: List[ChatMessage] = Field(default_factory=list, max_length=12)
    voz: bool = False  # true = respuesta corta, pensada para leerse en voz alta

    _strip_texts = field_validator("pregunta", mode="before")(_strip)


class ChatSource(BaseModel):
    tipo: Literal["documento", "producto", "base_de_datos"]
    titulo: str
    detalle: Optional[str] = None


# accion que el usuario debe aprobar antes de que se escriba nada
class AccionPendiente(BaseModel):
    tipo: Literal["ingreso_stock"]
    resumen: str
    token: str


class ChatResponse(BaseModel):
    respuesta: str
    fuentes: List[ChatSource]
    accion: Optional[AccionPendiente] = None


class ConfirmRequest(BaseModel):
    token: str = Field(min_length=20, max_length=2000)


class ConfirmResponse(BaseModel):
    mensaje: str
    producto: str
    sucursal: str
    cantidad: int
    stock_nuevo: int