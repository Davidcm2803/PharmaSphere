from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.user_model import Usuario
from app.schemas.inventory_schema import (
    InventoryItemOut,
    StockAdjustIn,
    StockTransferIn,
    StockTransferOut,
)
from app.services import inventory_service

router = APIRouter()

# Admin y empleado operan el inventario
_staff = require_role("admin", "empleado")


# Inventario filtrable
@router.get("", response_model=List[InventoryItemOut])
def list_inventory(
    id_sucursal: Optional[int] = Query(None, ge=1),
    id_producto: Optional[int] = Query(None, ge=1),
    q: Optional[str] = Query(None, max_length=100, description="Búsqueda por nombre de producto"),
    low_stock: bool = Query(False, description="Solo productos por debajo del stock mínimo"),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(_staff),
):
    return inventory_service.list_inventory(
        db, id_sucursal=id_sucursal, id_producto=id_producto, q=q, low_stock=low_stock
    )


# Stock de un producto en cada sucursal activa
@router.get("/product/{id_producto}", response_model=List[InventoryItemOut])
def product_stock(
    id_producto: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(_staff),
):
    return inventory_service.get_product_stock(db, id_producto)


# Ajuste manual
@router.post("/adjust", response_model=InventoryItemOut)
def adjust_stock(
    data: StockAdjustIn,
    db: Session = Depends(get_db),
    user: Usuario = Depends(_staff),
):
    return inventory_service.adjust_stock(db, data, user.id_usuario)


# Transferencia entre sucursales
@router.post("/transfer", response_model=StockTransferOut)
def transfer_stock(
    data: StockTransferIn,
    db: Session = Depends(get_db),
    user: Usuario = Depends(_staff),
):
    return inventory_service.transfer_stock(db, data, user.id_usuario)