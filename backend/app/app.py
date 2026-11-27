
import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles

from app.core import cache
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine, SessionLocal
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
    recipes_routes,
    reports_routes,
    sales_routes,
    suppliers_routes,
)
from app.services.embedding_service import cargar_carpeta

logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).resolve().parents[1] / "static"
(STATIC_DIR / "productos").mkdir(parents=True, exist_ok=True)

TAGS_METADATA = [
    {
        "name": "auth",
        "description": """
        **Autenticación y gestión de sesiones.**

        Permite iniciar sesión y obtener las credenciales necesarias
        para acceder a las operaciones protegidas de PharmaSphere.

        Ejemplo: POST /api/auth/login.
        """,
    },
    {
        "name": "products",
        "description": """
        **Catálogo de medicamentos y productos.**

        Consulta de productos, información, categorías y disponibilidad
        del catálogo.
        
        Ejemplo: GET /api/products.
        """,
    },
    {
        "name": "branches",
        "description": """
        **Gestión de sucursales.**

        Consulta y administración de las diferentes sucursales
        de la farmacia.
        """,
    },
    {
        "name": "employees",
        "description": """
        **Gestión de empleados.**

        Administración de los empleados asociados a las sucursales.
        """,
    },
    {
        "name": "inventory",
        "description": """
        **Control de inventario y lotes.**

        Permite consultar existencias, identificar productos con stock bajo,
        consultar lotes vencidos y próximos a vencer, realizar ajustes
        y transferir existencias entre sucursales.

        Ejemplos:
        - GET /api/inventory
        - GET /api/inventory/expiring?days=30
        - GET /api/inventory/expired
        - POST /api/inventory/transfer

        Acceso: administrador y empleado.
        """,
    },
    {
        "name": "sales",
        "description": """
        **Gestión de ventas y pedidos.**

        Incluye ventas de mostrador, pedidos en línea, historial de compras
        y consulta de productos más vendidos.

        Ejemplos:
        - GET /api/sales
        - GET /api/sales/top-products
        - GET /api/sales/me
        - POST /api/sales/mostrador

        Los permisos dependen de la operación y del rol autenticado.
        """,
    },
    {
        "name": "purchases",
        "description": """
        **Compras y recepción de productos.**

        Gestión de órdenes de compra, detalles y recepción de mercancía.
        """,
    },
    {
        "name": "suppliers",
        "description": """
        **Administración de proveedores.**

        Consulta y gestión de los proveedores de la farmacia.
        """,
    },
    {
        "name": "customers",
        "description": """
        **Administración de clientes.**

        Consulta y gestión de perfiles e información de clientes.
        """,
    },
    {
        "name": "recipes",
        "description": """
        **Gestión de recetas médicas.**

        Administración y validación de recetas asociadas a los clientes
        y a los productos que requieren prescripción.
        """,
    },
    {
        "name": "reports",
        "description": """
        **Reportes y análisis del negocio.**

        Proporciona indicadores de ventas, productos más vendidos,
        rendimiento por sucursal, movimientos y alertas.

        Ejemplos:
        - GET /api/reports/summary
        - GET /api/reports/sales-by-day?desde=2026-09-01&hasta=2026-11-27
        - GET /api/reports/top-products
        - GET /api/reports/alerts

        Acceso: administrador.
        """,
    },
    {
        "name": "ai",
        "description": """
        **Pharmacy Copilot y recuperación aumentada por generación (RAG).**

        Permite realizar búsquedas semánticas, consultar documentación
        y utilizar el asistente de IA para obtener información del negocio.

        Ejemplos:
        - POST /api/ai/search
        - POST /api/ai/chat
        - GET /api/ai/documents
        - POST /api/ai/documents

        Acceso: administrador y empleado.
        """,
    },
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crea las tablas que falten sin modificar las existentes.
    Base.metadata.create_all(bind=engine)

    # Carga los documentos de demostración al iniciar el backend.
    carpeta_demo = (
        Path(__file__).resolve().parent
        / "rag"
        / "demo_documents"
    )

    if carpeta_demo.exists():
        for intento in range(1, 6):
            db = SessionLocal()

            try:
                documentos = cargar_carpeta(db, carpeta_demo)

                logger.info(
                    "Carga RAG finalizada. Documentos nuevos: %s",
                    len(documentos),
                )
                break

            except Exception:
                db.rollback()

                if intento == 5:
                    logger.exception(
                        "No se pudieron cargar los documentos demo al RAG."
                    )
                else:
                    logger.warning(
                        "Qdrant o el servicio de embeddings todavía no están "
                        "disponibles. Reintento %s/5.",
                        intento,
                    )
                    await asyncio.sleep(3)

            finally:
                db.close()

    else:
        logger.warning(
            "No se encontró la carpeta de documentos demo: %s",
            carpeta_demo,
        )

    yield


app = FastAPI(
    title="PharmaSphere API",
    description="""
# PharmaSphere API

API REST para la administración de una plataforma farmacéutica.

La aplicación integra:

- Gestión de productos y clientes.
- Control de inventario y lotes.
- Ventas y compras.
- Administración de sucursales y empleados.
- Reportes y análisis de datos.
- Pharmacy Copilot con recuperación RAG.

## Cómo probar la API

1. Seleccione el módulo que desea consultar.
2. Abra el endpoint correspondiente.
3. Presione **Try it out**.
4. Complete los parámetros o el cuerpo de la solicitud.
5. Presione **Execute**.
6. Revise el código HTTP y la respuesta obtenida.

Las operaciones protegidas requieren el rol correspondiente.
Consulte el endpoint de autenticación cuando necesite iniciar sesión.

## Documentación adicional

- `/docs`: Swagger UI.
- `/redoc`: documentación alternativa.
- `/openapi.json`: especificación OpenAPI.
""",
    version="1.0.0",
    openapi_tags=TAGS_METADATA,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


def custom_openapi():
    """
    Enriquece el esquema OpenAPI con ejemplos de solicitudes
    y descripciones adicionales para los módulos principales.
    """
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        tags=TAGS_METADATA,
    )

    examples = {
        "ChatRequest": {
            "examples": [
                {
                    "pregunta": "¿Qué productos están próximos a vencer?",
                    "historial": [],
                    "voz": False,
                }
            ]
        },
        "SearchRequest": {
            "examples": [
                {
                    "pregunta": "Política de vencimiento de medicamentos",
                    "limite": 3,
                }
            ]
        },
        "SaleCreate": {
            "examples": [
                {
                    "id_sucursal": 1,
                    "items": [
                        {
                            "id_producto": 1,
                            "cantidad": 2,
                        },
                        {
                            "id_producto": 2,
                            "cantidad": 1,
                        },
                    ],
                    "telefono": "8888-1111",
                    "cedula": "1-1111-1111",
                }
            ]
        },
        "SaleCounterCreate": {
            "examples": [
                {
                    "id_sucursal": 1,
                    "items": [
                        {
                            "id_producto": 1,
                            "cantidad": 2,
                        }
                    ],
                    "cedula_cliente": "1-1111-1111",
                    "metodo_pago": "tarjeta",
                    "tarjeta_ultimos_4": "4242",
                }
            ]
        },
        "StockAddIn": {
            "examples": [
                {
                    "id_producto": 1,
                    "id_sucursal": 1,
                    "cantidad": 20,
                    "stock_minimo": 30,
                    "motivo": "Ingreso de inventario demo",
                }
            ]
        },
        "StockAdjustIn": {
            "examples": [
                {
                    "id_producto": 1,
                    "id_sucursal": 1,
                    "cantidad": -2,
                    "motivo": "Ajuste por inventario físico",
                    "stock_minimo": None,
                }
            ]
        },
        "StockTransferIn": {
            "examples": [
                {
                    "id_producto": 1,
                    "id_origen": 1,
                    "id_destino": 2,
                    "cantidad": 5,
                    "motivo": "Reposición entre sucursales",
                }
            ]
        },
    }

    components = schema.setdefault("components", {}).setdefault(
        "schemas", {}
    )

    for schema_name, example_data in examples.items():
        if schema_name in components:
            components[schema_name].update(example_data)

    module_descriptions = {
        "auth": "Módulo de autenticación y control de acceso.",
        "products": "Módulo de consulta y administración del catálogo.",
        "branches": "Módulo de gestión de sucursales.",
        "employees": "Módulo de administración de empleados.",
        "inventory": "Módulo de inventario, existencias y lotes.",
        "sales": "Módulo de ventas, pedidos e historial comercial.",
        "purchases": "Módulo de compras y recepción de mercancía.",
        "suppliers": "Módulo de gestión de proveedores.",
        "customers": "Módulo de gestión de clientes.",
        "recipes": "Módulo de administración de recetas.",
        "reports": "Módulo de reportes e indicadores del negocio.",
        "ai": "Módulo de inteligencia artificial y recuperación RAG.",
    }

    for path_data in schema.get("paths", {}).values():
        for operation in path_data.values():
            if not isinstance(operation, dict):
                continue

            tags = operation.get("tags", [])

            if tags:
                module = tags[0]
                description = module_descriptions.get(module)

                if description:
                    existing = operation.get("description", "")
                    operation["description"] = (
                        f"{existing}\n\n{description}"
                    ).strip()

    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi

register_exception_handlers(app)

app.add_middleware(AuthMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CachedStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)

        if response.status_code == 200:
            if path.startswith("productos/cutout"):
                response.headers["Cache-Control"] = "public, max-age=3600"
            else:
                response.headers["Cache-Control"] = (
                    "public, max-age=31536000, immutable"
                )

        return response


app.mount(
    "/static",
    CachedStaticFiles(directory=STATIC_DIR),
    name="static",
)

app.include_router(
    auth_routes.router,
    prefix="/api/auth",
    tags=["auth"],
)

app.include_router(
    products_routes.router,
    prefix="/api/products",
    tags=["products"],
)

app.include_router(
    products_routes.categories_router,
    prefix="/api/categories",
    tags=["products"],
)

app.include_router(
    branches_routes.router,
    prefix="/api/branches",
    tags=["branches"],
)

app.include_router(
    employees_routes.router,
    prefix="/api/employees",
    tags=["employees"],
)

app.include_router(
    inventory_routes.router,
    prefix="/api/inventory",
    tags=["inventory"],
)

app.include_router(
    sales_routes.router,
    prefix="/api/sales",
    tags=["sales"],
)

app.include_router(
    purchase_routes.router,
    prefix="/api/purchases",
    tags=["purchases"],
)

app.include_router(
    suppliers_routes.router,
    prefix="/api/suppliers",
    tags=["suppliers"],
)

app.include_router(
    customers_routes.router,
    prefix="/api/customers",
    tags=["customers"],
)

app.include_router(
    recipes_routes.router,
    prefix="/api/recipes",
    tags=["recipes"],
)

app.include_router(
    reports_routes.router,
    prefix="/api/reports",
    tags=["reports"],
)

app.include_router(
    ai_routes.router,
    prefix="/api/ai",
    tags=["ai"],
)


@app.get(
    "/health",
    summary="Verificar el estado del backend",
    description="Comprueba que la API está funcionando y devuelve información del entorno.",
)
def health_check():
    return {
        "status": "ok",
        "environment": settings.environment,
        "cache": cache.ping(),
    }
