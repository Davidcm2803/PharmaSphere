from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.user_model import Usuario
from app.schemas.support_ticket_schema import CasoEscaladoOut
from app.services import support_ticket_service
from app.utils.pagination import Page, PageParams, build_page, get_page_params

router = APIRouter()
_ROLES = ("admin", "empleado")


@router.get("", response_model=Page[CasoEscaladoOut])
def list_casos(
    estado: Optional[str] = Query(None, pattern="^(abierto|atendido|cerrado)$"),
    nivel: Optional[str] = Query(None, pattern="^(moderado|grave|emergencia)$"),
    params: PageParams = Depends(get_page_params),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role(*_ROLES)),
):
    rows, total = support_ticket_service.list_casos(db, estado=estado, nivel=nivel, params=params)
    items = [support_ticket_service.to_out(c) for c in rows]
    return build_page(items, total, params)


@router.get("/{id_caso}", response_model=CasoEscaladoOut)
def get_caso(
    id_caso: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role(*_ROLES)),
):
    caso = support_ticket_service.get_caso(db, id_caso)
    if caso is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El caso no existe")
    return support_ticket_service.to_out(caso)


# el empleado que llama este endpoint queda asignado al caso (no se elige a otro)
@router.post("/{id_caso}/tomar", response_model=CasoEscaladoOut)
def tomar_caso(
    id_caso: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_role(*_ROLES)),
):
    if user.id_empleado is None and user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tu usuario no está vinculado a un registro de empleado",
        )
    try:
        caso = support_ticket_service.tomar_caso(db, id_caso, user)
    except support_ticket_service.CasoEscaladoError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return support_ticket_service.to_out(caso)


@router.post("/{id_caso}/cerrar", response_model=CasoEscaladoOut)
def cerrar_caso(
    id_caso: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role(*_ROLES)),
):
    try:
        caso = support_ticket_service.cerrar_caso(db, id_caso)
    except support_ticket_service.CasoEscaladoError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return support_ticket_service.to_out(caso)


@router.post("/{id_caso}/reabrir", response_model=CasoEscaladoOut)
def reabrir_caso(
    id_caso: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role(*_ROLES)),
):
    try:
        caso = support_ticket_service.reabrir_caso(db, id_caso)
    except support_ticket_service.CasoEscaladoError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return support_ticket_service.to_out(caso)