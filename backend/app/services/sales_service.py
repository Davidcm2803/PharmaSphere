from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Callable, Dict, List, Optional, Tuple

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models.branch_model import Sucursal
from app.models.customer_model import Cliente
from app.models.inventory_model import Inventario
from app.models.movement_model import MovimientoInventario
from app.models.product_model import Producto
from app.models.recipe_model import Receta
from app.models.sale_model import DetalleVenta, Venta
from app.models.user_model import Usuario
from app.schemas.sale_schema import SaleCounterCreate, SaleCreate
from app.utils.pagination import PageParams, paginate

# Online: queda pendiente hasta que el cliente pague y retire en la sucursal
TIPO_ONLINE = "online"
ESTADO_ONLINE = "pendiente"
METODO_PAGO_ONLINE = "pago_en_sucursal"

# Mostrador: se cobra y se entrega en el momento
TIPO_MOSTRADOR = "mostrador"
ESTADO_MOSTRADOR = "pagada"


class SaleError(Exception):
    """La venta no se puede hacer (stock, receta, sucursal...). La ruta la responde con 400."""


class SaleConflictError(Exception):
    """Choque con otros datos (cédula repetida, stock cambiado a la vez). La ruta la responde con 409."""


def _validate_items(
    items,
    productos: Dict[int, Producto],
    inventarios: Dict[int, Inventario],
    branch: Sucursal,
    recetas: Optional[Dict[int, Receta]] = None,
    hay_cliente: bool = False,
) -> None:
    """Revisa todos los productos y avisa de todos los problemas juntos.

    `recetas=None` = venta online: los productos con receta no se pueden comprar.
    En mostrador se pasa el diccionario {id_producto: receta vigente del cliente}.
    """
    errores: List[str] = []
    for item in items:
        producto = productos.get(item.id_producto)
        if producto is None or not producto.activo:
            errores.append(f"El producto {item.id_producto} ya no está disponible")
            continue
        if producto.requiere_receta:
            if recetas is None:
                errores.append(
                    f"{producto.nombre} requiere receta médica: cómpralo en la sucursal presentándola"
                )
                continue
            if not hay_cliente:
                errores.append(
                    f"{producto.nombre} requiere receta: indica la cédula del cliente que la presentó"
                )
                continue
            if item.id_producto not in recetas:
                errores.append(
                    f"{producto.nombre} requiere una receta vigente del cliente "
                    f"para {item.cantidad} unidad(es)"
                )
                continue
        inventario = inventarios.get(item.id_producto)
        disponible = inventario.cantidad if inventario else 0
        if disponible <= 0:
            errores.append(f"{producto.nombre} está agotado en {branch.nombre}")
        elif item.cantidad > disponible:
            errores.append(
                f"{producto.nombre}: solo hay {disponible} disponible(s) en {branch.nombre}"
            )
    if errores:
        raise SaleError("; ".join(errores))


def _find_recetas(
    db: Session, id_cliente: Optional[int], items, productos: Dict[int, Producto]
) -> Dict[int, Receta]:
    """Receta vigente (no usada ni vencida) del cliente por cada producto que la exige.

    Se bloquean las filas para que dos ventas a la vez no usen la misma receta.
    """
    ids = [i.id_producto for i in items if (p := productos.get(i.id_producto)) and p.requiere_receta]
    if id_cliente is None or not ids:
        return {}
    hoy = date.today()
    candidatas = db.scalars(
        select(Receta)
        .where(
            Receta.id_cliente == id_cliente,
            Receta.id_producto.in_(ids),
            Receta.estado == "vigente",
            or_(Receta.vigencia_hasta.is_(None), Receta.vigencia_hasta >= hoy),
        )
        .order_by(Receta.id_producto, Receta.fecha, Receta.id_receta)
        .with_for_update()
    ).all()
    cantidades = {i.id_producto: i.cantidad for i in items}
    elegidas: Dict[int, Receta] = {}
    for receta in candidatas:
        if receta.id_producto not in elegidas and receta.cantidad >= cantidades[receta.id_producto]:
            elegidas[receta.id_producto] = receta
    return elegidas


