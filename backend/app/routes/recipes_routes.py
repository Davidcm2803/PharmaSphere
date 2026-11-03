from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.user_model import Usuario
from app.schemas.recipe_schema import RecipeCreate, RecipeOut, RecipeUpdate
from app.services import recipe_service
from app.utils.pagination import Page, PageParams, build_page, get_page_params

router = APIRouter()


def _not_found():
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receta no encontrada")


# Excepción del servicio -> HTTPException (400 dato inválido, 409 receta usada)
def _http_error(exc: Exception) -> HTTPException:
    codigo = (
        status.HTTP_409_CONFLICT
        if isinstance(exc, recipe_service.RecipeConflictError)
        else status.HTTP_400_BAD_REQUEST
    )
    return HTTPException(status_code=codigo, detail=str(exc))


# Panel y POS: ?cedula + ?id_producto + ?estado=vigente sirve para validar una receta en el mostrador
@router.get("", response_model=Page[RecipeOut])
def list_recipes(
    id_cliente: Optional[int] = Query(None, ge=1),
    cedula: Optional[str] = Query(None, max_length=50, description="Cédula exacta del cliente"),
    id_producto: Optional[int] = Query(None, ge=1),
    estado: Optional[Literal["vigente", "vencida", "usada"]] = None,
    params: PageParams = Depends(get_page_params),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role("admin", "empleado")),
):
    rows, total = recipe_service.list_recipes(
        db,
        id_cliente=id_cliente,
        cedula=cedula,
        id_producto=id_producto,
        estado=estado,
        params=params,
    )
    return build_page([recipe_service.to_out(r) for r in rows], total, params)


@router.get("/{id_receta}", response_model=RecipeOut)
def get_recipe(
    id_receta: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role("admin", "empleado")),
):
    receta = recipe_service.get_recipe(db, id_receta)
    if receta is None:
        raise _not_found()
    return recipe_service.to_out(receta)


@router.post("", response_model=RecipeOut, status_code=status.HTTP_201_CREATED)
def create_recipe(
    data: RecipeCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role("admin", "empleado")),
):
    try:
        receta = recipe_service.create_recipe(db, data)
    except recipe_service.RecipeError as exc:
        raise _http_error(exc) from None
    return recipe_service.to_out(receta)


@router.put("/{id_receta}", response_model=RecipeOut)
def update_recipe(
    id_receta: int,
    data: RecipeUpdate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_role("admin", "empleado")),
):
    receta = recipe_service.get_recipe(db, id_receta)
    if receta is None:
        raise _not_found()
    try:
        receta = recipe_service.update_recipe(db, receta, data)
    except (recipe_service.RecipeError, recipe_service.RecipeConflictError) as exc:
        raise _http_error(exc) from None
    return recipe_service.to_out(receta)