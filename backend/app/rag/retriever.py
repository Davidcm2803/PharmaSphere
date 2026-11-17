from qdrant_client.models import FieldCondition, Filter, MatchValue

from app.core.config import settings
from app.rag import embeddings, vector_store


def buscar(
    texto: str,
    limite: int = 3,
    coleccion: str | None = None,
    model_name: str | None = None,
    solo_publico: bool = False,
) -> list[dict]:
    nombre = coleccion or settings.rag_coleccion
    if not vector_store.collection_exists(nombre):
        return []
    vector = embeddings.embed_query(texto, model_name=model_name)

    filtro = None
    if solo_publico:
        # visible para clientes: fichas de producto, o documentos marcados como publicos
        filtro = Filter(
            should=[
                FieldCondition(key="origen", match=MatchValue(value="producto")),
                FieldCondition(key="publico", match=MatchValue(value=True)),
            ]
        )
    return vector_store.search(nombre, vector, limit=limite, filtro=filtro)