def _update_customer(db: Session, id_cliente: int, data: SaleCreate) -> None:
    """Guarda teléfono y cédula del checkout en el perfil del cliente."""
    cliente = db.get(Cliente, id_cliente)
    if cliente is None:
        raise SaleError("Tu cuenta no tiene un perfil de cliente")
    if data.cedula and data.cedula != cliente.cedula:
        repetida = db.scalar(
            select(Cliente.id_cliente).where(
                Cliente.cedula == data.cedula, Cliente.id_cliente != id_cliente
            )
        )
        if repetida is not None:
            raise SaleConflictError("Esa cédula ya está registrada en otra cuenta")
        cliente.cedula = data.cedula
    if data.telefono:
        cliente.telefono = data.telefono


def _sell(
    db: Session,
    *,
    user: Usuario,
    id_sucursal: int,
    raw_items,
    id_cliente: Optional[int],
    tipo: str,
    estado: str,
    metodo_pago: Optional[str],
    tarjeta_ultimos_4: Optional[str] = None,
    con_recetas: bool = False,
    antes: Optional[Callable[[], None]] = None,
) -> Venta:
    """Núcleo de toda venta: valida, calcula el total, guarda venta + detalle, descuenta
    el stock y registra el kardex en UNA transacción (un solo commit)."""
    branch = db.get(Sucursal, id_sucursal)
    if branch is None or not branch.activo:
        raise SaleError("La sucursal indicada no está disponible")

    ids = sorted(item.id_producto for item in raw_items)
    items = sorted(raw_items, key=lambda item: item.id_producto)

    try:
        productos = {
            p.id_producto: p
            for p in db.scalars(select(Producto).where(Producto.id_producto.in_(ids)))
        }
        # Filas de inventario bloqueadas en orden fijo (por producto) para evitar bloqueos cruzados
        inventarios = {
            inv.id_producto: inv
            for inv in db.scalars(
                select(Inventario)
                .where(Inventario.id_sucursal == branch.id_sucursal, Inventario.id_producto.in_(ids))
                .order_by(Inventario.id_producto)
                .with_for_update()
            )
        }
        recetas = _find_recetas(db, id_cliente, items, productos) if con_recetas else None
        _validate_items(
            items, productos, inventarios, branch, recetas, hay_cliente=id_cliente is not None
        )
        if antes:
            antes()

        # El precio sale de la base de datos, nunca del carrito del navegador
        venta = Venta(
            id_sucursal=branch.id_sucursal,
            id_empleado=getattr(user, "id_empleado", None) if tipo == TIPO_MOSTRADOR else None,
            id_cliente=id_cliente,
            tipo=tipo,
            estado=estado,
            metodo_pago=metodo_pago,
            tarjeta_ultimos_4=tarjeta_ultimos_4,
            total=sum(
                (productos[i.id_producto].precio * i.cantidad for i in items), Decimal("0")
            ),
            detalles=[
                DetalleVenta(
                    id_producto=i.id_producto,
                    cantidad=i.cantidad,
                    precio_unitario=productos[i.id_producto].precio,
                )
                for i in items
            ],
        )
        db.add(venta)
        db.flush()  # para tener id_venta en el kardex y en las recetas

        for i in items:
            inventarios[i.id_producto].cantidad -= i.cantidad
            db.add(
                MovimientoInventario(
                    id_producto=i.id_producto,
                    id_sucursal=branch.id_sucursal,
                    tipo="venta",
                    cantidad=-i.cantidad,
                    motivo=f"Venta {tipo} #{venta.id_venta}",
                    id_usuario=user.id_usuario,
                    id_venta=venta.id_venta,
                )
            )
        for receta in (recetas or {}).values():
            receta.estado = "usada"
            receta.id_venta = venta.id_venta
        db.commit()
    except IntegrityError:
        db.rollback()
        raise SaleConflictError("Hubo un conflicto al registrar la venta, intenta de nuevo") from None
    except Exception:
        db.rollback()
        raise

    return get_sale(db, venta.id_venta)


# Compra online del cliente logueado
def create_sale(db: Session, user: Usuario, data: SaleCreate) -> Venta:
    if user.id_cliente is None:
        raise SaleError("Tu cuenta no tiene un perfil de cliente")
    return _sell(
        db,
        user=user,
        id_sucursal=data.id_sucursal,
        raw_items=data.items,
        id_cliente=user.id_cliente,
        tipo=TIPO_ONLINE,
        estado=ESTADO_ONLINE,
        metodo_pago=METODO_PAGO_ONLINE,
        antes=lambda: _update_customer(db, user.id_cliente, data),
    )


