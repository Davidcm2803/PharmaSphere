import secrets
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.branch_model import Sucursal
from app.models.employee_model import Empleado
from app.models.user_model import Usuario
from app.schemas.employee_schema import EmployeeCreate, EmployeeUpdate
from app.services import auth_service
from app.utils.sql import escape_like

_NULLABLE = {"puesto"}


def _require_active_branch(db: Session, id_sucursal: int) -> None:
    branch = db.get(Sucursal, id_sucursal)
    if branch is None or not branch.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La sucursal no existe o está inactiva",
        )


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _attach_user(db: Session, employee: Empleado, correo: str) -> None:
    user = auth_service.get_user_by_email(db, correo)
    if user is None:
        db.add(
            Usuario(
                nombre=employee.nombre,
                correo=correo,
                rol="empleado",
                id_empleado=employee.id_empleado,
                activo=employee.activo,
                password_hash=auth_service.hash_password(secrets.token_urlsafe(32)),
            )
        )
        return
    if user.rol == "admin":
        raise _conflict("Ese correo pertenece a un administrador")
    if user.id_empleado not in (None, employee.id_empleado):
        raise _conflict("Ese correo ya está asignado a otro empleado")
    user.rol = "empleado"
    user.id_empleado = employee.id_empleado
    user.activo = employee.activo


def _change_user_email(db: Session, employee: Empleado, correo: str) -> None:
    user = employee.usuario
    if user.correo == correo:
        return
    if user.firebase_uid:
        raise _conflict("Este empleado ya inició sesión con su correo actual, no se puede cambiar")
    if auth_service.get_user_by_email(db, correo) is not None:
        raise _conflict("Ese correo ya está en uso")
    user.correo = correo


def list_employees(
    db: Session,
    *,
    q: Optional[str],
    id_sucursal: Optional[int],
    activo: Optional[bool],
) -> List[Empleado]:
    stmt = select(Empleado).options(joinedload(Empleado.sucursal), joinedload(Empleado.usuario))
    if q and q.strip():
        stmt = stmt.where(Empleado.nombre.ilike(f"%{escape_like(q.strip())}%", escape="\\"))
    if id_sucursal is not None:
        stmt = stmt.where(Empleado.id_sucursal == id_sucursal)
    if activo is not None:
        stmt = stmt.where(Empleado.activo.is_(activo))
    stmt = stmt.order_by(func.lower(Empleado.nombre), Empleado.id_empleado)
    return list(db.scalars(stmt).unique())


def get_employee(db: Session, id_empleado: int) -> Optional[Empleado]:
    return db.get(Empleado, id_empleado)


def create_employee(db: Session, data: EmployeeCreate) -> Empleado:
    _require_active_branch(db, data.id_sucursal)
    values = data.model_dump()
    correo = values.pop("correo", None)
    employee = Empleado(**values)
    try:
        db.add(employee)
        db.flush()
        if correo:
            _attach_user(db, employee, correo)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise _conflict("Ese correo ya está en uso")
    except Exception:
        db.rollback()
        raise
    db.refresh(employee)
    return employee


def update_employee(db: Session, employee: Empleado, data: EmployeeUpdate) -> Empleado:
    values = data.model_dump(exclude_unset=True)
    correo = values.pop("correo", None)

    # Solo se exige sucursal activa si realmente cambia de sucursal
    new_branch = values.get("id_sucursal")
    if new_branch is not None and new_branch != employee.id_sucursal:
        _require_active_branch(db, new_branch)

    try:
        for field, value in values.items():
            if value is None and field not in _NULLABLE:
                continue
            setattr(employee, field, value)

        if correo:
            if employee.usuario is not None:
                _change_user_email(db, employee, correo)
            else:
                _attach_user(db, employee, correo)

        if employee.usuario is not None:
            employee.usuario.activo = employee.activo
        db.commit()
    except IntegrityError:
        db.rollback()
        raise _conflict("Ese correo ya está en uso")
    except Exception:
        db.rollback()
        raise
    db.refresh(employee)
    return employee


def delete_employee(db: Session, employee: Empleado) -> None:
    """Borrado lógico: activo = False."""
    employee.activo = False
    if employee.usuario is not None:
        employee.usuario.activo = False
    db.commit()