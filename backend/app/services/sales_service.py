from decimal import Decimal
from typing import Dict, List

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.branch_model import Sucursal
from app.models.customer_model import Cliente
from app.models.inventory_model import Inventario
from app.models.movement_model import MovimientoInventario
from app.models.product_model import Producto
from app.models.sale_model import DetalleVenta, Venta
from app.models.user_model import Usuario
from app.schemas.sale_schema import SaleCreate

# Una compra online queda pendiente hasta que el cliente pague y retire en la sucursal
TIPO_ONLINE = "online"
ESTADO_INICIAL = "pendiente"
METODO_PAGO = "pago_en_sucursal"


class SaleError(Exception):
    """La compra no se puede hacer (stock, receta, sucursal...). La ruta la responde con 400."""


class SaleConflictError(Exception):
    """Choque con otros datos (cédula repetida, stock cambiado a la vez). La ruta la responde con 409."""


def _validate_items(
    items, productos: Dict[int, Producto], inventarios: Dict[int, Inventario], branch: Sucursal
) -> None:
    """Revisa todos los productos y avisa de todos los problemas juntos."""
    errores: List[str] = []
    for item in items:
        producto = productos.get(item.id_producto)
        if producto is None or not producto.activo:
            errores.append(f"El producto {item.id_producto} ya no está disponible")
            continue
        if producto.requiere_receta:
            errores.append(
                f"{producto.nombre} requiere receta médica: cómpralo en la sucursal presentándola"
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


def create_sale(db: Session, user: Usuario, data: SaleCreate) -> Venta:
    if user.id_cliente is None:
        raise SaleError("Tu cuenta no tiene un perfil de cliente")

    branch = db.get(Sucursal, data.id_sucursal)
    if branch is None or not branch.activo:
        raise SaleError("La sucursal de retiro no está disponible")

    ids = sorted(item.id_producto for item in data.items)
    items = sorted(data.items, key=lambda item: item.id_producto)

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
        _validate_items(items, productos, inventarios, branch)
        _update_customer(db, user.id_cliente, data)

        # El precio sale de la base de datos, nunca del carrito del navegador
        venta = Venta(
            id_sucursal=branch.id_sucursal,
            id_cliente=user.id_cliente,
            tipo=TIPO_ONLINE,
            estado=ESTADO_INICIAL,
            metodo_pago=METODO_PAGO,
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
        db.flush()  # para tener id_venta en el kardex

        for i in items:
            inventarios[i.id_producto].cantidad -= i.cantidad
            db.add(
                MovimientoInventario(
                    id_producto=i.id_producto,
                    id_sucursal=branch.id_sucursal,
                    tipo="venta",
                    cantidad=-i.cantidad,
                    motivo=f"Venta online #{venta.id_venta}",
                    id_usuario=user.id_usuario,
                    id_venta=venta.id_venta,
                )
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise SaleConflictError("Hubo un conflicto al registrar la compra, intenta de nuevo") from None
    except Exception:
        db.rollback()
        raise

    db.refresh(venta)
    return venta


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