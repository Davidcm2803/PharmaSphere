from app.core.config import settings
from app.rag import embeddings, vector_store

COLLECTION = "test_rag"


def main() -> None:
    # revisa que el backend llegue a qdrant
    client = vector_store.get_client()
    nombres = [c.name for c in client.get_collections().collections]
    print(f"Conectado a Qdrant en {settings.qdrant_url} colecciones: {nombres}")

    dim = embeddings.get_dimension()
    print(f"Modelo: {settings.embedding_model} con {dim} dimensiones")

    # coleccion de prueba nueva
    vector_store.ensure_collection(COLLECTION, dim, recreate=True)
    print(f"Coleccion {COLLECTION} creada")

    # guarda tres vectores de ejemplo
    docs = [
        "El ibuprofeno se usa para el dolor y la inflamacion.",
        "El paracetamol baja la fiebre y alivia el dolor leve.",
        "La loratadina es un antihistaminico para la alergia.",
    ]
    vectors = embeddings.embed_texts(docs, kind="passage")
    vector_store.upsert(
        COLLECTION,
        [
            {"id": i, "vector": v, "payload": {"texto": d}}
            for i, (d, v) in enumerate(zip(docs, vectors), start=1)
        ],
    )
    print(f"{len(docs)} vectores guardados")

    # busca con una pregunta en lenguaje normal
    pregunta = "que me tomo si tengo fiebre"
    hits = vector_store.search(COLLECTION, embeddings.embed_query(pregunta), limit=3)
    print(f"Busqueda: {pregunta}")
    for h in hits:
        print(f"  {h['score']:.3f}  {h['payload']['texto']}")

    # el primer resultado debe ser el paracetamol
    assert "paracetamol" in hits[0]["payload"]["texto"].lower(), "Resultado inesperado"
    print("OK guardar y buscar funciona")

    # limpia la coleccion de prueba
    vector_store.delete_collection(COLLECTION)
    print(f"Coleccion {COLLECTION} eliminada")


if __name__ == "__main__":
    main()