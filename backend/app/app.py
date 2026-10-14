from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.middlewares.auth_middleware import AuthMiddleware
from app.middlewares.error_handler import register_exception_handlers
from app.routes import (
    ai_routes,
    auth_routes,
    branches_routes,
    customers_routes,
    employees_routes,
    inventory_routes,
    products_routes,
    purchase_routes,
    reports_routes,
    sales_routes,
    suppliers_routes,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crea las tablas que falten (ej. "usuario") sin tocar las existentes
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="PharmaSphere API", version="0.1.0", lifespan=lifespan)

register_exception_handlers(app)

app.add_middleware(AuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])
app.include_router(products_routes.router, prefix="/api/products", tags=["products"])
app.include_router(products_routes.categories_router, prefix="/api/categories", tags=["products"])
app.include_router(branches_routes.router, prefix="/api/branches", tags=["branches"])
app.include_router(employees_routes.router, prefix="/api/employees", tags=["employees"])
app.include_router(inventory_routes.router, prefix="/api/inventory", tags=["inventory"])
app.include_router(sales_routes.router, prefix="/api/sales", tags=["sales"])
app.include_router(purchase_routes.router, prefix="/api/purchases", tags=["purchases"])
app.include_router(suppliers_routes.router, prefix="/api/suppliers", tags=["suppliers"])
app.include_router(customers_routes.router, prefix="/api/customers", tags=["customers"])
app.include_router(reports_routes.router, prefix="/api/reports", tags=["reports"])
app.include_router(ai_routes.router, prefix="/api/ai", tags=["ai"])


@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.environment}