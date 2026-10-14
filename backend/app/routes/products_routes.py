from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import bearer_scheme, get_current_user, require_role
from app.models.user_model import Usuario
from app.schemas.product_schema import (
    ProductAdminOut,
    ProductCreate,
    ProductOut,
    ProductSort,
    ProductUpdate,
)
from app.services import product_service
from app.utils.pagination import Page, PageParams, build_page, get_page_params

router = APIRouter()
categories_router = APIRouter()


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[Usuario]:
    """Usuario si manda un token válido; None si es visitante. Nunca da error."""
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


def _out(schema, product, stock: int):
    out = schema.model_validate(product)
    out.stock_total = stock
    return out


def _not_found():
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

#Cliente pagination, filtros y orden por precio
@router.get("", response_model=Page[ProductOut])
def list_products(
    q: Optional[str] = Query(None, max_length=100, description="Búsqueda por nombre"),
    categoria: Optional[str] = Query(None, max_length=100),
    precio_min: Optional[Decimal] = Query(None, ge=0),
    precio_max: Optional[Decimal] = Query(None, ge=0),
    requiere_receta: Optional[bool] = None,
    orden: ProductSort = ProductSort.nombre,
    params: PageParams = Depends(get_page_params),
    db: Session = Depends(get_db),
):
    if precio_min is not None and precio_max is not None and precio_min > precio_max:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="precio_min no puede ser mayor que precio_max",
        )
    rows, total = product_service.list_products(
        db,
        q=q,
        categoria=categoria,
        precio_min=precio_min,
        precio_max=precio_max,
        requiere_receta=requiere_receta,
        orden=orden,
        params=params,
    )
    items = [_out(ProductOut, p, stock) for p, stock in rows]
    return build_page(items, total, params)

#Client con stock total, si la consulta es de un admin, la respuesta incluye costo y estado
#y puede ver productos deshabilitados. response_model=None porque cambia según el rol
@router.get("/{id_producto}", response_model=None)
def get_product(
    id_producto: int,
    db: Session = Depends(get_db),
    user: Optional[Usuario] = Depends(get_optional_user),
):
    is_admin = user is not None and user.rol == "admin"
    product = product_service.get_product(db, id_producto, only_active=not is_admin)
    if product is None:
        raise _not_found()
    stock = product_service.get_stock_total(db, id_producto)
    return _out(ProductAdminOut if is_admin else ProductOut, product, stock)


@router.post("", response_model=ProductAdminOut, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    try:
        product = product_service.create_product(db, data)
    except product_service.InvalidSupplierError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return _out(ProductAdminOut, product, 0)

@router.put("/{id_producto}", response_model=ProductAdminOut)
def update_product(
    id_producto: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    product = product_service.get_product(db, id_producto, only_active=False)
    if product is None:
        raise _not_found()
    try:
        product = product_service.update_product(db, product, data)
    except product_service.InvalidSupplierError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return _out(ProductAdminOut, product, product_service.get_stock_total(db, id_producto))

@router.delete("/{id_producto}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    id_producto: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    product = product_service.get_product(db, id_producto, only_active=False)
    if product is None:
        raise _not_found()
    product_service.delete_product(db, product)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@categories_router.get("", response_model=List[str])
def list_categories(db: Session = Depends(get_db)):
    return product_service.list_categories(db)