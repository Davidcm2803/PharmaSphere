from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.customer_model import Cliente
from app.models.user_model import Usuario
from app.schemas.customer_schema import (
    CustomerCreate,
    CustomerOut,
    CustomerSaleOut,
    CustomerUpdate,
)
from app.services import customer_service
from app.utils.pagination import Page, PageParams, build_page, get_page_params

router = APIRouter()


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")


def _get_or_404(db: Session, id_cliente: int):
    cliente = customer_service.get_customer(db, id_cliente)
    if cliente is None:
        raise _not_found()
    return cliente


# Perfil del cliente autenticado.
# IMPORTANTE: debe ir ANTES de "/{id_cliente}", si no FastAPI intenta
# interpretar "me" como un id_cliente entero y devuelve 422.
@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_role("cliente")),
):
    if user.id_cliente is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró tu perfil de cliente",
        )

    cliente = db.get(Cliente, user.id_cliente)

    if cliente is None:
        raise HTTPException(
            status_code=404,
            detail="El perfil del cliente no existe",
        )

    return {
        "id_cliente": cliente.id_cliente,
        "nombre": cliente.nombre,
        "correo": cliente.correo,
        "cedula": cliente.cedula,
        "telefono": cliente.telefono,
        "direccion": cliente.direccion,
        "created_at": cliente.created_at,
    }


# Busqueda por nombre/cédula/correo/teléfono (q) o por cédula exacta (cedula)
@router.get("", response_model=Page[CustomerOut])
def list_customers(
    q: Optional[str] = Query(None, max_length=100, description="Búsqueda libre"),
    cedula: