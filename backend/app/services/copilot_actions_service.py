import uuid
from datetime import date, datetime, timedelta, timezone

import jwt
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.movement_model import MovimientoInventario
from app.models.user_model import Usuario
from app.schemas.inventory_schema import StockAdjustIn
from app.services import inventory_service

# Propósito propio: el token de acción NO sirve como token de login (no lleva sub ni rol)
# y un token de login NO sirve para confirmar una acción.
PROPOSITO = "copilot_ingreso_stock"


class AccionInvalidaError(Exception):
    pass


class AccionYaEjecutadaError(AccionInvalidaError):
    pass


def crear_token_ingreso(
    *,
    id_usuario: int,
    id_producto: int,
    producto: str,
    id_sucursal: int,
    sucursal: str,
    cantidad: int,
    numero_lote: str,
    fecha_vencimiento: date,
) -> str:
    ahora = datetime.now(timezone.utc)
    payload = {
        "proposito": PROPOSITO,
        "uid": id_usuario,
        "id_producto": id_producto,
        "producto": producto,
        "id_sucursal": id_sucursal,
        "sucursal": sucursal,
        "cantidad": cantidad,
        "numero_lote": numero_lote,
        "fecha_vencimiento": fecha_vencimiento.isoformat(),
        "jti": uuid.uuid4().hex[:12],
        "iat": ahora,
        "exp": ahora + timedelta(seconds=settings.copilot_accion_ttl_seg),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def _leer_token(token: str, usuario: Usuario) -> dict:
    try:
        datos = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm], options={"require": ["exp"]}
        )
    except jwt.ExpiredSignatureError as exc:
        raise AccionInvalidaError("La confirmación expiró, pídele de nuevo la acción a Javier") from exc
    except jwt.InvalidTokenError as exc:
        raise AccionInvalidaError("La confirmación no es válida") from exc
    if datos.get("proposito") != PROPOSITO or datos.get("uid") != usuario.id_usuario:
        raise AccionInvalidaError("La confirmación no es válida")
    try:
        datos["id_producto"] = int(datos["id_producto"])
        datos["id_sucursal"] = int(datos["id_sucursal"])
        datos["cantidad"] = int(datos["cantidad"])
        datos["jti"] = str(datos["jti"])
    except (KeyError, TypeError, ValueError) as exc:
        raise AccionInvalidaError("La confirmación no es válida") from exc
    if not 1 <= datos["cantidad"] <= settings.copilot_max_ingreso:
        raise AccionInvalidaError("La cantidad de la confirmación no es válida")
    try:
        datos["numero_lote"] = str(datos["numero_lote"]).strip()
        datos["fecha_vencimiento"] = date.fromisoformat(str(datos["fecha_vencimiento"]))
    except (KeyError, TypeError, ValueError) as exc:
        raise AccionInvalidaError("La confirmación no es válida") from exc
    if not datos["numero_lote"] or len(datos["numero_lote"]) > 100:
        raise AccionInvalidaError("El número de lote de la confirmación no es válido")
    if datos["fecha_vencimiento"] <= date.today():
        raise AccionInvalidaError("La fecha de vencimiento del lote ya no es válida")
    return datos


# primer mensaje legible de un error de validacion de pydantic
def _mensaje_validacion(exc: ValidationError) -> str:
    errores = exc.errors()
    if not errores:
        return "Los datos de la confirmación no son válidos"
    msg = str(errores[0].get("msg", "")).removeprefix("Value error, ")
    return msg or "Los datos de la confirmación no son válidos"


# ejecuta el ingreso confirmado por el usuario. adjust_stock hace el unico commit
def confirmar_ingreso(db: Session, *, token: str, usuario: Usuario) -> dict:
    datos = _leer_token(token, usuario)
    marca = f"[{datos['jti']}]"

    # el mismo token no se puede aplicar dos veces: la marca queda en el kardex
    ya_aplicado = db.scalar(
        select(MovimientoInventario.id_movimiento)
        .where(MovimientoInventario.motivo.like(f"%{marca}"))
        .limit(1)
    )
    if ya_aplicado is not None:
        raise AccionYaEjecutadaError("Esta acción ya fue confirmada antes")

    try:
        entrada = StockAdjustIn(
            id_producto=datos["id_producto"],
            id_sucursal=datos["id_sucursal"],
            cantidad=datos["cantidad"],
            numero_lote=datos["numero_lote"],
            fecha_vencimiento=datos["fecha_vencimiento"],
            motivo=f"Ingreso por Copilot {marca}",
        )
    except ValidationError as exc:
        raise AccionInvalidaError(_mensaje_validacion(exc)) from exc
    resultado = inventory_service.adjust_stock(db, entrada, usuario.id_usuario)
    return {
        "mensaje": (
            f"Listo: se agregaron {datos['cantidad']} unidades de {resultado['producto_nombre']} "
            f"en {resultado['sucursal_nombre']} (lote {datos['numero_lote']}). "
            f"Stock actual: {resultado['cantidad']}."
        ),
        "producto": resultado["producto_nombre"],
        "sucursal": resultado["sucursal_nombre"],
        "cantidad": datos["cantidad"],
        "stock_nuevo": resultado["cantidad"],
    }