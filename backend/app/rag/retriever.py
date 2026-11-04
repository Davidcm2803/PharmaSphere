from app.core.config import settings
from app.rag import embeddings, vector_store


# dada una pregunta devuelve los fragmentos mas parecidos [{id, score, payload}]
def buscar(
    texto: str,
    limite: int = 3,
    coleccion: str | None = None,
    model_name: str | None = None,
) -> list[dict]:
    nombre = coleccion or settings.rag_coleccion
    # si todavia no se indexo nada no hay nada que buscar
    if not vector_store.collection_exists(nombre):
        return []
    vector = embeddings.embed_query(texto, model_name=model_name)
    return vector_store.search(nombre, vector, limit=limite)