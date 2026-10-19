import logging
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Callable, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.config import settings
from app.services import (
    copilot_actions_service,
    directory_service,
    inventory_service,
    lot_service,
    rag_service,
    report_service,
    sales_service,
)

logger = logging.getLogger(__name__)

_LIMITE_FILAS = 30
# solo se muestran como fuente los fragmentos cuyo score esta cerca del mejor
_MARGEN_FUENTES = 0.05

# (datos para el LLM, fuentes para el usuario)
Resultado = Tuple[Any, List[dict]]

# CONTRATO con los modulos que aun estan vacios (se buscan por nombre, asi que
# cuando existan las herramientas empiezan a funcionar sin tocar este archivo):
#   sales_service.sales_summary(db, *, desde: date, hasta: date) -> dict
#   report_service.top_products(db, *, desde: date, hasta: date, limite: int) -> list[dict]
# Deben devolver datos serializables a JSON y NUNCA costo ni ganancia
_NO_DISPONIBLE = {"disponible": False, "nota": "Esta consulta todavía no está implementada en el sistema"}


class ArgumentoInvalidoError(Exception):
    pass


@dataclass(frozen=True)
class Contexto:
    db: Session
    id_usuario: int
    rol: str


def _fuente(tipo: str, titulo: str, detalle: Optional[str] = None) -> dict:
    return {"tipo": tipo, "titulo": titulo, "detalle": detalle}


def _bd(titulo: str, detalle: str) -> List[dict]:
    return [_fuente("base_de_datos", titulo, detalle)]


def _entero(valor, defecto, minimo: int, maximo: int):
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        return defecto
    return max(minimo, min(maximo, numero))


def _fecha(valor, nombre: str) -> date:
    try:
        return date.fromisoformat(str(valor))
    except ValueError:
        raise ArgumentoInvalidoError(f"{nombre} debe tener formato AAAA-MM-DD")


def _fila_inventario(f: dict) -> dict:
    return {
        "producto": f["producto_nombre"],
        "sucursal": f["sucursal_nombre"],
        "cantidad": f["cantidad"],
        "stock_minimo": f["stock_minimo"],
        "stock_bajo": f["stock_bajo"],
    }


# lectura docuemntos

def _buscar_conocimiento(ctx: Contexto, args: dict) -> Resultado:
    pregunta = str(args.get("pregunta") or "").strip()
    if not pregunta:
        raise ArgumentoInvalidoError("Falta la pregunta a buscar")
    resultados = rag_service.buscar(pregunta, _entero(args.get("limite"), 3, 1, 5))
    if not resultados:
        return {"fragmentos": [], "nota": "No hay documentos relacionados"}, []

    datos = {
        "fragmentos": [
            {"origen": r["origen"], "titulo": r["titulo"], "texto": r["fragmento"]}
            for r in resultados
        ]
    }
    mejor = max(r["score"] for r in resultados)
    fuentes, vistos = [], set()
    for r in resultados:
        if r["score"] < mejor - _MARGEN_FUENTES:
            continue
        tipo = "producto" if r["origen"] == "producto" else "documento"
        if (tipo, r["titulo"]) in vistos:
            continue
        vistos.add((tipo, r["titulo"]))
        fuentes.append(_fuente(tipo, r["titulo"]))
    return datos, fuentes


# lectur inventario

def _consultar_stock(ctx: Contexto, args: dict) -> Resultado:
    nombre = str(args.get("nombre_producto") or "").strip()
    if not nombre:
        raise ArgumentoInvalidoError("Falta el nombre del producto")
    filas = inventory_service.list_inventory(
        ctx.db, id_sucursal=None, id_producto=None, q=nombre, low_stock=False
    )
    if not filas:
        return {"total": 0, "inventario": [], "nota": "No hay inventario registrado para ese nombre"}, []
    datos = {"total": len(filas), "inventario": [_fila_inventario(f) for f in filas[:_LIMITE_FILAS]]}
    return datos, _bd("Inventario", f"Stock de «{nombre}»")


