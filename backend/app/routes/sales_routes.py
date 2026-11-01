
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.sale_model import Venta
from app.models.user_model import Usuario
from app.schemas.sale_schema import SaleCreate, SaleOut
from app.services import sales_service

router = APIRouter()


# Historial de pedidos del cliente autenticado.
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

    ventas = db.scalars(
        select(Venta)
        .options(
            selectinload(Venta.sucursal),
            selectinload(Venta.detalles).selectinload(
                __import__(
                    "app.models.sale_model",
                    fromlist=["DetalleVenta"],
                ).DetalleVenta.producto
            ),
        )
        .where(
            Venta.id_cliente == user.id_cliente,
            Venta.tipo == "online",
        )
        .order_by(Venta.fecha.desc(), Venta.id_venta.desc())
    ).all()

    return [sales_service.to_out(venta) for venta in ventas]


# Compra online del cliente logueado.
@router.post(
    "",
    response_model=SaleOut,
    status_code=status.HTTP_201_CREATED,
)
def create_sale(
    data: SaleCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_role("cliente")),
):
    try:
        venta = sales_service.create_sale(db, user, data)
    except sales_service.SaleConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from None
    except sales_service.SaleError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None

    return sales_service.to_out(venta)
