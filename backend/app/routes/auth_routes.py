from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth_dependencies import get_current_user, require_role
from app.models.user_model import Usuario
from app.schemas.user_schema import (
    FirebaseLogin,
    TokenOut,
    UserCreateAdmin,
    UserLogin,
    UserOut,
    UserRegister,
)
from app.services import auth_service, firebase_service

router = APIRouter()

#Registro publico: siempre crea clientes
@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if auth_service.get_user_by_email(db, data.correo):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese correo",
        )
    return auth_service.create_user(
        db,
        nombre=data.nombre,
        correo=data.correo,
        password=data.password,
        rol="cliente",
    )

#Login local con correo y contrasena (admin y empleados creados sin Firebase)
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

#Intercambia un idToken de Firebase por el JWT propio de la app
@router.post("/firebase", response_model=TokenOut)
def firebase_login(data: FirebaseLogin, db: Session = Depends(get_db)):
    try:
        claims = firebase_service.verify_firebase_token(data.id_token)
    except firebase_service.InvalidFirebaseToken:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de Firebase inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user = auth_service.login_with_firebase(db, claims, data.nombre)
    except auth_service.FirebaseAuthError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Usuario deshabilitado"
        )

    return TokenOut(access_token=auth_service.create_access_token(user), user=user)


@router.get("/me", response_model=UserOut)
def me(current_user: Usuario = Depends(get_current_user)):
    return current_user

#Solo admin (401 sin token, 403 si no es admin)
@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    return db.query(Usuario).order_by(Usuario.id_usuario).all()

#Solo admin: da acceso a una persona agregando su correo y su rol.
#Cuando entre con Firebase, el backend la vincula por correo
@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user_admin(
    data: UserCreateAdmin,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role("admin")),
):
    if auth_service.get_user_by_email(db, data.correo):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese correo",
        )
    return auth_service.invite_user(
        db,
        nombre=data.nombre,
        correo=data.correo,
        rol=data.rol.value,
        id_empleado=data.id_empleado,
    )