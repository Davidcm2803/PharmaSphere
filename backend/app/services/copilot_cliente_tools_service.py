import logging
from dataclasses import dataclass
from typing import Any, Callable, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.services import directory_service, rag_service, support_ticket_service

logger = logging.getLogger(__name__)

Resultado = Tuple[Any, List[dict]]
_MARGEN_FUENTES = 0.05


class ArgumentoInvalidoError(Exception):
    pass


@dataclass(frozen=True)
class Contexto:
    db: Session
    usuario: "Usuario"


def _fuente(tipo: str, titulo: str) -> dict:
    return {"tipo": tipo, "titulo": titulo, "detalle": None}


def _buscar_conocimiento(ctx: Contexto, args: dict) -> Resultado:
    pregunta = str(args.get("pregunta") or "").strip()
    if not pregunta:
        raise ArgumentoInvalidoError("Falta la pregunta a buscar")
    resultados = rag_service.buscar(pregunta, limite=3, solo_publico=True)
    if not resultados:
        return {"fragmentos": [], "nota": "No hay información pública relacionada"}, []

    datos = {
        "fragmentos": [
            {"titulo": r["titulo"], "texto": r["fragmento"]} for r in resultados
        ]
    }
    mejor = max(r["score"] for r in resultados)
    fuentes, vistos = [], set()
    for r in resultados:
        if r["score"] < mejor - _MARGEN_FUENTES or r["titulo"] in vistos:
            continue
        vistos.add(r["titulo"])
        fuentes.append(_fuente("documento", r["titulo"]))
    return datos, fuentes


def _consultar_producto(ctx: Contexto, args: dict) -> Resultado:
    nombre = str(args.get("nombre_producto") or "").strip()
    if not nombre:
        raise ArgumentoInvalidoError("Falta el nombre del producto")
    filas = directory_service.list_products(ctx.db, q=nombre, categoria=None, limite=5)
    if not filas:
        return {"productos": [], "nota": "No encontré ese producto en el catálogo"}, []

    # solo campos de cara al publico: nunca costo, ni stock exacto por sucursal
    publicos = [
        {
            "nombre": p["producto"],
            "categoria": p["categoria"],
            "precio": p["precio"],
            "requiere_receta": p["requiere_receta"],
            "disponible": p["stock_total"] > 0,
        }
        for p in filas
    ]
    return {"productos": publicos}, [_fuente("producto", nombre)]


def _listar_sucursales(ctx: Contexto, args: dict) -> Resultado:
    filas = directory_service.list_branches(ctx.db, solo_activas=True)
    if not filas:
        return {"sucursales": []}, []
    publicas = [{"nombre": s["nombre"], "direccion": s.get("direccion"), "telefono": s.get("telefono")} for s in filas]
    return {"sucursales": publicas}, [_fuente("base_de_datos", "Sucursales")]


def _escalar_a_encargado(ctx: Contexto, args: dict) -> Resultado:
    motivo = str(args.get("motivo") or "El usuario pidió hablar con un encargado").strip()
    mensaje = str(args.get("resumen_conversacion") or motivo).strip()
    caso = support_ticket_service.crear_caso(
        ctx.db, usuario=ctx.usuario, nivel="moderado", motivo=motivo, mensaje=mensaje
    )
    datos = {
        "estado": "escalado",
        "referencia": caso.id_caso,
        "nota": "Caso registrado para un encargado. Informa al usuario la referencia.",
    }
    return datos, []


@dataclass(frozen=True)
class Herramienta:
    nombre: str
    descripcion: str
    parametros: dict
    funcion: Callable[[Contexto, dict], Resultado]


HERRAMIENTAS = {
    h.nombre: h
    for h in [
        Herramienta(
            "buscar_conocimiento",
            "Busca en fichas de medicamentos y documentos públicos (uso, "
            "advertencias generales, FAQ). No da diagnósticos ni dosis.",
            {
                "type": "object",
                "properties": {"pregunta": {"type": "string"}},
                "required": ["pregunta"],
            },
            _buscar_conocimiento,
        ),
        Herramienta(
            "consultar_producto",
            "Precio, categoría, si requiere receta y disponibilidad general de un "
            "producto del catálogo. Úsala siempre antes de hablar de comprar algo.",
            {
                "type": "object",
                "properties": {"nombre_producto": {"type": "string"}},
                "required": ["nombre_producto"],
            },
            _consultar_producto,
        ),
        Herramienta(
            "listar_sucursales",
            "Sucursales activas con dirección y teléfono.",
            {"type": "object", "properties": {}},
            _listar_sucursales,
        ),
        Herramienta(
            "escalar_a_encargado",
            "Registra el caso para que un encargado humano contacte al usuario. "
            "Úsala si el usuario pide hablar con una persona, o necesita una "
            "receta/autorización que tú no puedes dar.",
            {
                "type": "object",
                "properties": {
                    "motivo": {"type": "string"},
                    "resumen_conversacion": {"type": "string"},
                },
                "required": ["motivo"],
            },
            _escalar_a_encargado,
        ),
    ]
}


def definiciones() -> List[dict]:
    return [
        {"type": "function", "function": {"name": h.nombre, "description": h.descripcion, "parameters": h.parametros}}
        for h in HERRAMIENTAS.values()
    ]


def ejecutar(ctx: Contexto, nombre: str, args: dict) -> Resultado:
    herramienta = HERRAMIENTAS.get(nombre)
    if herramienta is None:
        return {"error": f"La herramienta «{nombre}» no existe"}, []
    try:
        return herramienta.funcion(ctx, args)
    except (ArgumentoInvalidoError, rag_service.BusquedaError) as exc:
        return {"error": str(exc)}, []
    except Exception:
        logger.exception("Falló la herramienta cliente %s", nombre)
        ctx.db.rollback()
        return {"error": "No se pudo consultar la información"}, []