from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.core.cache import cached
from app.models.product_model import Producto
from app.models.sale_model import DetalleVenta, Venta
from app.utils.cutouts import alpha_png_url, cutout_url


def _first(obj, *attrs):
    for attr in attrs:
        value = getattr(obj, attr, None)
        if value:
            return value
    return None


def _to_dict(p: Producto, vendidos: int) -> dict:
    imagen_url = _first(p, "imagen_url", "url_imagen", "imagen")
    return {
        "id_producto": p.id_producto,
        "nombre": p.nombre,
        "descripcion": getattr(p, "descripcion", None),
        "imagen_url": imagen_url,
        "imagen_cutout_url": cutout_url(p.id_producto) or alpha_png_url(imagen_url),
        "vendidos": int(vendidos),
    }


@cached("bestsellers:top", ttl=300)
def get_top_products(db: Session, limit: int = 4) -> list[dict]:
    rows = db.execute(
        select(Producto, func.coalesce(func.sum(DetalleVenta.cantidad), 0).label("vendidos"))
        .join(DetalleVenta, DetalleVenta.id_producto == Producto.id_producto)
        .join(Venta, Venta.id_venta == DetalleVenta.id_venta)
        .where(Venta.estado != "cancelada")
        .group_by(Producto.id_producto)
        .order_by(desc("vendidos"))
        .limit(limit)
    ).all()

    result = [_to_dict(p, vendidos) for p, vendidos in rows]

    # Si hay pocas ventas, se completa con los productos más recientes
    if len(result) < limit:
        used = [r["id_producto"] for r in result]
        extra = db.scalars(
            select(Producto)
            .where(Producto.id_producto.not_in(used))
            .order_by(Producto.id_producto.desc())
            .limit(limit - len(result))
        ).all()
        result += [_to_dict(p, 0) for p in extra]

    return result