def _productos_stock_bajo(ctx: Contexto, args: dict) -> Resultado:
    filas = inventory_service.list_inventory(
        ctx.db,
        id_sucursal=_entero(args.get("id_sucursal"), None, 1, 10**9),
        id_producto=None,
        q=None,
        low_stock=True,
    )
    if not filas:
        return {"total": 0, "inventario": [], "nota": "No hay productos con stock bajo"}, []
    datos = {"total": len(filas), "inventario": [_fila_inventario(f) for f in filas[:_LIMITE_FILAS]]}
    return datos, _bd("Inventario", "Productos con stock bajo")


def _ranking_stock(ctx: Contexto, args: dict) -> Resultado:
    menor = str(args.get("orden") or "mayor").lower() == "menor"
    limite = _entero(args.get("limite"), 5, 1, 10)
    filas = inventory_service.list_stock_totals(ctx.db, limite=limite, ascendente=menor)
    if not filas:
        return {"productos": [], "nota": "No hay productos con inventario registrado"}, []
    return {"orden": "menor" if menor else "mayor", "productos": filas}, _bd(
        "Inventario", "Ranking de stock por producto"
    )


def _buscar_productos(ctx: Contexto, args: dict) -> Resultado:
    filas = directory_service.list_products(
        ctx.db,
        q=str(args.get("q") or ""),
        categoria=str(args.get("categoria") or ""),
        limite=_entero(args.get("limite"), 15, 1, _LIMITE_FILAS),
    )
    if not filas:
        return {"productos": [], "nota": "No hay productos que coincidan"}, []
    return {"total": len(filas), "productos": filas}, _bd("Productos", "Catálogo")


