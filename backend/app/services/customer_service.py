from collections import defaultdict
from typing import Dict, List, Optional, Tuple

from sqlalchemy import exists, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.branch_model import Sucursal
from app.models.customer_model import Cliente
from app.models.product_model import Producto
from app.models.recipe_model import Receta
from app.models.sale_model import DetalleVenta, Venta
from app.models.user_model import Usuario
from app.schemas.customer_schema import CustomerCreate, CustomerUpdate
from app.utils.pagination import PageParams, paginate
from app.utils.sql import escape_like

# Campos que aceptan NULL: si se mandan como null se limpian
_NULLABLE = {"cedula", "telefono", "correo", "direccion"}


class DuplicateCustomerError(Exception):
    pass


class CustomerInUseError(Exception):
    pass


def list_customers(
    db: Session,
    *,
    q: Optional[str],
    cedula: Optional[str],
    params: PageParams,
) -> Tuple[List[Cliente], int]:
    stmt = select(Cliente)
    if cedula and cedula.strip():
        # Busqueda exacta por cedula (la usa el mostrador)
        stmt = stmt.where(Cliente.cedula == cedula.strip())
    if q and q.strip():
        patron = f"%{escape_like(q.strip())}%"
        stmt = stmt.where(
            or_(
                Cliente.nombre.ilike(patron, escape="\\"),
                Cliente.cedula.ilike(patron, escape="\\"),
                Cliente.correo.ilike(patron, escape="\\"),
                Cliente.telefono.ilike(patron, escape="\\"),
            )
        )
    stmt = stmt.order_by(func.lower(Cliente.nombre), Cliente.id_cliente)
    rows, total = paginate(db, stmt, params)
    return [row[0] for row in rows], total


def get_customer(db: Session, id_cliente: int) -> Optional[Cliente]:
    return db.get(Cliente, id_cliente)


def _check_duplicates(
    db: Session,
    *,
    cedula: Optional[str],
    correo: Optional[str],
    excluir_id: Optional[int] = None,
) -> None:
    if cedula:
        stmt = select(Cliente.id_cliente).where(Cliente.cedula == cedula)
        if excluir_id is not None:
            stmt = stmt.where(Cliente.id_cliente != excluir_id)
        if db.scalars(stmt).first() is not None:
            raise DuplicateCustomerError("Ya existe un cliente con esa cédula")
    if correo:
        stmt = select(Cliente.id_cliente).where(func.lower(Cliente.correo) == correo.lower())
        if excluir_id is not None:
            stmt = stmt.where(Cliente.id_cliente != excluir_id)
        if db.scalars(stmt).first() is not None:
            raise DuplicateCustomerError("Ya existe un cliente con ese correo")


def create_customer(db: Session, data: CustomerCreate) -> Cliente:
    _check_duplicates(db, cedula=data.cedula, correo=data.correo)
    cliente = Cliente(**data.model_dump())
    db.add(cliente)
    try:
        db.commit()
    except IntegrityError:
        # Dos peticiones a la vez pudieron pasar la revision anterior
        db.rollback()
        raise DuplicateCustomerError("Ya existe un cliente con esa cédula o correo")
    db.refresh(cliente)
    return cliente


def update_customer(db: Session, cliente: Cliente, data: CustomerUpdate) -> Cliente:
    changes = data.model_dump(exclude_unset=True)
    _check_duplicates(
        db,
        cedula=changes.get("cedula"),
        correo=changes.get("correo"),
        excluir_id=cliente.id_cliente,
    )
    for field, value in changes.items():
        if value is None and field not in _NULLABLE:
            continue
        setattr(cliente, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise DuplicateCustomerError("Ya existe un cliente con esa cédula o correo")
    db.refresh(cliente)
    return cliente


def delete_customer(db: Session, cliente: Cliente) -> None:
    """La tabla cliente no tiene columna 'activo', por eso el borrado es real.
    Se rechaza si el cliente tiene ventas, recetas o una cuenta de usuario."""
    tiene_ventas = db.scalar(select(exists().where(Venta.id_cliente == cliente.id_cliente)))
    tiene_recetas = db.scalar(select(exists().where(Receta.id_cliente == cliente.id_cliente)))
    tiene_usuario = db.scalar(select(exists().where(Usuario.id_cliente == cliente.id_cliente)))
    if tiene_ventas or tiene_recetas or tiene_usuario:
        raise CustomerInUseError(
            "No se puede eliminar: el cliente tiene ventas, recetas o una cuenta de usuario asociadas"
        )
    db.delete(cliente)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise CustomerInUseError("No se puede eliminar: el cliente tiene registros asociados")


def list_purchase_history(
    db: Session, id_cliente: int, params: PageParams
) -> Tuple[List[dict], int]:
    """Compras del cliente (mas recientes primero), con sus productos.
    Usa 2 consultas en total (ventas + detalles) sin importar cuantas ventas haya."""
    stmt = (
        select(Venta, Sucursal.nombre)
        .join(Sucursal, Sucursal.id_sucursal == Venta.id_sucursal)
        .where(Venta.id_cliente == id_cliente)
        .order_by(Venta.fecha.desc(), Venta.id_venta.desc())
    )
    rows, total = paginate(db, stmt, params)
    if not rows:
        return [], total

    ids = [row[0].id_venta for row in rows]
    detalles: Dict[int, List[dict]] = defaultdict(list)
    det_stmt = (
        select(
            DetalleVenta.id_venta,
            DetalleVenta.id_producto,
            Producto.nombre,
            DetalleVenta.cantidad,
            DetalleVenta.precio_unitario,
        )
        .join(Producto, Producto.id_producto == DetalleVenta.id_producto)
        .where(DetalleVenta.id_venta.in_(ids))
        .order_by(DetalleVenta.id_detalleventa)
    )
    for id_venta, id_producto, nombre, cantidad, precio in db.execute(det_stmt).all():
        detalles[id_venta].append(
            {
                "id_producto": id_producto,
                "producto_nombre": nombre,
                "cantidad": cantidad,
                "precio_unitario": precio,
                "subtotal": precio * cantidad,
            }
        )

    items = [
        {
            "id_venta": venta.id_venta,
            "fecha": venta.fecha,
            "id_sucursal": venta.id_sucursal,
            "sucursal_nombre": sucursal_nombre,
            "tipo": venta.tipo,
            "estado": venta.estado,
            "metodo_pago": venta.metodo_pago,
            "total": venta.total,
            "items": detalles.get(venta.id_venta, []),
        }
        for venta, sucursal_nombre in rows
    ]
    return items, total
