from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.branch_model import Sucursal
from app.models.inventory_model import Inventario
from app.schemas.branch_schema import BranchCreate, BranchUpdate
from app.utils.sql import escape_like

# Campos que aceptan NULL: si el admin los manda como null se limpian
_NULLABLE = {"direccion", "telefono"}


def list_branches(db: Session, *, q: Optional[str], activo: Optional[bool]) -> List[Sucursal]:
    # Son pocas sucursales: se devuelve la lista completa (la usan los dropdowns)
    stmt = select(Sucursal)
    if q and q.strip():
        stmt = stmt.where(Sucursal.nombre.ilike(f"%{escape_like(q.strip())}%", escape="\\"))
    if activo is not None:
        stmt = stmt.where(Sucursal.activo.is_(activo))
    stmt = stmt.order_by(func.lower(Sucursal.nombre), Sucursal.id_sucursal)
    return list(db.scalars(stmt))


def get_branch(db: Session, id_sucursal: int) -> Optional[Sucursal]:
    return db.get(Sucursal, id_sucursal)


def create_branch(db: Session, data: BranchCreate) -> Sucursal:
    branch = Sucursal(**data.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch

#No se desactiva una sucursal con stock queda atrapado, porque ajustes y transferencias exigen sucursales activas
def _ensure_can_deactivate(db: Session, branch: Sucursal) -> None:

    total = db.scalar(
        select(func.coalesce(func.sum(Inventario.cantidad), 0)).where(
            Inventario.id_sucursal == branch.id_sucursal
        )
    )
    if total and total > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La sucursal aún tiene {int(total)} unidades en inventario. Transfiere el stock antes de desactivarla.",
        )


def update_branch(db: Session, branch: Sucursal, data: BranchUpdate) -> Sucursal:
    values = data.model_dump(exclude_unset=True)
    if values.get("activo") is False and branch.activo:
        _ensure_can_deactivate(db, branch)
    for field, value in values.items():
        if value is None and field not in _NULLABLE:
            continue
        setattr(branch, field, value)
    db.commit()
    db.refresh(branch)
    return branch


def delete_branch(db: Session, branch: Sucursal) -> None:
    """Borrado lógico: activo = False."""
    if branch.activo:
        _ensure_can_deactivate(db, branch)
    branch.activo = False
    db.commit()