from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.user_model import Usuario
from app.schemas.branch_schema import BranchCreate, BranchOut, BranchUpdate
from app.services import branch_service

router = APIRouter()


def _not_found():
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")


# Admin y empleado pueden listar (el inventario necesita el dropdown de sucursales)
@router.get("", response_model=List[BranchOut])
def list_branches(
    q: Optional[str] = Query(None, max_length=100, description="Búsqueda por nombre"),
    activo: Optional[bool] = None,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role("admin", "empleado")),
):
    return branch_service.list_branches(db, q=q, activo=activo)


@router.get("/{id_sucursal}", response_model=BranchOut)
def get_branch(
    id_sucursal: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role("admin", "empleado")),
):
    branch = branch_service.get_branch(db, id_sucursal)
    if branch is None:
        raise _not_found()
    return branch


@router.post("", response_model=BranchOut, status_code=status.HTTP_201_CREATED)
def create_branch(
    data: BranchCreate,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    return branch_service.create_branch(db, data)


@router.put("/{id_sucursal}", response_model=BranchOut)
def update_branch(
    id_sucursal: int,
    data: BranchUpdate,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    branch = branch_service.get_branch(db, id_sucursal)
    if branch is None:
        raise _not_found()
    return branch_service.update_branch(db, branch, data)


@router.delete("/{id_sucursal}", status_code=status.HTTP_204_NO_CONTENT)
def delete_branch(
    id_sucursal: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    branch = branch_service.get_branch(db, id_sucursal)
    if branch is None:
        raise _not_found()
    branch_service.delete_branch(db, branch)
    return Response(status_code=status.HTTP_204_NO_CONTENT)