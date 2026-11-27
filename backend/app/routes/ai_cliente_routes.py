from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import require_role
from app.models.user_model import Usuario
from app.schemas.ai_schema import ChatClienteResponse, ChatRequest
from app.services import copilot_cliente_service

router = APIRouter()


@router.post("/chat/cliente", response_model=ChatClienteResponse)
def chat_cliente(
    data: ChatRequest,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_role("cliente")),
):
    try:
        return copilot_cliente_service.responder(
            db, pregunta=data.pregunta, historial=data.historial, usuario=user
        )
    except copilot_cliente_service.CopilotClienteNoConfiguradoError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except copilot_cliente_service.CopilotClienteError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))