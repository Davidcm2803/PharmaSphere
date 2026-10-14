# PharmaSphere

Plataforma full-stack de gestión farmacéutica y e-commerce construida sobre una arquitectura orientada a datos, integrando PostgreSQL para operaciones transaccionales e inventario,
búsqueda semántica mediante embeddings y un pipeline RAG para consultar documentación, ventas e información operativa. 
Incluye un asistente de IA capaz de combinar recuperación semántica con consultas estructuradas para analizar inventario, detectar productos próximos a vencer, interpretar tendencias de ventas y generar 
recomendaciones basadas en el contexto real del negocio.


## Enfoque

El sistema tiene dos frentes:

- **Cliente**: catálogo de productos, búsqueda, carrito y compra.
- **Administración**: inventario multi-sucursal, ventas, proveedores, recetas, reportes y un asistente de IA (Pharmacy Copilot).

## Tecnologías

**Frontend**
- React + Vite
- Tailwind CSS v4
- Context API para autenticación y carrito

**Backend**
- FastAPI
- SQLAlchemy + Alembic
- Pydantic / Pydantic Settings
- PostgreSQL

**IA / RAG**
- Qdrant (vector database)
- sentence-transformers (embeddings)
- LLM vía API para generación de respuestas

**Infraestructura**
- Docker y Docker Compose
- Servicios separados: base de datos, motor vectorial y backend, cada uno en su propio contenedor

  
## Modelo de embeddings

Modelo elegido: `intfloat/multilingual-e5-small` (384 dimensiones, corre en CPU).

Se comparó con 10 preguntas en español sobre 10 documentos de farmacia
(`docker compose exec backend python -m app.test.compare_embeddings`):

| Modelo | Dim | Top-1 | Top-3 | Embedding |
|---|---|---|---|---|
| paraphrase-multilingual-MiniLM-L12-v2 | 384 | 6/10 | 9/10 | 0.43 s |
| multilingual-e5-small | 384 | 8/10 | 10/10 | 0.34 s |
| multilingual-e5-base | 768 | 8/10 | 10/10 | 0.95 s |

Por qué se eligió e5-small:
- Más precisión que MiniLM en búsquedas en español.
- Misma precisión que e5-base con la mitad de dimensiones, menos espacio en Qdrant y más velocidad.
- Pesa 471 MB frente a 1.11 GB de e5-base.
- Acepta textos de hasta 512 tokens (MiniLM solo 128), lo que da más libertad al dividir documentos.

Notas:
- Los modelos e5 necesitan los prefijos `query:` y `passage:`. Lo maneja `app/rag/embeddings.py`.
- El modelo se cambia con la variable `EMBEDDING_MODEL` en `backend/.env`. Si la nueva dimensión es distinta, hay que recrear las colecciones de Qdrant.
- Los modelos se guardan en el volumen `pharmasphere_hf_cache`, así que solo se descargan una vez.
- Prueba de conexión a Qdrant: `docker compose exec backend python -m app.test.test_qdrant`.

## Estructura del proyecto

```
PharmaSphere/
├── docker-compose.yaml
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env
│   ├── requirements.txt
│   └── app/
│       ├── app.py
│       ├── core/
│       │   └── config.py
│       ├── db/
│       │   ├── base.py
│       │   ├── session.py
│       │   ├── pharmasphere.dbml
│       │   └── init/
│       │       ├── init.sql
│       │       └── seed.sql
│       ├── models/
│       │   ├── customer_model.py
│       │   ├── document_model.py
│       │   ├── inventory_model.py
│       │   ├── lot_model.py
│       │   ├── product_model.py
│       │   ├── purchase_model.py
│       │   ├── sale_model.py
│       │   ├── supplier_model.py
│       │   └── user_model.py
│       ├── schemas/
│       │   ├── ai_schema.py
│       │   ├── inventory_schema.py
│       │   ├── product_schema.py
│       │   ├── sale_schema.py
│       │   └── user_schema.py
│       ├── routes/
│       │   ├── ai_routes.py
│       │   ├── auth_routes.py
│       │   ├── customers_routes.py
│       │   ├── inventory_routes.py
│       │   ├── purchase_routes.py
│       │   ├── reports_routes.py
│       │   ├── sales_routes.py
│       │   └── suppliers_routes.py
│       ├── services/
│       │   ├── auth_service.py
│       │   ├── embedding_service.py
│       │   ├── forecast_service.py
│       │   ├── inventory_service.py
│       │   ├── purchase_service.py
│       │   ├── rag_service.py
│       │   ├── report_service.py
│       │   ├── sales_service.py
│       │   └── supplier_service.py
│       ├── rag/
│       │   ├── chunker.py
│       │   ├── embeddings.py
│       │   ├── loader.py
│       │   ├── retriever.py
│       │   └── vector_store.py
│       ├── middlewares/
│       │   ├── auth_middleware.py
│       │   └── error_handler.py
│       ├── dependencies/
│       │   └── auth_dependencies.py
│       ├── utils/
│       │   ├── pagination.py
│       │   └── validators.py
│       └── test/
│           ├── test_ai.py
│           ├── test_inventory.py
│           └── test_sales.py
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── eslint.config.js
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── assets/
        ├── components/
        ├── config/
        ├── context/
        ├── data/
        ├── hooks/
        ├── lib/
        └── pages/
```

## Servicios en Docker

- **db**: PostgreSQL 16, almacena todo el dato transaccional (productos, inventario, ventas, clientes, proveedores, recetas).
- **qdrant**: motor de búsqueda vectorial, almacena embeddings de documentos para RAG.
- **backend**: API de FastAPI, expone endpoints REST y orquesta las consultas a PostgreSQL y Qdrant.
