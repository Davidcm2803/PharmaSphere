from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def list_ai():
    return {"message": "ai endpoint working"}
