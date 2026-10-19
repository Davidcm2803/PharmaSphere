import argparse
import importlib
import logging
from pathlib import Path
from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document_model import Documento
from app.models.product_model import Producto
from app.rag import chunker, embeddings, loader, vector_store
from app.utils.pagination import PageParams, paginate
from app.utils.sql import escape_like

logger = logging.getLogger(__name__)

# cuantos fragmentos se embeben y suben a qdrant por tanda
_LOTE = 64


class ArchivoInvalidoError(Exception):
    pass


class ArchivoDemasiadoGrandeError(ArchivoInvalidoError):
    pass


class IndexacionError(Exception):
    pass


def limite_subida_bytes() -> int:
    return settings.rag_max_upload_mb * 1024 * 1024


# embebe y sube los textos por tandas. Las 3 listas van en el mismo orden
def _subir(textos: List[str], claves: List[str], payloads: List[dict]) -> None:
    for i in range(0, len(textos), _LOTE):
        tanda = textos[i : i + _LOTE]
        vectores = embeddings.embed_texts(tanda, kind="passage")
        puntos = [
            {
                "id": vector_store.punto_id(clave),
                "vector": vector,
                "payload": {**payload, "texto": texto},
            }
            for clave, vector, payload, texto in zip(
                claves[i : i + _LOTE], vectores, payloads[i : i + _LOTE], tanda
            )
        ]
        vector_store.upsert(settings.rag_coleccion, puntos)


# chunk + embed + upsert de un documento. No hace commit. Devuelve cuantos fragmentos
def _indexar_documento(documento: Documento) -> int:
    fragmentos = chunker.dividir_texto(
        documento.contenido or "", settings.rag_chunk_size, settings.rag_chunk_overlap
    )
    if not fragmentos:
        raise ArchivoInvalidoError("El documento no tiene texto para indexar")
    id_doc = documento.id_documento
    try:
        vector_store.ensure_collection(settings.rag_coleccion, embeddings.get_dimension())
        # si ya estaba indexado se limpian los vectores viejos
        vector_store.delete_by_documento(settings.rag_coleccion, id_doc)
        _subir(
            fragmentos,
            [f"documento:{id_doc}:{i}" for i in range(len(fragmentos))],
            [
                {
                    "origen": "documento",
                    "id_documento": id_doc,
                    "titulo": documento.titulo,
                    "tipo": documento.tipo,
                    "indice_chunk": i,
                }
                for i in range(len(fragmentos))
            ],
        )
    except Exception as exc:
        logger.exception("Falló la indexación del documento %s", id_doc)
        raise IndexacionError("No se pudo indexar el documento en Qdrant") from exc
    return len(fragmentos)


def _borrar_vectores(id_documento: int) -> None:
    try:
        vector_store.delete_by_documento(settings.rag_coleccion, id_documento)
    except Exception:
        logger.exception("No se pudieron limpiar los vectores del documento %s", id_documento)


# guarda el documento e indexa sus fragmentos en UNA transaccion
# si qdrant falla se hace rollback y no queda nada a medias
def crear_documento(
    db: Session,
    *,
    nombre_archivo: str,
    datos: bytes,
    titulo: Optional[str],
    tipo: Optional[str],
    id_usuario: Optional[int],
) -> Tuple[Documento, int]:
    if len(datos) > limite_subida_bytes():
        raise ArchivoDemasiadoGrandeError(
            f"El archivo supera el máximo de {settings.rag_max_upload_mb} MB"
        )
    try:
        texto = loader.extraer_texto(nombre_archivo, datos)
    except loader.ContenidoInvalidoError as exc:
        raise ArchivoInvalidoError(str(exc)) from exc

    nombre_base = Path(nombre_archivo).stem.replace("_", " ").strip().capitalize()
    documento = Documento(
        titulo=((titulo or "").strip() or nombre_base)[:200],
        tipo=((tipo or "").strip() or None),
        contenido=texto,
        ruta=nombre_archivo[:500],
        id_usuario=id_usuario,
    )
    db.add(documento)
    db.flush()  # para tener el id_documento
    id_doc = documento.id_documento
    try:
        fragmentos = _indexar_documento(documento)
        documento.indexado = True
        db.commit()
    except Exception:
        db.rollback()
        _borrar_vectores(id_doc)
        raise
    db.refresh(documento)
    return documento, fragmentos


