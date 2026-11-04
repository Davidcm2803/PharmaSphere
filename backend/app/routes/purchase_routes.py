from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.purchase_schema import (
    CompraCreate, CompraOut, CompraReceive, LoteOut, RecepcionOut,
)
from app.services import purchase_service
from app.services.purchase_service import PurchaseError

router = APIRouter()


@router.get("/")
def list_purchases():
    return {"message": "purchases endpoint working"}


@router.post("", response_model=CompraOut, status_code=201)
def crear_compra(datos: CompraCreate, db: Session = Depends(get_db)):
    try:
        return purchase_service.crear_compra(db, datos)
    except PurchaseError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post("/{id_compra}/receive", response_model=RecepcionOut)
def recibir_compra(id_compra: int, datos: CompraReceive, db: Session = Depends(get_db)):
    try:
        compra, lotes = purchase_service.recibir_compra(db, id_compra, datos)
    except PurchaseError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    return RecepcionOut(
        compra=CompraOut.model_validate(compra),
        lotes=[LoteOut.model_validate(l) for l in lotes],
    )