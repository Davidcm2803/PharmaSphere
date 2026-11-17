from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.user_model import Usuario
from app.schemas.purchase_schema import (
    CompraCreate,
    CompraDetalleOut,
    CompraListOut,
    CompraOut,
    CompraReceive,
    LoteOut,
    RecepcionOut,
)
from app.services import purchase_service
from app.services.purchase_service import PurchaseError
from app.utils.pagination import Page, PageParams, build_page, get_page_params

router = APIRouter()

# Las compras son solo del admin
_admin = require_role("admin")


# Lista paginada, filtros: ?estado&id_proveedor&id_sucursal
@router.get("", response_model=Page[CompraListOut])
def list_purchases(
    estado: Optional[str] = Query(None, pattern="^(pendiente|recibida|cancelada)$"),
    id_proveedor: Optional[int] = Query(None, ge=1),
    id_sucursal: Optional[int] = Query(None, ge=1),
    params: PageParams = Depends(get_page_params),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(_admin),
):
    items, total = purchase_service.list_purchases(
        db, estado=estado, id_proveedor=id_proveedor, id_sucursal=id_sucursal, params=params
    )
    return build_page([CompraListOut(**i) for i in items], total, params)


@router.get("/{id_compra}", response_model=CompraDetalleOut)
def get_purchase(
    id_compra: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(_admin),
):
    compra = purchase_service.get_purchase(db, id_compra)
    if compra is None:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    return compra


@router.post("", response_model=CompraOut, status_code=201)
def crear_compra(
    datos: CompraCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(_admin),
):
    # El usuario sale del token, nunca del body
    datos = datos.model_copy(update={"id_usuario": user.id_usuario})
    try:
        return purchase_service.crear_compra(db, datos)
    except PurchaseError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post("/{id_compra}/receive", response_model=RecepcionOut)
def recibir_compra(
    id_compra: int,
    datos: CompraReceive,
    db: Session = Depends(get_db),
    user: Usuario = Depends(_admin),
):
    try:
        compra, lotes = purchase_service.recibir_compra(db, id_compra, datos, user.id_usuario)
    except PurchaseError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    return RecepcionOut(
        compra=CompraOut.model_validate(compra),
        lotes=[LoteOut.model_validate(l) for l in lotes],
    )