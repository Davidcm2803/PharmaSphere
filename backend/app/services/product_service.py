from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.inventory_model import Inventario
from app.models.product_model import Producto
from app.models.supplier_model import Proveedor
from app.schemas.product_schema import ProductCreate, ProductSort, ProductUpdate
from app.utils.pagination import PageParams, paginate

#Campos que aceptan NULL: si el admin los manda como null se limpian. El resto se ignora
_NULLABLE = {"descripcion", "categoria", "imagen_url", "id_proveedor"}


class InvalidSupplierError(Exception):
    pass


def _escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

#Suma el stock de todas las sucursales por producto
def _stock_subquery():
    return (
        select(
            Inventario.id_producto.label("id_producto"),
            func.sum(Inventario.cantidad).label("stock"),
        )
        .group_by(Inventario.id_producto)
        .subquery()
    )


_ORDER = {
    ProductSort.nombre: lambda: [func.lower(Producto.nombre)],
    ProductSort.precio_asc: lambda: [Producto.precio.asc()],
    ProductSort.precio_desc: lambda: [Producto.precio.desc()],
    ProductSort.recientes: lambda: [Producto.created_at.desc()],
}

#Lista cliente solo productos activos, Devuelve [(producto, stock_total)] y el total
def list_products(
    db: Session,
    *,
    q: Optional[str],
    categoria: Optional[str],
    precio_min,
    precio_max,
    requiere_receta: Optional[bool],
    orden: ProductSort,
    params: PageParams,
) -> Tuple[List[Tuple[Producto, int]], int]:
    stock = _stock_subquery()
    stock_total = func.coalesce(stock.c.stock, 0).label("stock_total")

    stmt = (
        select(Producto, stock_total)
        .outerjoin(stock, stock.c.id_producto == Producto.id_producto)
        .where(Producto.activo.is_(True))
    )
    if q and q.strip():
        stmt = stmt.where(
            Producto.nombre.ilike(f"%{_escape_like(q.strip())}%", escape="\\")
        )
    if categoria and categoria.strip():
        stmt = stmt.where(func.lower(Producto.categoria) == categoria.strip().lower())
    if precio_min is not None:
        stmt = stmt.where(Producto.precio >= precio_min)
    if precio_max is not None:
        stmt = stmt.where(Producto.precio <= precio_max)
    if requiere_receta is not None:
        stmt = stmt.where(Producto.requiere_receta.is_(requiere_receta))

    stmt = stmt.order_by(*_ORDER[orden](), Producto.id_producto)
    rows, total = paginate(db, stmt, params)
    return [(p, int(s)) for p, s in rows], total


def get_product(db: Session, id_producto: int, *, only_active: bool = True) -> Optional[Producto]:
    product = db.get(Producto, id_producto)
    if product is None or (only_active and not product.activo):
        return None
    return product


def get_stock_total(db: Session, id_producto: int) -> int:
    total = db.scalar(
        select(func.coalesce(func.sum(Inventario.cantidad), 0)).where(
            Inventario.id_producto == id_producto
        )
    )
    return int(total or 0)


def _check_supplier(db: Session, id_proveedor: Optional[int]) -> None:
    if id_proveedor is None:
        return
    supplier = db.get(Proveedor, id_proveedor)
    if supplier is None or not supplier.activo:
        raise InvalidSupplierError("El proveedor indicado no existe o está deshabilitado")


def create_product(db: Session, data: ProductCreate) -> Producto:
    _check_supplier(db, data.id_proveedor)
    product = Producto(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product: Producto, data: ProductUpdate) -> Producto:
    changes = data.model_dump(exclude_unset=True)
    if "id_proveedor" in changes:
        _check_supplier(db, changes["id_proveedor"])
    for field, value in changes.items():
        if value is None and field not in _NULLABLE:
            continue
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product: Producto) -> None:
    product.activo = False
    db.commit()


def list_categories(db: Session) -> List[str]:
    stmt = (
        select(Producto.categoria)
        .where(Producto.activo.is_(True), Producto.categoria.is_not(None), Producto.categoria != "")
        .distinct()
        .order_by(Producto.categoria)
    )
    return list(db.scalars(stmt))