from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models.support_ticket_model import CasoEscalado
from app.models.user_model import Usuario
from app.utils.pagination import PageParams, paginate


class CasoEscaladoError(Exception):
    """El caso no existe o la transición de estado no es válida. La ruta responde 404/409."""


def crear_caso(db: Session, *, usuario: Usuario, nivel: str, motivo: str, mensaje: str) -> CasoEscalado:
    caso = CasoEscalado(
        id_usuario=usuario.id_usuario,
        nivel=nivel,
        motivo=motivo or "No especificado",
        mensaje_usuario=mensaje[:2000],
        estado="abierto",
    )
    db.add(caso)
    db.commit()
    db.refresh(caso)
    return caso


def mensaje_emergencia() -> str:
    return (
        f"Esto puede ser una emergencia médica. Por favor comunícate de inmediato al "
        f"{settings.telefono_emergencias} o acude al servicio de urgencias más cercano. "
        "No puedo ayudarte con esto por chat."
    )


def mensaje_grave(caso: CasoEscalado) -> str:
    return (
        "Esto lo debe revisar un farmacéutico, no yo. Dejé registrado tu caso "
        f"(referencia #{caso.id_caso}) para que un encargado te contacte. "
        f"Si prefieres, también puedes llamar directo al {settings.telefono_farmacia}."
    )


def _with_relations(stmt):
    return stmt.options(
        selectinload(CasoEscalado.usuario),
        selectinload(CasoEscalado.empleado),
    )


def get_caso(db: Session, id_caso: int) -> Optional[CasoEscalado]:
    return db.scalar(_with_relations(select(CasoEscalado)).where(CasoEscalado.id_caso == id_caso))


def list_casos(
    db: Session, *, estado: Optional[str], nivel: Optional[str], params: PageParams
) -> Tuple[List[CasoEscalado], int]:
    stmt = _with_relations(select(CasoEscalado)).order_by(
        CasoEscalado.created_at.desc(), CasoEscalado.id_caso.desc()
    )
    if estado:
        stmt = stmt.where(CasoEscalado.estado == estado)
    if nivel:
        stmt = stmt.where(CasoEscalado.nivel == nivel)
    rows, total = paginate(db, stmt, params)
    return [row[0] for row in rows], total


# un empleado "toma" el caso: queda asignado a el y pasa a atendido.
# si ya lo tomo otro empleado, es un conflicto (no se le quita el caso a quien ya responde)
def tomar_caso(db: Session, id_caso: int, empleado_usuario: Usuario) -> CasoEscalado:
    caso = db.scalar(select(CasoEscalado).where(CasoEscalado.id_caso == id_caso).with_for_update())
    if caso is None:
        raise CasoEscaladoError("El caso no existe")
    if caso.estado == "cerrado":
        raise CasoEscaladoError("El caso ya está cerrado")

    id_empleado = empleado_usuario.id_empleado
    es_admin = empleado_usuario.rol == "admin"

    if id_empleado is None and not es_admin:
        raise CasoEscaladoError("Tu usuario no está vinculado a un registro de empleado")

    if (
        id_empleado is not None
        and caso.id_empleado_atiende is not None
        and caso.id_empleado_atiende != id_empleado
        and not es_admin
    ):
        raise CasoEscaladoError("Otro encargado ya tomó este caso")

    if id_empleado is not None:
        caso.id_empleado_atiende = id_empleado
    caso.estado = "atendido"
    db.commit()
    return get_caso(db, caso.id_caso)


def cerrar_caso(db: Session, id_caso: int) -> CasoEscalado:
    caso = db.scalar(select(CasoEscalado).where(CasoEscalado.id_caso == id_caso).with_for_update())
    if caso is None:
        raise CasoEscaladoError("El caso no existe")
    if caso.estado == "cerrado":
        raise CasoEscaladoError("El caso ya está cerrado")
    caso.estado = "cerrado"
    db.commit()
    return get_caso(db, caso.id_caso)


def reabrir_caso(db: Session, id_caso: int) -> CasoEscalado:
    caso = db.scalar(select(CasoEscalado).where(CasoEscalado.id_caso == id_caso).with_for_update())
    if caso is None:
        raise CasoEscaladoError("El caso no existe")
    if caso.estado != "cerrado":
        raise CasoEscaladoError("El caso no está cerrado")
    caso.estado = "abierto"
    caso.id_empleado_atiende = None
    db.commit()
    return get_caso(db, caso.id_caso)


def to_out(caso: CasoEscalado) -> dict:
    usuario = caso.usuario
    empleado = caso.empleado
    return {
        "id_caso": caso.id_caso,
        "nivel": caso.nivel,
        "motivo": caso.motivo,
        "mensaje_usuario": caso.mensaje_usuario,
        "estado": caso.estado,
        "created_at": caso.created_at,
        "id_usuario": caso.id_usuario,
        "cliente_nombre": usuario.nombre if usuario else None,
        "cliente_correo": usuario.correo if usuario else None,
        "id_empleado_atiende": caso.id_empleado_atiende,
        "empleado_nombre": empleado.nombre if empleado else None,
    }