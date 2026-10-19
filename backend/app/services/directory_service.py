from typing import List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.branch_model import Sucursal
from app.models.employee_model import Empleado
from app.models.inventory_model import Inventario
from app.models.product_model import Producto
from app.models.supplier_model import Proveedor
from app.utils.sql import escape_like


def _like(texto: str) -> str:
    return f"%{escape_like(texto.strip())}%"


def list_branches(db: Session, *, solo_activas: bool = True, q: Optional[str] = None) -> List[dict]:
    stmt = select(Sucursal).order_by(func.lower(Sucursal.nombre))
    if solo_activas:
        stmt = stmt.where(Sucursal.activo.is_(True))
    if q and q.strip():
        stmt = stmt.where(Sucursal.nombre.ilike(_like(q), escape="\\"))
    return [
        {
            "id_sucursal": s.id_sucursal,
            "nombre": s.nombre,
            "direccion": s.direccion,
            "telefono": s.telefono,
            "activa": s.activo,
        }
        for s in db.scalars(stmt)
    ]


def list_employees(
    db: Session, *, solo_activos: bool = True, q: Optional[str] = None, limite: int = 50
) -> List[dict]:
    stmt = (
        select(Empleado, Sucursal.nombre)
        .outerjoin(Sucursal, Sucursal.id_sucursal == Empleado.id_sucursal)
        .order_by(func.lower(Empleado.nombre))
        .limit(limite)
    )
    if solo_activos:
        stmt = stmt.where(Empleado.activo.is_(True))
    if q and q.strip():
        patron = _like(q)
        stmt = stmt.where(
            or_(Empleado.nombre.ilike(patron, escape="\\"), Empleado.puesto.ilike(patron, escape="\\"))
        )
    return [
        {"nombre": e.nombre, "puesto": e.puesto, "sucursal": sucursal, "activo": e.activo}
        for e, sucursal in db.execute(stmt).all()
    ]


# producto: nombre de un producto para encontrar a su proveedor
def list_suppliers(
    db: Session,
    *,
    solo_activos: bool = True,
    q: Optional[str] = None,
    producto: Optional[str] = None,
    limite: int = 50,
) -> List[dict]:
    stmt = select(Proveedor).order_by(func.lower(Proveedor.nombre)).limit(limite)
    if solo_activos:
        stmt = stmt.where(Proveedor.activo.is_(True))
    if q and q.strip():
        stmt = stmt.where(Proveedor.nombre.ilike(_like(q), escape="\\"))
    if producto and producto.strip():
        ids = select(Producto.id_proveedor).where(
            Producto.id_proveedor.is_not(None),
            Producto.nombre.ilike(_like(producto), escape="\\"),
        )
        stmt = stmt.where(Proveedor.id_proveedor.in_(ids))
    return [
        {
            "nombre": p.nombre,
            "contacto": p.contacto,
            "telefono": p.telefono,
            "correo": p.correo,
            "activo": p.activo,
        }
        for p in db.scalars(stmt)
    ]


# catalogo con stock total. Sin costo
def list_products(
    db: Session, *, q: Optional[str] = None, categoria: Optional[str] = None, limite: int = 30
) -> List[dict]:
    total = (
        select(func.coalesce(func.sum(Inventario.cantidad), 0))
        .where(Inventario.id_producto == Producto.id_producto)
        .correlate(Producto)
        .scalar_subquery()
    )
    stmt = (
        select(
            Producto.nombre,
            Producto.categoria,
            Producto.precio,
            Producto.requiere_receta,
            total.label("stock_total"),
        )
        .where(Producto.activo.is_(True))
        .order_by(func.lower(Producto.nombre))
        .limit(limite)
    )
    if q and q.strip():
        stmt = stmt.where(Producto.nombre.ilike(_like(q), escape="\\"))
    if categoria and categoria.strip():
        stmt = stmt.where(func.lower(Producto.categoria) == categoria.strip().lower())
    return [
        {
            "producto": nombre,
            "categoria": cat,
            "precio": float(precio),
            "requiere_receta": receta,
            "stock_total": int(stock),
        }
        for nombre, cat, precio, receta, stock in db.execute(stmt).all()
    ]


# productos activos cuyo nombre contiene q (para resolver "paracetamol")
def find_products(db: Session, q: str, limite: int = 6) -> List[dict]:
    stmt = (
        select(Producto.id_producto, Producto.nombre)
        .where(Producto.activo.is_(True), Producto.nombre.ilike(_like(q), escape="\\"))
        .order_by(func.lower(Producto.nombre))
        .limit(limite)
    )
    return [{"id_producto": i, "nombre": n} for i, n in db.execute(stmt).all()]