from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.user_model import Usuario
from app.schemas.customer_schema import CustomerCreate, CustomerOut, CustomerUpdate
from app.services import customer_service
from app.utils.pagination import Page, PageParams, build_page, get_page_params

router = APIRouter()


def _not_found():
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")


# Perfil del cliente autenticado (las rutas fijas van antes que /{id_cliente})
@router.get("/me", response_model=CustomerOut)
def get_my_profile(
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_role("cliente")),
):
    if user.id_cliente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró tu perfil de cliente",
        )
    cliente = customer_service.get_customer(db, user.id_cliente)
    if cliente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El perfil del cliente no existe",
        )
    return cliente


# Panel: lista paginada; ?q busca por nombre, cédula o correo; ?cedula es exacta (POS)
@router.get("", response_model=Page[CustomerOut])
def list_customers(
    q: Optional[str] = Query(None, max_length=100, description="Nombre, cédula o correo"),
    cedula: Optional[str] = Query(None, max_length=50, description="Cédula exacta"),
    params: PageParams = Depends(get_page_params),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role("admin", "empleado")),
):
    rows, total = customer_service.list_customers(db, q=q, cedula=cedula, params=params)
    return build_page([CustomerOut.model_validate(c) for c in rows], total, params)


@router.get("/{id_cliente}", response_model=CustomerOut)
def get_customer(
    id_cliente: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role("admin", "empleado")),
):
    cliente = customer_service.get_customer(db, id_cliente)
    if cliente is None:
        raise _not_found()
    return cliente


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    data: CustomerCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role("admin", "empleado")),
):
    try:
        return customer_service.create_customer(db, data)
    except customer_service.CustomerConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from None


@router.put("/{id_cliente}", response_model=CustomerOut)
def update_customer(
    id_cliente: int,
    data: CustomerUpdate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role("admin", "empleado")),
):
    cliente = customer_service.get_customer(db, id_cliente)
    if cliente is None:
        raise _not_found()
    try:
        return customer_service.update_customer(db, cliente, data)
    except customer_service.CustomerConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from None