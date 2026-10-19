import logging
from typing import List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    pass


class LLMNoConfiguradoError(LLMError):
    pass


# una llamada a /chat/completions. Devuelve el mensaje del asistente (dict)
def chat_completion(mensajes: List[dict], herramientas: Optional[List[dict]] = None) -> dict:
    if not settings.llm_api_key:
        raise LLMNoConfiguradoError("El asistente no está configurado (falta LLM_API_KEY)")

    payload = {"model": settings.llm_model, "messages": mensajes, "temperature": 0.2}
    if herramientas:
        payload["tools"] = herramientas
        payload["tool_choice"] = "auto"

    try:
        resp = httpx.post(
            f"{settings.llm_base_url.rstrip('/')}/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            timeout=settings.llm_timeout_seg,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]
    except httpx.HTTPStatusError as exc:
        estado = exc.response.status_code
        logger.error("El LLM respondió %s: %s", estado, exc.response.text[:300])
        if estado == 429:
            raise LLMError("El asistente alcanzó su límite de uso, intenta en un momento") from exc
        raise LLMError("El proveedor del modelo respondió con un error") from exc
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        logger.exception("No se pudo consultar el LLM")
        raise LLMError("No se pudo conectar con el asistente") from exc