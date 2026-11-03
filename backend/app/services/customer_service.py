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

# Campos que aceptan NULL: si se mandan como null se limpian. El resto se ignora
_NULLABLE = {"cedula", "telefono", "correo", "direccion"}


class CustomerConflictError(Exception):
    """Cédula o correo ya usados por otro cliente. La ruta la responde con 409."""


# Nombre alternativo que usa el otro código: es la misma excepción
DuplicateCustomerError = CustomerConflictError


class CustomerInUseError(Exception):
    """El cliente tiene ventas, recetas o cuenta de usuario. La ruta la responde con 409."""


def list_customers(
    db: Session,
    *,
    q: Optional[str],
    cedula: Optional[str],
    params: PageParams,
) -> Tuple[List[Cliente], int]:
    stmt = select(Cliente)
    if cedula and cedula.strip():
        # Búsqueda exacta por cédula (la usa el mostrador)
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


def _check_unique(
    db: Session,
    *,
    cedula: Optional[str],
    correo: Optional[str],
    exclude_id: Optional[int] = None,
) -> None:
    if cedula:
        stmt = select(Cliente.id_cliente).where(Cliente.cedula == cedula)
        if exclude_id is not None:
            stmt = stmt.where(Cliente.id_cliente != exclude_id)
        if db.scalars(stmt).first() is not None:
            raise CustomerConflictError("Ya existe un cliente con esa cédula")
    if correo:
        stmt = select(Cliente.id_cliente).where(func.lower(Cliente.correo) == correo.lower())
        if exclude_id is not None:
            stmt = stmt.where(Cliente.id_cliente != exclude_id)
        if db.scalars(stmt).first() is not None:
            raise CustomerConflictError("Ya existe un cliente con ese correo")


def _tiene_cuenta(db: Session, id_cliente: int) -> bool:
    return bool(db.scalar(select(exists().where(Usuario.id_cliente == id_cliente))))


def create_customer(db: Session, data: CustomerCreate) -> Cliente:
    _check_unique(db, cedula=data.cedula, correo=data.correo)
    cliente = Cliente(**data.model_dump())
    db.add(cliente)
    try:
        db.commit()
    except IntegrityError:
        # Dos peticiones a la vez pudieron pasar la revisión anterior
        db.rollback()
        raise CustomerConflictError("Ya existe un cliente con esa cédula o correo") from None
    db.refresh(cliente)
    return cliente


def update_customer(db: Session, cliente: Cliente, data: CustomerUpdate) -> Cliente:
    changes = {
        field: value
        for field, value in data.model_dump(exclude_unset=True).items()
        if not (value is None and field not in _NULLABLE)
    }
    # El correo de un cliente con cuenta es el de su usuario: no se cambia desde aquí
    if (
        "correo" in changes
        and changes["correo"] != cliente.correo
        and _tiene_cuenta(db, cliente.id_cliente)
    ):
        raise CustomerConflictError(
            "El correo pertenece a una cuenta de usuario y no se puede cambiar aquí"
        )
    _check_unique(
        db,
        cedula=changes.get("cedula") if changes.get("cedula") != cliente.cedula else None,
        correo=changes.get("correo") if changes.get("correo") != cliente.correo else None,
        exclude_id=cliente.id_cliente,
    )
    for field, value in changes.items():
        setattr(cliente, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise CustomerConflictError("Ya existe un cliente con esa cédula o correo") from None
    db.refresh(cliente)
    return cliente


def delete_customer(db: Session, cliente: Cliente) -> None:
    """La tabla cliente no tiene columna 'activo', por eso el borrado es real.
    Se rechaza si el cliente tiene ventas, recetas o una cuenta de usuario."""
    tiene_ventas = db.scalar(select(exists().where(Venta.id_cliente == cliente.id_cliente)))
    tiene_recetas = db.scalar(select(exists().where(Receta.id_cliente == cliente.id_cliente)))
    if tiene_ventas or tiene_recetas or _tiene_cuenta(db, cliente.id_cliente):
        raise CustomerInUseError(
            "No se puede eliminar: el cliente tiene ventas, recetas o una cuenta de usuario asociadas"
        )
    db.delete(cliente)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise CustomerInUseError(
            "No se puede eliminar: el cliente tiene registros asociados"
        ) from None


def list_purchase_history(
    db: Session, id_cliente: int, params: PageParams
) -> Tuple[List[dict], int]:
    """Compras del cliente (más recientes primero), con sus productos.
    Usa 2 consultas en total (ventas + detalles) sin importar cuántas ventas haya."""
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