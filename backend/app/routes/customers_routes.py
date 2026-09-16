from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def list_customers():
    return {"message": "customers endpoint working"}
