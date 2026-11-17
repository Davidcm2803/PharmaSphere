from datetime import date
from typing import List, Optional, Tuple

from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.customer_model import Cliente
from app.models.product_model import Producto
from app.models.recipe_model import Receta
from app.schemas.recipe_schema import RecipeCreate, RecipeState, RecipeUpdate
from app.utils.pagination import PageParams, paginate

# Campos que aceptan NULL: si se mandan como null se limpian. El resto se ignora
_NULLABLE = {"medico", "vigencia_hasta", "archivo_url"}


class InvalidRecipeError(Exception):
    """Datos de la receta no válidos (cliente/producto inexistente, fechas incoherentes).
    La ruta la responde con 400."""


class RecipeLockedError(Exception):
    """La receta ya fue usada en una venta y no se puede modificar ni eliminar.
    La ruta la responde con 409."""


class RecetaInvalidaError(Exception):
    """El cliente no tiene una receta válida para el producto que quiere comprar."""


# Nombres alternativos que usa el otro código: son las mismas excepciones
RecipeError = InvalidRecipeError
RecipeConflictError = RecipeLockedError


def _hoy(hoy: Optional[date]) -> date:
    return hoy or date.today()


def _estado_efectivo(receta: Receta, hoy: date) -> str:
    """Una receta 'vigente' con la vigencia pasada cuenta como 'vencida' (sin tocar la BD)."""
    if receta.estado == "vigente" and receta.vigencia_hasta is not None and receta.vigencia_hasta < hoy:
        return "vencida"
    return receta.estado


def effective_state(receta: Receta, hoy: Optional[date] = None) -> str:
    return _estado_efectivo(receta, _hoy(hoy))


# Condiciones SQL equivalentes a _estado_efectivo
def _cond_vigente(hoy: date):
    return and_(
        Receta.estado == "vigente",
        or_(Receta.vigencia_hasta.is_(None), Receta.vigencia_hasta >= hoy),
    )


def _cond_vencida(hoy: date):
    return or_(
        Receta.estado == "vencida",
        and_(Receta.estado == "vigente", Receta.vigencia_hasta < hoy),
    )


def to_out(
    receta: Receta,
    cliente_nombre: str,
    producto_nombre: str,
    hoy: Optional[date] = None,
    cliente_cedula: Optional[str] = None,
) -> dict:
    return {
        "id_receta": receta.id_receta,
        "id_cliente": receta.id_cliente,
        "cliente_nombre": cliente_nombre,
        "cliente_cedula": cliente_cedula,
        "id_producto": receta.id_producto,
        "producto_nombre": producto_nombre,
        "cantidad": receta.cantidad,
        "medico": receta.medico,
        "fecha": receta.fecha,
        "vigencia_hasta": receta.vigencia_hasta,
        "estado": _estado_efectivo(receta, _hoy(hoy)),
        "archivo_url": receta.archivo_url,
        "id_venta": receta.id_venta,
    }


def _base_stmt():
    # Columnas: Receta, Cliente.nombre, Cliente.cedula, Producto.nombre
    return (
        select(Receta, Cliente.nombre, Cliente.cedula, Producto.nombre)
        .join(Cliente, Cliente.id_cliente == Receta.id_cliente)
        .join(Producto, Producto.id_producto == Receta.id_producto)
    )


def list_recipes(
    db: Session,
    *,
    id_cliente: Optional[int] = None,
    cedula: Optional[str] = None,
    id_producto: Optional[int] = None,
    estado: Optional[RecipeState] = None,
    solo_vigentes: bool = False,
    params: PageParams,
    hoy: Optional[date] = None,
) -> Tuple[List[dict], int]:
    hoy = _hoy(hoy)
    stmt = _base_stmt()
    if id_cliente is not None:
        stmt = stmt.where(Receta.id_cliente == id_cliente)
    if cedula and cedula.strip():
        stmt = stmt.where(Cliente.cedula == cedula.strip())
    if id_producto is not None:
        stmt = stmt.where(Receta.id_producto == id_producto)
    if solo_vigentes:
        stmt = stmt.where(_cond_vigente(hoy))
    elif estado == RecipeState.vigente:
        stmt = stmt.where(_cond_vigente(hoy))
    elif estado == RecipeState.vencida:
        stmt = stmt.where(_cond_vencida(hoy))
    elif estado == RecipeState.usada:
        stmt = stmt.where(Receta.estado == "usada")

    stmt = stmt.order_by(Receta.fecha.desc(), Receta.id_receta.desc())
    rows, total = paginate(db, stmt, params)
    items = [to_out(r, nombre_c, nombre_p, hoy, cliente_cedula=ced) for r, nombre_c, ced, nombre_p in rows]
    return items, total


def get_recipe(db: Session, id_receta: int) -> Optional[Receta]:
    return db.get(Receta, id_receta)


def get_recipe_out(db: Session, id_receta: int, hoy: Optional[date] = None) -> Optional[dict]:
    row = db.execute(_base_stmt().where(Receta.id_receta == id_receta)).first()
    if row is None:
        return None
    return to_out(row[0], row[1], row[3], hoy, cliente_cedula=row[2])


