from dataclasses import dataclass
from math import ceil
from typing import Generic, List, Sequence, Tuple, TypeVar

from fastapi import Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

T = TypeVar("T")

DEFAULT_PAGE_SIZE = 12
MAX_PAGE_SIZE = 100


@dataclass
class PageParams:
    page: int
    page_size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

#Dependencia reutilizable: Depends(get_page_params) en cualquier listado
def get_page_params(
    page: int = Query(1, ge=1, description="Número de página, desde 1"),
    page_size: int = Query(
        DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Elementos por página"
    ),
) -> PageParams:
    return PageParams(page=page, page_size=page_size)

#Respuesta Page[ProductOut], Page[ProveedorOut], etc.
class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int

#Ejecuta un select con LIMIT/OFFSET y cuenta el total 
def paginate(db: Session, stmt: Select, params: PageParams) -> Tuple[Sequence, int]:
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = db.execute(stmt.limit(params.page_size).offset(params.offset)).all()
    return rows, total


def build_page(items: list, total: int, params: PageParams) -> dict:
    return {
        "items": items,
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
        "pages": ceil(total / params.page_size) if total else 0,
    }