from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.employee_model import Empleado
from app.models.user_model import Usuario
from app.schemas.employee_schema import EmployeeCreate, EmployeeOut, EmployeeUpdate
from app.services import employee_service

router = APIRouter()


def _not_found():
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empleado no encontrado")


def _out(employee: Empleado) -> EmployeeOut:
    out = EmployeeOut.model_validate(employee)
    out.sucursal_nombre = employee.sucursal.nombre if employee.sucursal else None
    return out


# Todo el módulo es solo para admin
@router.get("", response_model=List[EmployeeOut])
def list_employees(
    q: Optional[str] = Query(None, max_length=100, description="Búsqueda por nombre"),
    id_sucursal: Optional[int] = Query(None, ge=1),
    activo: Optional[bool] = None,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    rows = employee_service.list_employees(db, q=q, id_sucursal=id_sucursal, activo=activo)
    return [_out(e) for e in rows]


@router.get("/{id_empleado}", response_model=EmployeeOut)
def get_employee(
    id_empleado: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    employee = employee_service.get_employee(db, id_empleado)
    if employee is None:
        raise _not_found()
    return _out(employee)


@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    return _out(employee_service.create_employee(db, data))


@router.put("/{id_empleado}", response_model=EmployeeOut)
def update_employee(
    id_empleado: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    employee = employee_service.get_employee(db, id_empleado)
    if employee is None:
        raise _not_found()
    return _out(employee_service.update_employee(db, employee, data))


@router.delete("/{id_empleado}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    id_empleado: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    employee = employee_service.get_employee(db, id_empleado)
    if employee is None:
        raise _not_found()
    employee_service.delete_employee(db, employee)
    return Response(status_code=status.HTTP_204_NO_CONTENT)