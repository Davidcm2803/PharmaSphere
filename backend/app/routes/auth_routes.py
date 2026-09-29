from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import get_current_user, require_role
from app.models.user_model import Usuario
from app.schemas.user_schema import TokenOut, UserLogin, UserOut, UserRegister
from app.services import auth_service

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if auth_service.get_user_by_email(db, data.correo):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese correo",
        )
    # El registro público siempre crea clientes
    return auth_service.create_user(db, data, rol="cliente")


@router.post("/login", response_model=TokenOut)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, data.correo, data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenOut(access_token=auth_service.create_access_token(user), user=user)


@router.get("/me", response_model=UserOut)
def me(current_user: Usuario = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    """Ruta solo para admin (401 sin token, 403 si no es admin)."""
    return db.query(Usuario).order_by(Usuario.id_usuario).all()