from typing import List, Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.customer_model import Cliente
from app.schemas.customer_schema import CustomerCreate, CustomerUpdate
from app.utils.pagination import PageParams, paginate
from app.utils.sql import escape_like

# Campos que aceptan NULL: si se mandan como null se limpian. El resto se ignora
_NULLABLE = {"cedula", "telefono", "correo", "direccion"}


class CustomerConflictError(Exception):
    """Cédula o correo ya usados por otro cliente. La ruta la responde con 409."""


def list_customers(
    db: Session, *, q: Optional[str], cedula: Optional[str], params: PageParams
) -> Tuple[List[Cliente], int]:
    stmt = select(Cliente)
    if cedula and cedula.strip():
        stmt = stmt.where(Cliente.cedula == cedula.strip())
    if q and q.strip():
        like = f"%{escape_like(q.strip())}%"
        stmt = stmt.where(
            or_(
                Cliente.nombre.ilike(like, escape="\\"),
                Cliente.cedula.ilike(like, escape="\\"),
                Cliente.correo.ilike(like, escape="\\"),
            )
        )
    stmt = stmt.order_by(func.lower(Cliente.nombre), Cliente.id_cliente)
    rows, total = paginate(db, stmt, params)
    return [row[0] for row in rows], total


def get_customer(db: Session, id_cliente: int) -> Optional[Cliente]:
    return db.get(Cliente, id_cliente)


def _check_unique(
    db: Session, *, cedula: Optional[str], correo: Optional[str], exclude_id: Optional[int] = None
) -> None:
    if cedula:
        stmt = select(Cliente.id_cliente).where(Cliente.cedula == cedula)
        if exclude_id is not None:
            stmt = stmt.where(Cliente.id_cliente != exclude_id)
        if db.scalar(stmt) is not None:
            raise CustomerConflictError("Ya existe un cliente con esa cédula")
    if correo:
        stmt = select(Cliente.id_cliente).where(func.lower(Cliente.correo) == correo.lower())
        if exclude_id is not None:
            stmt = stmt.where(Cliente.id_cliente != exclude_id)
        if db.scalar(stmt) is not None:
            raise CustomerConflictError("Ya existe un cliente con ese correo")


def create_customer(db: Session, data: CustomerCreate) -> Cliente:
    _check_unique(db, cedula=data.cedula, correo=data.correo)
    cliente = Cliente(**data.model_dump())
    db.add(cliente)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise CustomerConflictError("La cédula o el correo ya están registrados") from None
    db.refresh(cliente)
    return cliente


def update_customer(db: Session, cliente: Cliente, data: CustomerUpdate) -> Cliente:
    changes = {
        field: value
        for field, value in data.model_dump(exclude_unset=True).items()
        if not (value is None and field not in _NULLABLE)
    }
    # El correo de un cliente con cuenta es el de su usuario: no se cambia desde aquí
    if "correo" in changes and changes["correo"] != cliente.correo and cliente.usuario is not None:
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
        raise CustomerConflictError("La cédula o el correo ya están registrados") from None
    db.refresh(cliente)
    return cliente