from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.product_model import Producto
from app.models.supplier_model import Proveedor
from app.schemas.supplier_schema import SupplierCreate, SupplierUpdate
from app.utils.pagination import PageParams, paginate

# Campos que aceptan NULL: si el admin los manda como null se limpian
_NULLABLE = {"contacto", "telefono", "correo"}


def _escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _entity(row) -> Proveedor:
    # paginate puede devolver Row o la entidad directa, según su implementación
    return row if isinstance(row, Proveedor) else row[0]


def list_suppliers(
    db: Session,
    *,
    q: Optional[str],
    activo: Optional[bool],
    params: PageParams,
) -> Tuple[List[Proveedor], int]:
    stmt = select(Proveedor)
    if q and q.strip():
        stmt = stmt.where(Proveedor.nombre.ilike(f"%{_escape_like(q.strip())}%", escape="\\"))
    if activo is not None:
        stmt = stmt.where(Proveedor.activo.is_(activo))
    stmt = stmt.order_by(func.lower(Proveedor.nombre), Proveedor.id_proveedor)
    rows, total = paginate(db, stmt, params)
    return [_entity(r) for r in rows], total


# Lista completa y liviana de proveedores activos, para dropdowns
def list_options(db: Session, *, include_id: Optional[int] = None) -> List[Proveedor]:
    cond = Proveedor.activo.is_(True)
    if include_id is not None:
        # al editar un producto cuyo proveedor está deshabilitado, igual debe aparecer
        cond = cond | (Proveedor.id_proveedor == include_id)
    stmt = select(Proveedor).where(cond).order_by(func.lower(Proveedor.nombre))
    return list(db.scalars(stmt))


def get_supplier(db: Session, id_proveedor: int) -> Optional[Proveedor]:
    return db.get(Proveedor, id_proveedor)


def create_supplier(db: Session, data: SupplierCreate) -> Proveedor:
    supplier = Proveedor(**data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def update_supplier(db: Session, supplier: Proveedor, data: SupplierUpdate) -> Proveedor:
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None and field not in _NULLABLE:
            continue
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


def delete_supplier(db: Session, supplier: Proveedor) -> None:
    supplier.activo = False
    db.commit()


def count_products(db: Session, id_proveedor: int) -> int:
    return int(
        db.scalar(
            select(func.count()).select_from(Producto).where(
                Producto.id_proveedor == id_proveedor, Producto.activo.is_(True)
            )
        )
        or 0
    )