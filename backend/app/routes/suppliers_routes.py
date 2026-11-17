from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.user_model import Usuario
from app.schemas.supplier_schema import (
    SupplierCreate,
    SupplierOption,
    SupplierOut,
    SupplierUpdate,
)
from app.services import supplier_service
from app.utils.pagination import Page, PageParams, build_page, get_page_params

router = APIRouter()


def _not_found():
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado")


# Solo admin búsqueda por nombre y filtro por estado
@router.get("", response_model=Page[SupplierOut])
def list_suppliers(
    q: Optional[str] = Query(None, max_length=100, description="Búsqueda por nombre"),
    activo: Optional[bool] = None,
    params: PageParams = Depends(get_page_params),
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    rows, total = supplier_service.list_suppliers(db, q=q, activo=activo, params=params)
    items = [SupplierOut.model_validate(s) for s in rows]
    return build_page(items, total, params)


# Lista completa de id pero solo sale el nombre para dropdowns.
# Debe ir ANTES de "/{id_proveedor}" para que "options" no se interprete como un id
@router.get("/options", response_model=List[SupplierOption])
def supplier_options(
    include_id: Optional[int] = Query(None, ge=1, description="Incluir también este proveedor aunque esté deshabilitado"),
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    return supplier_service.list_options(db, include_id=include_id)


@router.get("/{id_proveedor}", response_model=SupplierOut)
def get_supplier(
    id_proveedor: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    supplier = supplier_service.get_supplier(db, id_proveedor)
    if supplier is None:
        raise _not_found()
    return supplier


@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    data: SupplierCreate,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    return supplier_service.create_supplier(db, data)


@router.put("/{id_proveedor}", response_model=SupplierOut)
def update_supplier(
    id_proveedor: int,
    data: SupplierUpdate,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    supplier = supplier_service.get_supplier(db, id_proveedor)
    if supplier is None:
        raise _not_found()
    return supplier_service.update_supplier(db, supplier, data)


@router.delete("/{id_proveedor}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    id_proveedor: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    supplier = supplier_service.get_supplier(db, id_proveedor)
    if supplier is None:
        raise _not_found()
    supplier_service.delete_supplier(db, supplier)
    return Response(status_code=status.HTTP_204_NO_CONTENT)