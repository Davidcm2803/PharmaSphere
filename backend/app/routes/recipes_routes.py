from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.user_model import Usuario
from app.schemas.recipe_schema import RecipeCreate, RecipeOut, RecipeState, RecipeUpdate
from app.services import recipe_service
from app.utils.pagination import Page, PageParams, build_page, get_page_params

router = APIRouter()


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receta no encontrada")


@router.get("", response_model=Page[RecipeOut])
def list_recipes(
    id_cliente: Optional[int] = Query(None, ge=1),
    id_producto: Optional[int] = Query(None, ge=1),
    estado: Optional[RecipeState] = None,
    solo_vigentes: bool = Query(False, description="Solo recetas utilizables hoy"),
    params: PageParams = Depends(get_page_params),
    db: Session = Depends(get_db),
    _staff: Usuario = Depends(require_role("admin", "empleado")),
):
    items, total = recipe_service.list_recipes(
        db,
        id_cliente=id_cliente,
        id_producto=id_producto,
        estado=estado,
        solo_vigentes=solo_vigentes,
        params=params,
    )
    return build_page(items, total, params)


@router.post("", response_model=RecipeOut, status_code=status.HTTP_201_CREATED)
def create_recipe(
    data: RecipeCreate,
    db: Session = Depends(get_db),
    _staff: Usuario = Depends(require_role("admin", "empleado")),
):
    try:
        receta = recipe_service.create_recipe(db, data)
    except recipe_service.InvalidRecipeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return recipe_service.get_recipe_out(db, receta.id_receta)


@router.get("/{id_receta}", response_model=RecipeOut)
def get_recipe(
    id_receta: int,
    db: Session = Depends(get_db),
    _staff: Usuario = Depends(require_role("admin", "empleado")),
):
    out = recipe_service.get_recipe_out(db, id_receta)
    if out is None:
        raise _not_found()
    return out


@router.put("/{id_receta}", response_model=RecipeOut)
def update_recipe(
    id_receta: int,
    data: RecipeUpdate,
    db: Session = Depends(get_db),
    _staff: Usuario = Depends(require_role("admin", "empleado")),
):
    receta = recipe_service.get_recipe(db, id_receta)
    if receta is None:
        raise _not_found()
    try:
        recipe_service.update_recipe(db, receta, data)
    except recipe_service.RecipeLockedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except recipe_service.InvalidRecipeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return recipe_service.get_recipe_out(db, id_receta)


@router.delete("/{id_receta}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(
    id_receta: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    receta = recipe_service.get_recipe(db, id_receta)
    if receta is None:
        raise _not_found()
    try:
        recipe_service.delete_recipe(db, receta)
    except recipe_service.RecipeLockedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
