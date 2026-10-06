from functools import lru_cache

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.core.config import settings


# un solo cliente para todo el backend
@lru_cache(maxsize=1)
def get_client() -> QdrantClient:
    return QdrantClient(url=settings.qdrant_url)


# crea la coleccion si no existe y con recreate la borra y la crea de nuevo
def ensure_collection(name: str, dim: int, recreate: bool = False) -> None:
    client = get_client()
    exists = client.collection_exists(name)
    if exists and recreate:
        client.delete_collection(name)
        exists = False
    if not exists:
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )


# cada punto es un dict con id vector y payload
def upsert(name: str, points: list[dict]) -> None:
    get_client().upsert(
        collection_name=name,
        points=[
            PointStruct(id=p["id"], vector=p["vector"], payload=p.get("payload", {}))
            for p in points
        ],
    )


# devuelve los puntos mas parecidos con su score
def search(name: str, vector: list[float], limit: int = 3) -> list[dict]:
    res = get_client().query_points(
        collection_name=name, query=vector, limit=limit, with_payload=True
    )
    return [{"id": r.id, "score": r.score, "payload": r.payload} for r in res.points]


def delete_collection(name: str) -> None:
    client = get_client()
    if client.collection_exists(name):
        client.delete_collection(name)