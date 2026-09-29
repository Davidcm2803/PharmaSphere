from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.services import auth_service


class AuthMiddleware(BaseHTTPMiddleware):
    """Lee el header Authorization en cada request y deja el payload del JWT en
    request.state.token_payload (o None si no hay token o es inválido).

    No bloquea nada: quien decide si la ruta exige login o un rol son las
    dependencias (get_current_user / require_role).
    """

    async def dispatch(self, request: Request, call_next):
        request.state.token_payload = None

        auth_header = request.headers.get("Authorization", "")
        scheme, _, token = auth_header.partition(" ")
        if scheme.lower() == "bearer" and token:
            request.state.token_payload = auth_service.decode_access_token(token)

        return await call_next(request)