def list_documentos(
    db: Session, *, q: Optional[str], params: PageParams
) -> Tuple[List[Documento], int]:
    stmt = select(Documento).order_by(Documento.created_at.desc(), Documento.id_documento.desc())
    if q and q.strip():
        stmt = stmt.where(Documento.titulo.ilike(f"%{escape_like(q.strip())}%", escape="\\"))
    rows, total = paginate(db, stmt, params)
    return [row[0] for row in rows], total


# indexa los productos activos (solo nombre, categoria, descripcion y receta)
# se borran primero los vectores de productos para sacar los que ya no estan activos
def indexar_productos(db: Session) -> int:
    productos = list(
        db.scalars(
            select(Producto).where(Producto.activo.is_(True)).order_by(Producto.id_producto)
        )
    )
    try:
        vector_store.ensure_collection(settings.rag_coleccion, embeddings.get_dimension())
        vector_store.delete_by_payload(settings.rag_coleccion, "origen", "producto")
        if productos:
            _subir(
                [loader.producto_a_texto(p) for p in productos],
                [f"producto:{p.id_producto}" for p in productos],
                [
                    {"origen": "producto", "id_producto": p.id_producto, "titulo": p.nombre}
                    for p in productos
                ],
            )
    except Exception as exc:
        logger.exception("Falló la indexación de productos")
        raise IndexacionError("No se pudieron indexar los productos en Qdrant") from exc
    return len(productos)


# util al cambiar de modelo de embeddings: recrea la coleccion y reindexa todo
def reindexar_todo(db: Session) -> Tuple[int, int]:
    try:
        vector_store.ensure_collection(
            settings.rag_coleccion, embeddings.get_dimension(), recreate=True
        )
    except Exception as exc:
        logger.exception("No se pudo recrear la colección")
        raise IndexacionError("No se pudo recrear la colección en Qdrant") from exc
    documentos = list(db.scalars(select(Documento).where(Documento.contenido.is_not(None))))
    fragmentos = 0
    for documento in documentos:
        fragmentos += _indexar_documento(documento)
        documento.indexado = True
    db.commit()
    return len(documentos), fragmentos


# carga una carpeta de .txt/.md/.pdf. Si el archivo ya esta cargado (mismo nombre) se salta
def cargar_carpeta(db: Session, carpeta: Path) -> List[Documento]:
    existentes = set(db.scalars(select(Documento.ruta)))
    creados: List[Documento] = []
    for archivo in sorted(carpeta.iterdir()):
        if not archivo.is_file() or not loader.extension_valida(archivo.name):
            continue
        if archivo.name in existentes:
            print(f"- {archivo.name}: ya estaba cargado, se omite")
            continue
        # el prefijo del nombre es el tipo: manual_..., politica_..., ficha_...
        documento, fragmentos = crear_documento(
            db,
            nombre_archivo=archivo.name,
            datos=archivo.read_bytes(),
            titulo=None,
            tipo=archivo.stem.split("_")[0],
            id_usuario=None,
        )
        print(f"- {archivo.name}: {fragmentos} fragmentos")
        creados.append(documento)
    return creados


def _main() -> None:
    from app.db.session import get_db

    # registra todos los modelos para que las relaciones (Usuario, etc.) se resuelvan
    import app.models.branch_model  # noqa: F401
    import app.models.customer_model  # noqa: F401
    import app.models.document_model  # noqa: F401
    import app.models.employee_model  # noqa: F401
    import app.models.inventory_model  # noqa: F401
    import app.models.lot_model  # noqa: F401
    import app.models.movement_model  # noqa: F401
    import app.models.product_model  # noqa: F401
    import app.models.purchase_model  # noqa: F401
    import app.models.recipe_model  # noqa: F401
    import app.models.sale_model  # noqa: F401
    import app.models.supplier_model  # noqa: F401
    import app.models.user_model  # noqa: F401

    parser = argparse.ArgumentParser(description="Carga de datos para el RAG")
    parser.add_argument("--carpeta", help="carpeta con .txt, .md o .pdf")
    parser.add_argument("--productos", action="store_true", help="indexa los productos activos")
    parser.add_argument("--recrear", action="store_true", help="recrea la colección y reindexa todo")
    args = parser.parse_args()

    gen = get_db()
    db = next(gen)
    try:
        if args.recrear:
            docs, frags = reindexar_todo(db)
            print(f"Reindexados {docs} documentos ({frags} fragmentos)")
        if args.carpeta:
            cargar_carpeta(db, Path(args.carpeta))
        if args.productos:
            print(f"Productos indexados: {indexar_productos(db)}")
    finally:
        gen.close()


if __name__ == "__main__":
    _main()