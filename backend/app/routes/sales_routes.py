from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.user_model import Usuario
from app.schemas.sale_schema import SaleAdminOut, SaleCounterCreate, SaleCreate, SaleOut
from app.services import bestsellers_service, sales_service
from app.utils.pagination import Page, PageParams, build_page, get_page_params

router = APIRouter()


class TopProductOut(BaseModel):
    id_producto: int
    nombre: str
    descripcion: str | None = None
    imagen_url: str | None = None
    imagen_cutout_url: str | None = None
    vendidos: int = 0


# Traduce las excepciones del servicio a HTTPException (400 negocio, 409 conflicto)
def _http_error(exc: Exception) -> HTTPException:
    codigo = (
        status.HTTP_409_CONFLICT
        if isinstance(exc, sales_service.SaleConflictError)
        else status.HTTP_400_BAD_REQUEST
    )
    return HTTPException(status_code=codigo, detail=str(exc))


# Público: productos más vendidos, alimenta el hero de la tienda.
@router.get("/top-products", response_model=list[TopProductOut])
def top_products(
    limit: int = Query(4, ge=1, le=12),
    db: Session = Depends(get_db),
):
    return bestsellers_service.get_top_products(db, limit)


# Historial de pedidos del cliente autenticado (las rutas fijas van antes que /{id_venta})
@router.get("/me", response_model=list[SaleOut])
def my_sales(
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_role("cliente")),
):
    if user.id_cliente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró tu perfil de cliente",
        )
    return [sales_service.to_out(v) for v in sales_service.list_my_sales(db, user.id_cliente)]


# Panel: todas las ventas, paginadas y con filtros por fecha, sucursal, tipo y estado
@router.get("", response_model=Page[SaleAdminOut])
def list_sales(
    desde: Optional[date] = Query(None, description="Desde (incluido), AAAA-MM-DD"),
    hasta: Optional[date] = Query(None, description="Hasta (incluido), AAAA-MM-DD"),
    id_sucursal: Optional[int] = Query(None, ge=1),
    tipo: Optional[Literal["online", "mostrador"]] = None,
    estado: Optional[Literal["pendiente", "pagada", "retirada", "cancelada"]] = None,
    params: PageParams = Depends(get_page_params),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role("admin", "empleado")),
):
    if desde is not None and hasta is not None and desde > hasta:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="desde no puede ser posterior a hasta",
        )
    ventas, total = sales_service.list_sales(
        db,
        desde=desde,
        hasta=hasta,
        id_sucursal=id_sucursal,
        tipo=tipo,
        estado=estado,
        params=params,
    )
    return build_page([sales_service.to_admin_out(v) for v in ventas], total, params)


# Panel: detalle de una venta
@router.get("/{id_venta}", response_model=SaleAdminOut)
def get_sale(
    id_venta: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role("admin", "empleado")),
):
    venta = sales_service.get_sale(db, id_venta)
    if venta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venta no encontrada")
    return sales_service.to_admin_out(venta)


# Compra online del cliente logueado.
@router.post("", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
def create_sale(
    data: SaleCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_role("cliente")),
):
    try:
        venta = sales_service.create_sale(db, user, data)
    except (sales_service.SaleConflictError, sales_service.SaleError) as exc:
        raise _http_error(exc) from None
    return sales_service.to_out(venta)


# Venta en el mostrador (punto de venta del panel)
@router.post("/mostrador", response_model=SaleAdminOut, status_code=status.HTTP_201_CREATED)
def create_counter_sale(
    data: SaleCounterCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_role("admin", "empleado")),
):
    try:
        venta = sales_service.create_counter_sale(db, user, data)
    except (sales_service.SaleConflictError, sales_service.SaleError) as exc:
        raise _http_error(exc) from None
    return sales_service.to_admin_out(venta)