# Venta en el mostrador: la registra un empleado o admin; el cliente es opcional
def create_counter_sale(db: Session, user: Usuario, data: SaleCounterCreate) -> Venta:
    id_cliente = None
    if data.cedula_cliente:
        id_cliente = db.scalar(
            select(Cliente.id_cliente).where(Cliente.cedula == data.cedula_cliente)
        )
        if id_cliente is None:
            raise SaleError("No existe un cliente con esa cédula")
    return _sell(
        db,
        user=user,
        id_sucursal=data.id_sucursal,
        raw_items=data.items,
        id_cliente=id_cliente,
        tipo=TIPO_MOSTRADOR,
        estado=ESTADO_MOSTRADOR,
        metodo_pago=data.metodo_pago,
        tarjeta_ultimos_4=data.tarjeta_ultimos_4,
        con_recetas=True,
    )


def _with_relations(stmt):
    return stmt.options(
        selectinload(Venta.sucursal),
        selectinload(Venta.cliente),
        selectinload(Venta.detalles).selectinload(DetalleVenta.producto),
    )


def get_sale(db: Session, id_venta: int) -> Optional[Venta]:
    return db.scalar(_with_relations(select(Venta)).where(Venta.id_venta == id_venta))


def list_my_sales(db: Session, id_cliente: int) -> List[Venta]:
    stmt = (
        _with_relations(select(Venta))
        .where(Venta.id_cliente == id_cliente, Venta.tipo == TIPO_ONLINE)
        .order_by(Venta.fecha.desc(), Venta.id_venta.desc())
    )
    return list(db.scalars(stmt).all())


# Listado del panel con filtros. `hasta` es inclusivo (todo el día)
def list_sales(
    db: Session,
    *,
    desde: Optional[date],
    hasta: Optional[date],
    id_sucursal: Optional[int],
    tipo: Optional[str],
    estado: Optional[str],
    params: PageParams,
) -> Tuple[List[Venta], int]:
    stmt = _with_relations(select(Venta))
    if desde is not None:
        stmt = stmt.where(Venta.fecha >= datetime.combine(desde, time.min))
    if hasta is not None:
        stmt = stmt.where(Venta.fecha < datetime.combine(hasta + timedelta(days=1), time.min))
    if id_sucursal is not None:
        stmt = stmt.where(Venta.id_sucursal == id_sucursal)
    if tipo is not None:
        stmt = stmt.where(Venta.tipo == tipo)
    if estado is not None:
        stmt = stmt.where(Venta.estado == estado)
    stmt = stmt.order_by(Venta.fecha.desc(), Venta.id_venta.desc())
    rows, total = paginate(db, stmt, params)
    return [row[0] for row in rows], total


def to_out(venta: Venta) -> dict:
    """Arma el SaleOut: la venta con el nombre de la sucursal y el detalle de cada producto."""
    return {
        "id_venta": venta.id_venta,
        "fecha": venta.fecha,
        "estado": venta.estado,
        "tipo": venta.tipo,
        "metodo_pago": venta.metodo_pago,
        "total": venta.total,
        "id_sucursal": venta.id_sucursal,
        "sucursal_nombre": venta.sucursal.nombre,
        "items": [
            {
                "id_producto": d.id_producto,
                "nombre": d.producto.nombre,
                "imagen_url": d.producto.imagen_url,
                "cantidad": d.cantidad,
                "precio_unitario": d.precio_unitario,
                "subtotal": d.precio_unitario * d.cantidad,
            }
            for d in venta.detalles
        ],
    }


def to_admin_out(venta: Venta) -> dict:
    """SaleAdminOut: lo mismo que to_out más el cliente y el empleado que atendió."""
    cliente = venta.cliente
    return {
        **to_out(venta),
        "id_cliente": venta.id_cliente,
        "cliente_nombre": cliente.nombre if cliente else None,
        "cliente_cedula": cliente.cedula if cliente else None,
        "id_empleado": venta.id_empleado,
        "tarjeta_ultimos_4": venta.tarjeta_ultimos_4,
    }