import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


def error_response(status_code: int, message: str, details=None, headers=None):
    """Formato uniforme para TODOS los errores de la API."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "status_code": status_code,
            "message": message,
            "details": details,
        },
        headers=headers,
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return error_response(
        exc.status_code, str(exc.detail), headers=getattr(exc, "headers", None)
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = [
        {
            "field": ".".join(str(part) for part in err["loc"][1:]),
            "message": err["msg"],
        }
        for err in exc.errors()
    ]
    return error_response(422, "Datos inválidos", details)


async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Error no controlado: %s", exc)
    return error_response(500, "Error interno del servidor")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)