def _check_dates(fecha: date, vigencia_hasta: Optional[date]) -> None:
    if vigencia_hasta is not None and vigencia_hasta < fecha:
        raise InvalidRecipeError("La vigencia no puede ser anterior a la fecha de la receta")


def create_recipe(db: Session, data: RecipeCreate) -> Receta:
    if db.get(Cliente, data.id_cliente) is None:
        raise InvalidRecipeError("El cliente indicado no existe")

    producto = db.get(Producto, data.id_producto)
    if producto is None or not producto.activo:
        raise InvalidRecipeError("El producto indicado no existe o está deshabilitado")
    if not producto.requiere_receta:
        raise InvalidRecipeError(f"{producto.nombre} no requiere receta")

    fecha = data.fecha or date.today()
    _check_dates(fecha, data.vigencia_hasta)

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
        raise InvalidRecipeError("No se pudo guardar la receta, revisa los datos") from None
    db.refresh(receta)
    return receta


def update_recipe(db: Session, receta: Receta, data: RecipeUpdate) -> Receta:
    # Bloquea la fila: si una venta la está usando justo ahora, espera y verá "usada"
    db.refresh(receta, with_for_update=True)
    if receta.estado == "usada":
        db.rollback()
        raise RecipeLockedError("La receta ya fue usada en una venta y no se puede modificar")

    changes = {
        field: value
        for field, value in data.model_dump(exclude_unset=True).items()
        if not (value is None and field not in _NULLABLE)
    }
    _check_dates(
        changes.get("fecha", receta.fecha),
        changes["vigencia_hasta"] if "vigencia_hasta" in changes else receta.vigencia_hasta,
    )
    for field, value in changes.items():
        setattr(receta, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise InvalidRecipeError("No se pudo guardar la receta, revisa los datos") from None
    db.refresh(receta)
    return receta


def delete_recipe(db: Session, receta: Receta) -> None:
    if receta.estado == "usada" or receta.id_venta is not None:
        raise RecipeLockedError("La receta ya fue usada en una venta y no se puede eliminar")
    db.delete(receta)
    db.commit()


# ---------------------------------------------------------------------------
# Validación para ventas.
# El servicio de ventas (issue #12) debe llamar a estas funciones DENTRO de la
# transacción de la venta:
#   receta = validar_receta_para_item(db, id_cliente, producto, cantidad)
#   ... crear la venta ...
#   if receta is not None: marcar_receta_usada(db, receta, venta.id_venta)
#   db.commit()   # un solo commit para toda la venta
# ---------------------------------------------------------------------------
def validar_receta_vigente(
    db: Session,
    id_cliente: Optional[int],
    id_producto: int,
    cantidad: int,
    *,
    hoy: Optional[date] = None,
    bloquear: bool = False,
) -> Receta:
    """Devuelve la receta vigente que cubre la compra o lanza RecetaInvalidaError.

    Una receta sirve si es del cliente, es del producto, está 'vigente', no ha
    vencido y su cantidad autorizada alcanza para lo que se quiere comprar.
    Si hay varias, se usa la que vence primero.
    `bloquear=True` hace SELECT ... FOR UPDATE para que dos ventas simultáneas
    no usen la misma receta.
    """
    if id_cliente is None:
        raise RecetaInvalidaError("Este producto requiere receta: la venta debe tener un cliente registrado")
    if cantidad < 1:
        raise RecetaInvalidaError("La cantidad debe ser mayor que cero")

    hoy = _hoy(hoy)
    stmt = (
        select(Receta)
        .where(
            Receta.id_cliente == id_cliente,
            Receta.id_producto == id_producto,
            Receta.cantidad >= cantidad,
            _cond_vigente(hoy),
        )
        # Las que no tienen fecha de vencimiento quedan al final
        .order_by(Receta.vigencia_hasta.is_(None), Receta.vigencia_hasta, Receta.id_receta)
        .limit(1)
    )
    if bloquear:
        stmt = stmt.with_for_update()

    receta = db.scalars(stmt).first()
    if receta is None:
        raise RecetaInvalidaError(
            "El cliente no tiene una receta vigente que cubra este producto y cantidad"
        )
    return receta


def validar_receta_para_item(
    db: Session,
    id_cliente: Optional[int],
    producto: Producto,
    cantidad: int,
    *,
    hoy: Optional[date] = None,
    bloquear: bool = False,
) -> Optional[Receta]:
    """Si el producto no pide receta devuelve None; si la pide, la valida."""
    if not producto.requiere_receta:
        return None
    try:
        return validar_receta_vigente(
            db, id_cliente, producto.id_producto, cantidad, hoy=hoy, bloquear=bloquear
        )
    except RecetaInvalidaError as exc:
        raise RecetaInvalidaError(f"{producto.nombre}: {exc}") from exc


def marcar_receta_usada(db: Session, receta: Receta, id_venta: int) -> None:
    """Marca la receta como usada. NO hace commit: lo hace el servicio de ventas."""
    receta.estado = "usada"
    receta.id_venta = id_venta