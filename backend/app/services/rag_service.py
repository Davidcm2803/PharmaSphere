import logging
from typing import List

from app.rag import retriever

logger = logging.getLogger(__name__)


class BusquedaError(Exception):
    pass


# busqueda semantica: devuelve fragmentos de documentos y productos
def buscar(pregunta: str, limite: int = 3) -> List[dict]:
    try:
        crudos = retriever.buscar(pregunta, limite=limite)
    except Exception as exc:
        logger.exception("Falló la búsqueda semántica")
        raise BusquedaError("No se pudo consultar el buscador semántico") from exc

    resultados = []
    for r in crudos:
        p = r.get("payload") or {}
        resultados.append(
            {
                "origen": p.get("origen", "documento"),
                "id_documento": p.get("id_documento"),
                "id_producto": p.get("id_producto"),
                "titulo": p.get("titulo", ""),
                "fragmento": p.get("texto", ""),
                "indice_chunk": p.get("indice_chunk"),
                "score": r["score"],
            }
        )
    return resultados