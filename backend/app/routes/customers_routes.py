
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.customer_model import Cliente
from app.models.user_model import Usuario

router = APIRouter()


# Perfil del cliente autenticado.
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


# Endpoint existente.
@router.get("/")
def list_customers():
    return {"message": "customers endpoint working"}