def _productos_por_vencer(ctx: Contexto, args: dict) -> Resultado:
    hoy = date.today()
    if args.get("este_mes") is True:
        # desde el dia 1 para incluir lo que ya vencio este mes
        desde = hoy.replace(day=1)
        hasta = (desde.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    else:
        desde, hasta = hoy, hoy + timedelta(days=_entero(args.get("dias"), 30, 1, 365))

    filas = lot_service.list_expiring(ctx.db, desde=desde, hasta=hasta, limite=_LIMITE_FILAS)
    rango = {"desde": desde.isoformat(), "hasta": hasta.isoformat()}
    if not filas:
        return {**rango, "lotes": [], "nota": "No hay lotes que venzan en ese rango"}, []
    lotes = [
        {
            "producto": f["producto_nombre"],
            "sucursal": f["sucursal_nombre"],
            "numero_lote": f["numero_lote"],
            "fecha_vencimiento": f["fecha_vencimiento"],
            "cantidad": f["cantidad"],
            "ya_vencido": f["ya_vencido"],
        }
        for f in filas
    ]
    return {**rango, "lotes": lotes}, _bd("Lotes", f"Vencimientos del {desde} al {hasta}")


# lectura ventas (pendientes de implementar)

def _ventas_por_rango(ctx: Contexto, args: dict) -> Resultado:
    desde, hasta = _fecha(args.get("desde"), "desde"), _fecha(args.get("hasta"), "hasta")
    if desde > hasta:
        raise ArgumentoInvalidoError("desde no puede ser mayor que hasta")
    resumen = getattr(sales_service, "sales_summary", None)
    if resumen is None:
        return _NO_DISPONIBLE, []
    datos = {
        "desde": desde.isoformat(),
        "hasta": hasta.isoformat(),
        "resumen": resumen(ctx.db, desde=desde, hasta=hasta),
    }
    return datos, _bd("Ventas", f"Del {desde} al {hasta}")


def _top_productos(ctx: Contexto, args: dict) -> Resultado:
    hoy = date.today()
    desde = _fecha(args["desde"], "desde") if args.get("desde") else hoy - timedelta(days=30)
    hasta = _fecha(args["hasta"], "hasta") if args.get("hasta") else hoy
    if desde > hasta:
        raise ArgumentoInvalidoError("desde no puede ser mayor que hasta")
    top = getattr(report_service, "top_products", None)
    if top is None:
        return _NO_DISPONIBLE, []
    limite = _entero(args.get("limite"), 5, 1, 10)
    datos = {
        "desde": desde.isoformat(),
        "hasta": hasta.isoformat(),
        "productos": top(ctx.db, desde=desde, hasta=hasta, limite=limite),
    }
    return datos, _bd("Ventas", f"Top productos del {desde} al {hasta}")


# lectura directorio

def _listar_sucursales(ctx: Contexto, args: dict) -> Resultado:
    filas = directory_service.list_branches(ctx.db, solo_activas=args.get("incluir_inactivas") is not True)
    if not filas:
        return {"sucursales": [], "nota": "No hay sucursales registradas"}, []
    return {"total": len(filas), "sucursales": filas}, _bd("Sucursales", "Listado de sucursales")


def _listar_empleados(ctx: Contexto, args: dict) -> Resultado:
    filas = directory_service.list_employees(
        ctx.db,
        solo_activos=args.get("incluir_inactivos") is not True,
        q=str(args.get("q") or ""),
    )
    if not filas:
        return {"empleados": [], "nota": "No hay empleados que coincidan"}, []
    return {"total": len(filas), "empleados": filas}, _bd("Empleados", "Listado de empleados")


def _listar_proveedores(ctx: Contexto, args: dict) -> Resultado:
    filas = directory_service.list_suppliers(
        ctx.db,
        solo_activos=args.get("incluir_inactivos") is not True,
        q=str(args.get("q") or ""),
        producto=str(args.get("producto") or ""),
    )
    if not filas:
        return {"proveedores": [], "nota": "No hay proveedores que coincidan"}, []
    return {"total": len(filas), "proveedores": filas}, _bd("Proveedores", "Listado de proveedores")


# escritura prepara unicamente

def _cantidad_ingreso(valor) -> int:
    if isinstance(valor, bool) or (isinstance(valor, float) and not valor.is_integer()):
        raise ArgumentoInvalidoError("La cantidad debe ser un número entero")
    try:
        cantidad = int(valor)
    except (TypeError, ValueError):
        raise ArgumentoInvalidoError("La cantidad debe ser un número entero")
    if not 1 <= cantidad <= settings.copilot_max_ingreso:
        raise ArgumentoInvalidoError(f"La cantidad debe estar entre 1 y {settings.copilot_max_ingreso}")
    return cantidad


def _elegir(nombre_pedido: str, opciones: List[dict]) -> Tuple[Optional[dict], List[dict]]:
    """(elegido, candidatos). Elegido solo si hay una coincidencia exacta o una unica."""
    exactas = [o for o in opciones if o["nombre"].lower() == nombre_pedido.lower()]
    if len(exactas) == 1:
        return exactas[0], opciones
    if len(opciones) == 1:
        return opciones[0], opciones
    return None, opciones


def _preparar_ingreso_stock(ctx: Contexto, args: dict) -> Resultado:
    nombre = str(args.get("nombre_producto") or "").strip()
    if not nombre:
        raise ArgumentoInvalidoError("Falta el nombre del producto")
    cantidad = _cantidad_ingreso(args.get("cantidad"))

    candidatos = directory_service.find_products(ctx.db, nombre)
    if not candidatos and " " in nombre:
        candidatos = directory_service.find_products(ctx.db, nombre.split()[0])
    if not candidatos:
        return {
            "estado": "producto_no_encontrado",
            "nota": "No existe un producto activo con ese nombre. No lo crees ni adivines: díselo al usuario.",
        }, []
    producto, _ = _elegir(nombre, candidatos)
    if producto is None:
        return {
            "estado": "ambiguo",
            "opciones": [c["nombre"] for c in candidatos],
            "nota": "Pregunta al usuario cuál de estos productos es.",
        }, []

    activas = directory_service.list_branches(ctx.db, solo_activas=True)
    if not activas:
        return {"estado": "sin_sucursales", "nota": "No hay sucursales activas."}, []
    opciones_sucursal = [s["nombre"] for s in activas]
    pedida = str(args.get("sucursal") or "").strip()
    if pedida:
        coinciden = [s for s in activas if pedida.lower() in s["nombre"].lower()]
        sucursal, _ = _elegir(pedida, coinciden) if coinciden else (None, [])
        if not coinciden:
            return {"estado": "sucursal_no_encontrada", "opciones": opciones_sucursal}, []
        if sucursal is None:
            return {"estado": "ambiguo", "opciones": [s["nombre"] for s in coinciden]}, []
    elif len(activas) == 1:
        sucursal = activas[0]
    else:
        return {
            "estado": "falta_sucursal",
            "opciones": opciones_sucursal,
            "nota": "Pregunta en cuál sucursal ingresa la mercadería.",
        }, []

    filas = inventory_service.get_product_stock(ctx.db, producto["id_producto"])
    actual = next((f["cantidad"] for f in filas if f["id_sucursal"] == sucursal["id_sucursal"]), 0)
    resumen = (
        f"Agregar {cantidad} unidades de {producto['nombre']} en {sucursal['nombre']} "
        f"(stock: {actual} → {actual + cantidad})"
    )
    token = copilot_actions_service.crear_token_ingreso(
        id_usuario=ctx.id_usuario,
        id_producto=producto["id_producto"],
        producto=producto["nombre"],
        id_sucursal=sucursal["id_sucursal"],
        sucursal=sucursal["nombre"],
        cantidad=cantidad,
    )
    datos = {
        "estado": "pendiente_confirmacion",
        "resumen": resumen,
        "nota": "NADA se ha guardado todavía. Repite el resumen y pide confirmar.",
        # copilot_service lo separa: el LLM nunca ve el token
        "_accion": {"tipo": "ingreso_stock", "resumen": resumen, "token": token},
    }
    return datos, []


# registro 

@dataclass(frozen=True)
class Herramienta:
    nombre: str
    descripcion: str
    parametros: dict
    funcion: Callable[[Contexto, dict], Resultado]
    solo_admin: bool = False


def _params(propiedades: dict, requeridos: Optional[List[str]] = None) -> dict:
    return {"type": "object", "properties": propiedades, "required": requeridos or []}


HERRAMIENTAS = {
    h.nombre: h
    for h in [
        Herramienta(
            "buscar_conocimiento",
            "Busca en documentos internos (manuales, políticas, fichas de medicamentos) y en el catálogo. "
            "Úsala para procedimientos, políticas de la farmacia e información de un medicamento.",
            _params({"pregunta": {"type": "string", "description": "Qué se quiere saber, en lenguaje natural"}}, ["pregunta"]),
            _buscar_conocimiento,
        ),
        Herramienta(
            "consultar_stock",
            "Stock actual de un producto en cada sucursal. Usa solo el nombre principal (ej. 'paracetamol'), "
            "sin concentración ni presentación.",
            _params({"nombre_producto": {"type": "string"}}, ["nombre_producto"]),
            _consultar_stock,
        ),
        Herramienta(
            "productos_stock_bajo",
            "Productos cuyo stock está por debajo del mínimo, en todas las sucursales o en una.",
            _params({"id_sucursal": {"type": "integer", "description": "Opcional: limita a una sucursal"}}),
            _productos_stock_bajo,
        ),
        Herramienta(
            "ranking_stock",
            "Ranking de productos por stock total (suma de todas las sucursales). Úsala para "
            "'qué productos tienen más inventario' o 'cuáles tienen menos'.",
            _params({
                "orden": {"type": "string", "enum": ["mayor", "menor"], "description": "mayor = más stock primero"},
                "limite": {"type": "integer", "description": "1 a 10, por defecto 5"},
            }),
            _ranking_stock,
        ),
        Herramienta(
            "buscar_productos",
            "Lista productos del catálogo con categoría, precio, si requiere receta y stock total. "
            "Úsala para 'qué productos tenemos', productos de una categoría o buscar por nombre.",
            _params({
                "q": {"type": "string", "description": "Parte del nombre, opcional"},
                "categoria": {"type": "string", "description": "Opcional"},
                "limite": {"type": "integer", "description": "1 a 30, por defecto 15"},
            }),
            _buscar_productos,
        ),
        Herramienta(
            "productos_por_vencer",
            "Lotes con stock que vencen pronto. Para 'este mes' usa este_mes=true; "
            "para otros plazos usa dias (por defecto 30).",
            _params({
                "dias": {"type": "integer", "description": "Días hacia adelante desde hoy (1 a 365)"},
                "este_mes": {"type": "boolean", "description": "true = todo el mes en curso"},
            }),
            _productos_por_vencer,
        ),
        Herramienta(
            "ventas_por_rango",
            "Resumen de ventas entre dos fechas.",
            _params({
                "desde": {"type": "string", "description": "AAAA-MM-DD"},
                "hasta": {"type": "string", "description": "AAAA-MM-DD"},
            }, ["desde", "hasta"]),
            _ventas_por_rango,
        ),
        Herramienta(
            "top_productos",
            "Productos más vendidos en un rango de fechas (por defecto, los últimos 30 días).",
            _params({
                "desde": {"type": "string", "description": "AAAA-MM-DD, opcional"},
                "hasta": {"type": "string", "description": "AAAA-MM-DD, opcional"},
                "limite": {"type": "integer", "description": "1 a 10, por defecto 5"},
            }),
            _top_productos,
        ),
        Herramienta(
            "listar_sucursales",
            "Sucursales de la farmacia (activas por defecto) con dirección y teléfono.",
            _params({"incluir_inactivas": {"type": "boolean"}}),
            _listar_sucursales,
        ),
        Herramienta(
            "listar_empleados",
            "Empleados con puesto y sucursal (activos por defecto). Solo para administradores.",
            _params({
                "q": {"type": "string", "description": "Nombre o puesto, opcional"},
                "incluir_inactivos": {"type": "boolean"},
            }),
            _listar_empleados,
            solo_admin=True,
        ),
        Herramienta(
            "listar_proveedores",
            "Proveedores con contacto, teléfono y correo (activos por defecto). Con 'producto' devuelve "
            "el proveedor de ese producto. Solo para administradores.",
            _params({
                "q": {"type": "string", "description": "Nombre del proveedor, opcional"},
                "producto": {"type": "string", "description": "Nombre del producto, opcional"},
                "incluir_inactivos": {"type": "boolean"},
            }),
            _listar_proveedores,
            solo_admin=True,
        ),
        Herramienta(
            "preparar_ingreso_stock",
            "Prepara el ingreso de unidades de un producto al inventario. NO guarda nada: genera una "
            "confirmación que el usuario aprueba. Úsala cuando digan 'agrega/ingresa N unidades de X'. "
            "Usa exactamente la cantidad dicha.",
            _params({
                "nombre_producto": {"type": "string", "description": "Ej. 'Paracetamol 500 mg'"},
                "cantidad": {"type": "integer", "description": "Unidades que ingresan (entero positivo)"},
                "sucursal": {"type": "string", "description": "Nombre de la sucursal, solo si el usuario la dijo"},
            }, ["nombre_producto", "cantidad"]),
            _preparar_ingreso_stock,
        ),
    ]
}


# definiciones en el formato de tool calling; el rol filtra lo que el LLM puede ver
def definiciones(rol: str) -> List[dict]:
    return [
        {"type": "function", "function": {"name": h.nombre, "description": h.descripcion, "parameters": h.parametros}}
        for h in HERRAMIENTAS.values()
        if not h.solo_admin or rol == "admin"
    ]


# nunca lanza: si algo falla se le devuelve el error al LLM para que lo explique
def ejecutar(ctx: Contexto, nombre: str, args: dict) -> Resultado:
    herramienta = HERRAMIENTAS.get(nombre)
    if herramienta is None:
        return {"error": f"La herramienta «{nombre}» no existe"}, []
    if herramienta.solo_admin and ctx.rol != "admin":
        return {"error": "Esta consulta solo está disponible para administradores"}, []
    try:
        return herramienta.funcion(ctx, args)
    except (ArgumentoInvalidoError, rag_service.BusquedaError) as exc:
        return {"error": str(exc)}, []
    except Exception:
        logger.exception("Falló la herramienta %s", nombre)
        ctx.db.rollback()
        return {"error": "No se pudo consultar la información"}, []