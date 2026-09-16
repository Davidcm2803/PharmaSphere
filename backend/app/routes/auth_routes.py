from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def list_auth():
    return {"message": "auth endpoint working"}
