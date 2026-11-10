# Caché con Redis: guarda resultados de consultas pesadas con un tiempo de vida (TTL).
# Si Redis falla, la app sigue funcionando consultando la base de datos.

import hashlib
import json
import logging
import time
from functools import wraps
from typing import Any, Callable, Optional

import redis

from app.core.config import settings

log = logging.getLogger("cache")

# Segundos sin intentar Redis después de un fallo de conexión.
RETRY_SEGS = 10

_client: Optional[redis.Redis] = None
_retry_at = 0.0


# Devuelve el cliente de Redis, o None si la caché está deshabilitada o en pausa por un fallo.
def _get_client() -> Optional[redis.Redis]:
    global _client
    if not settings.cache_enabled:
        return None
    if time.monotonic() < _retry_at:
        return None
    if _client is None:
        _client = redis.Redis.from_url(
            settings.redis_url,
            socket_connect_timeout=0.3,
            socket_timeout=0.3,
            decode_responses=True,
        )
    return _client


# Registra el error y pausa Redis RETRY_SEGS segundos para no hacer esperar cada request.
def _fail(exc: Exception) -> None:
    global _retry_at
    _retry_at = time.monotonic() + RETRY_SEGS
    log.warning("Redis no disponible, se consulta la BD directamente: %s", exc)


# Agrega el prefijo configurado a la clave ("reports:summary" queda "ps:reports:summary").
def _k(key: str) -> str:
    return f"{settings.cache_prefix}{key}"


# Devuelve el valor guardado (ya convertido de JSON), o None si no existe, expiró o Redis falla.
def get_json(key: str) -> Any:
    client = _get_client()
    if client is None:
        return None
    try:
        raw = client.get(_k(key))
        return json.loads(raw) if raw is not None else None
    except Exception as exc:
        _fail(exc)
        return None


# Guarda el valor como JSON y lo hace expirar solo a los ttl segundos.
def set_json(key: str, value: Any, ttl: int) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        client.setex(_k(key), ttl, json.dumps(value, default=str))
    except Exception as exc:
        _fail(exc)


# Borra una o varias claves exactas.
def delete(*keys: str) -> None:
    client = _get_client()
    if client is None or not keys:
        return
    try:
        client.delete(*[_k(k) for k in keys])
    except Exception as exc:
        _fail(exc)


# Borra las claves que coinciden con un patrón ("reports:*"); usa SCAN para no bloquear Redis.
def delete_pattern(pattern: str) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        lote = []
        for key in client.scan_iter(match=_k(pattern), count=200):
            lote.append(key)
            if len(lote) >= 200:
                client.delete(*lote)
                lote = []
        if lote:
            client.delete(*lote)
    except Exception as exc:
        _fail(exc)


# Indica si Redis responde; lo usa el endpoint /health.
def ping() -> bool:
    client = _get_client()
    if client is None:
        return False
    try:
        return bool(client.ping())
    except Exception as exc:
        _fail(exc)
        return False


# Arma la clave de una llamada: el prefijo más un hash de los argumentos, para que cada combinación tenga la suya.
def make_key(prefix: str, args: tuple, kwargs: dict) -> str:
    if not args and not kwargs:
        return prefix
    raw = json.dumps([args, sorted(kwargs.items())], default=str, sort_keys=True)
    return f"{prefix}:{hashlib.md5(raw.encode()).hexdigest()[:16]}"


# Decorador: cachea el resultado ttl segundos; la función debe recibir db primero (no entra en la clave).
def cached(prefix: str, ttl: int) -> Callable:
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(db, *args, **kwargs):
            key = make_key(prefix, args, kwargs)
            hit = get_json(key)
            if hit is not None:
                return hit
            result = fn(db, *args, **kwargs)
            set_json(key, result, ttl)
            return result

        return wrapper

    return decorator


# Se llama DESPUÉS del db.commit() cuando cambia un producto: borra catálogo, categorías, más vendidos y reportes.
def invalidate_catalog() -> None:
    delete_pattern("products:*")
    delete_pattern("categories:*")
    delete_pattern("bestsellers:*")
    delete_pattern("reports:*")


# Se llama DESPUÉS del db.commit() cuando cambia stock o hay venta/compra: borra el listado de productos y los reportes.
def invalidate_stock() -> None:
    delete_pattern("products:list:*")
    delete_pattern("reports:*")