from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes import (
    auth_routes,
    inventory_routes,
    sales_routes,
    purchase_routes,
    suppliers_routes,
    customers_routes,
    reports_routes,
    ai_routes,
)

app = FastAPI(title="PharmaSphere API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])
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
