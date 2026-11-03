from datetime import date
from typing import List, Optional, Tuple

from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models.customer_model import Cliente
from app.models.product_model import Producto
from app.models.recipe_model import Receta
from app.schemas.recipe_schema import RecipeCreate, RecipeUpdate
from app.utils.pagination import PageParams, paginate

# Campos que aceptan NULL: si se mandan como null se limpian. El resto se ignora
_NULLABLE = {"medico", "vigencia_hasta", "archivo_url"}


class RecipeError(Exception):
    """Dato inválido (cliente, producto, fechas...). La ruta la responde con 400."""


class RecipeConflictError(Exception):
    """La receta ya no se puede editar (usada). La ruta la responde con 409."""


def effective_state(receta: Receta, hoy: Optional[date] = None) -> str:
    """Una receta 'vigente' con la vigencia pasada cuenta como 'vencida' (sin tocar la BD)."""
    hoy = hoy or date.today()
    if receta.estado == "vigente" and receta.vigencia_hasta is not None and receta.vigencia_hasta < hoy:
        return "vencida"
    return receta.estado


def _with_relations(stmt):
    return stmt.options(selectinload(Receta.cliente), selectinload(Receta.producto))


def get_recipe(db: Session, id_receta: int) -> Optional[Receta]:
    return db.scalar(_with_relations(select(Receta)).where(Receta.id_receta == id_receta))


def list_recipes(
    db: Session,
    *,
    id_cliente: Optional[int],
    cedula: Optional[str],
    id_producto: Optional[int],
    estado: Optional[str],
    params: PageParams,
) -> Tuple[List[Receta], int]:
    hoy = date.today()
    stmt = _with_relations(select(Receta))
    if id_cliente is not None:
        stmt = stmt.where(Receta.id_cliente == id_cliente)
    if cedula and cedula.strip():
        stmt = stmt.where(
            Receta.id_cliente.in_(select(Cliente.id_cliente).where(Cliente.cedula == cedula.strip()))
        )
    if id_producto is not None:
        stmt = stmt.where(Receta.id_producto == id_producto)
    if estado == "vigente":
        stmt = stmt.where(
            Receta.estado == "vigente",
            or_(Receta.vigencia_hasta.is_(None), Receta.vigencia_hasta >= hoy),
        )
    elif estado == "vencida":
        stmt = stmt.where(
            or_(
                Receta.estado == "vencida",
                and_(
                    Receta.estado == "vigente",
                    Receta.vigencia_hasta.is_not(None),
                    Receta.vigencia_hasta < hoy,
                ),
            )
        )
    elif estado == "usada":
        stmt = stmt.where(Receta.estado == "usada")
    stmt = stmt.order_by(Receta.fecha.desc(), Receta.id_receta.desc())
    rows, total = paginate(db, stmt, params)
    return [row[0] for row in rows], total


def _check_vigencia(fecha: date, vigencia_hasta: Optional[date]) -> None:
    if vigencia_hasta is not None and vigencia_hasta < fecha:
        raise RecipeError("La vigencia no puede ser anterior a la fecha de la receta")


def create_recipe(db: Session, data: RecipeCreate) -> Receta:
    if db.get(Cliente, data.id_cliente) is None:
        raise RecipeError("El cliente indicado no existe")
    producto = db.get(Producto, data.id_producto)
    if producto is None or not producto.activo:
        raise RecipeError("El producto indicado no existe o está deshabilitado")
    if not producto.requiere_receta:
        raise RecipeError(f"{producto.nombre} no requiere receta")
    fecha = data.fecha or date.today()
    _check_vigencia(fecha, data.vigencia_hasta)

    receta = Receta(
        id_cliente=data.id_cliente,
        id_producto=data.id_producto,
        cantidad=data.cantidad,
        medico=data.medico,
        fecha=fecha,
        vigencia_hasta=data.vigencia_hasta,
        archivo_url=data.archivo_url,
        estado="vigente",
    )
    db.add(receta)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise RecipeError("No se pudo guardar la receta, revisa los datos") from None
    return get_recipe(db, receta.id_receta)


def update_recipe(db: Session, receta: Receta, data: RecipeUpdate) -> Receta:
    # Bloquea la fila: si una venta la está usando justo ahora, espera y verá "usada"
    db.refresh(receta, with_for_update=True)
    if receta.estado == "usada":
        db.rollback()
        raise RecipeConflictError("La receta ya fue usada en una venta y no se puede editar")

    changes = {
        field: value
        for field, value in data.model_dump(exclude_unset=True).items()
        if not (value is None and field not in _NULLABLE)
    }
    _check_vigencia(
        changes.get("fecha", receta.fecha),
        changes["vigencia_hasta"] if "vigencia_hasta" in changes else receta.vigencia_hasta,
    )
    for field, value in changes.items():
        setattr(receta, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise RecipeError("No se pudo guardar la receta, revisa los datos") from None
    return get_recipe(db, receta.id_receta)


def to_out(receta: Receta) -> dict:
    return {
        "id_receta": receta.id_receta,
        "id_cliente": receta.id_cliente,
        "cliente_nombre": receta.cliente.nombre,
        "cliente_cedula": receta.cliente.cedula,
        "id_producto": receta.id_producto,
        "producto_nombre": receta.producto.nombre,
        "medico": receta.medico,
        "cantidad": receta.cantidad,
        "fecha": receta.fecha,
        "vigencia_hasta": receta.vigencia_hasta,
        "estado": effective_state(receta),
        "archivo_url": receta.archivo_url,
        "id_venta": receta.id_venta,
    }