# Catálogo público – Implementation Docs

## Overview

- **Goal:** permitir que una persona visitante explore, filtre y busque productos, y consulte su detalle con información clara sobre disponibilidad y receta médica.
- **Scope:** Home pública, catálogo, búsqueda, filtros, paginación, detalle, `ProductCard` y estados asíncronos. No incluye carrito, checkout ni autenticación.

## Architecture

- **Key Files:**
  - `frontend/src/App.jsx`: navegación liviana basada en History API.
  - `frontend/src/pages/`: Home, catálogo y detalle de producto.
  - `frontend/src/components/`: encabezado, pie, tarjetas y estados reutilizables.
  - `frontend/src/services/productService.js`: único punto de integración con la API y normalización del contrato.
  - `frontend/src/hooks/useProducts.js`: estado de carga, error, reintento y cancelación de solicitudes.
  - `frontend/src/data/products.js`: datos semilla usados únicamente como fallback local.
- **Data Flow:** la UI construye filtros, el hook solicita datos al servicio, el servicio consulta FastAPI y normaliza nombres en español o inglés. Si la API no está disponible y el fallback está habilitado, filtra los datos semilla y la UI muestra un aviso de demostración.

## Backend contract

- `GET /api/inventory/products`: acepta `search`, `category`, `minPrice`, `maxPrice`, `sort`, `page`, `pageSize` y `featured`.
- `GET /api/inventory/products/{id}`: devuelve un producto.
- Las respuestas de lista pueden usar `items`, `results`, `data` o un arreglo directo. El servicio reconoce campos como `name`/`nombre`, `price`/`precio` y `prescriptionRequired`/`requiere_receta`.
- El backend actual todavía no implementa estas dos rutas. Mientras se agregan, el catálogo usa el fallback y lo informa en pantalla.

## Setup & Usage

- **Prerequisites:** Node.js y dependencias instaladas con `npm install` dentro de `frontend`.
- **Execution:** `npm run dev` y abrir `http://localhost:5173`.
- **Configuration:** `VITE_API_URL` apunta por defecto a `http://localhost:8010`. Definir `VITE_ENABLE_CATALOG_FALLBACK=false` permite probar el estado de error real sin datos semilla.

## Testing

- Ejecutar `npm run lint` para revisión estática.
- Ejecutar `npm run build` para validar el bundle de producción.
- Probar búsqueda desde el navbar, filtros y paginación en `/productos`, apertura de tarjetas y aviso de receta en `/productos/3`.

## Changelog

- **Initial implementation:** experiencia pública responsive, integración desacoplada, fallback demostrativo y estados de carga, vacío y error.
