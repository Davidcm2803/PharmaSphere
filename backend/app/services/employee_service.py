from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.branch_model import Sucursal
from app.models.employee_model import Empleado
from app.schemas.employee_schema import EmployeeCreate, EmployeeUpdate
from app.utils.sql import escape_like

_NULLABLE = {"puesto"}


def _require_active_branch(db: Session, id_sucursal: int) -> None:
    branch = db.get(Sucursal, id_sucursal)
    if branch is None or not branch.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La sucursal no existe o está inactiva",
        )


def list_employees(
    db: Session,
    *,
    q: Optional[str],
    id_sucursal: Optional[int],
    activo: Optional[bool],
) -> List[Empleado]:
    stmt = select(Empleado).options(joinedload(Empleado.sucursal))
    if q and q.strip():
        stmt = stmt.where(Empleado.nombre.ilike(f"%{escape_like(q.strip())}%", escape="\\"))
    if id_sucursal is not None:
        stmt = stmt.where(Empleado.id_sucursal == id_sucursal)
    if activo is not None:
        stmt = stmt.where(Empleado.activo.is_(activo))
    stmt = stmt.order_by(func.lower(Empleado.nombre), Empleado.id_empleado)
    return list(db.scalars(stmt))


def get_employee(db: Session, id_empleado: int) -> Optional[Empleado]:
    return db.get(Empleado, id_empleado)


def create_employee(db: Session, data: EmployeeCreate) -> Empleado:
    _require_active_branch(db, data.id_sucursal)
    employee = Empleado(**data.model_dump())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


def update_employee(db: Session, employee: Empleado, data: EmployeeUpdate) -> Empleado:
    values = data.model_dump(exclude_unset=True)

    # Solo se exige sucursal activa si realmente cambia de sucursal
    new_branch = values.get("id_sucursal")
    if new_branch is not None and new_branch != employee.id_sucursal:
        _require_active_branch(db, new_branch)

    for field, value in values.items():
        if value is None and field not in _NULLABLE:
            continue
        setattr(employee, field, value)
    db.commit()
    db.refresh(employee)
    return employee


def delete_employee(db: Session, employee: Empleado) -> None:
    """Borrado lógico: activo = False."""
    employee.activo = False
    db.commit()