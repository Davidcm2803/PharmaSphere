from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.core.config import settings


# los modelos e5 necesitan un prefijo delante de cada texto
def _usa_prefijo_e5(model_name: str) -> bool:
    return "e5" in model_name.lower()


# el modelo se carga una sola vez por nombre y queda en memoria
@lru_cache(maxsize=4)
def _cargar(model_name: str) -> SentenceTransformer:
    return SentenceTransformer(model_name, device="cpu")


# si no se pasa nombre se usa el que esta en la config
def get_model(model_name: str | None = None) -> SentenceTransformer:
    return _cargar(model_name or settings.embedding_model)


def get_dimension(model_name: str | None = None) -> int:
    return get_model(model_name).get_sentence_embedding_dimension()


# kind es passage para documentos y query para preguntas
def embed_texts(
    texts: list[str],
    kind: str = "passage",
    model_name: str | None = None,
) -> list[list[float]]:
    name = model_name or settings.embedding_model
    if _usa_prefijo_e5(name):
        texts = [f"{kind}: {t}" for t in texts]
    # vectores normalizados asi el producto punto es el coseno
    vectors = get_model(name).encode(
        texts, normalize_embeddings=True, show_progress_bar=False
    )
    return vectors.tolist()


def embed_query(text: str, model_name: str | None = None) -> list[float]:
    return embed_texts([text], kind="query", model_name=model_name)[0]