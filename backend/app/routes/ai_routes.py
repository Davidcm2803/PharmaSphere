from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.user_model import Usuario
from app.schemas.ai_schema import (
    ChatRequest,
    ChatResponse,
    ConfirmRequest,
    ConfirmResponse,
    DocumentoOut,
    SearchRequest,
    SearchResultOut,
)
from app.services import copilot_actions_service, copilot_service, embedding_service, rag_service
from app.utils.pagination import Page, PageParams, build_page, get_page_params

router = APIRouter()

_ROLES = ("admin", "empleado")


# busqueda semantica sobre los documentos y productos indexados
@router.post("/search", response_model=List[SearchResultOut])
def search(
    data: SearchRequest,
    _user: Usuario = Depends(require_role(*_ROLES)),
):
    try:
        return rag_service.buscar(data.pregunta, data.limite)
    except rag_service.BusquedaError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


# Pharmacy Copilot: el LLM decide si usa documentos, la base de datos o ambos
@router.post("/chat", response_model=ChatResponse)
def chat(
    data: ChatRequest,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_role(*_ROLES)),
):
    try:
        return copilot_service.responder(
            db, pregunta=data.pregunta, historial=data.historial, usuario=user, voz=data.voz
        )
    except copilot_service.CopilotNoConfiguradoError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except copilot_service.CopilotError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


# el usuario aprobo una accion preparada por el Copilot: aqui se escribe en la base
@router.post("/chat/confirm", response_model=ConfirmResponse)
def chat_confirm(
    data: ConfirmRequest,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_role(*_ROLES)),
):
    try:
        return copilot_service.confirmar_accion(db, token=data.token, usuario=user)
    except copilot_actions_service.AccionYaEjecutadaError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except copilot_actions_service.AccionInvalidaError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


# sube un txt/md/pdf, lo guarda en documento y lo indexa en qdrant
@router.post("/documents", response_model=DocumentoOut, status_code=status.HTTP_201_CREATED)
def upload_document(
    archivo: UploadFile = File(...),
    titulo: Optional[str] = Form(None, max_length=200),
    tipo: Optional[str] = Form(None, max_length=50),
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_role(*_ROLES)),
):
    # se lee un byte de mas para detectar archivos que pasan el limite
    datos = archivo.file.read(embedding_service.limite_subida_bytes() + 1)
    try:
        documento, fragmentos = embedding_service.crear_documento(
            db,
            nombre_archivo=archivo.filename or "",
            datos=datos,
            titulo=titulo,
            tipo=tipo,
            id_usuario=user.id_usuario,
        )
    except embedding_service.ArchivoDemasiadoGrandeError as exc:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc))
    except embedding_service.ArchivoInvalidoError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except embedding_service.IndexacionError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    out = DocumentoOut.model_validate(documento)
    out.chunks = fragmentos
    return out


@router.get("/documents", response_model=Page[DocumentoOut])
def list_documents(
    q: Optional[str] = Query(None, max_length=100, description="Búsqueda por título"),
    params: PageParams = Depends(get_page_params),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role(*_ROLES)),
):
    rows, total = embedding_service.list_documentos(db, q=q, params=params)
    items = [DocumentoOut.model_validate(d) for d in rows]
    return build_page(items, total, params)