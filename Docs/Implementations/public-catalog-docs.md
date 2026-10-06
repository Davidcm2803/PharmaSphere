# Catálogo público – Implementation Docs

## Overview

- **Goal:** permitir que una persona visitante explore, filtre y busque productos, y consulte su detalle con información clara sobre disponibilidad y receta médica.
- **Scope:** Home pública, catálogo, búsqueda, filtros, paginación, detalle, `ProductCard` y estados asíncronos. No incluye carrito, checkout ni autenticación.

## Architecture

- **Key Files:**
  - `frontend/src/App.jsx`: navegación liviana basada en History API.
  - `frontend/src/pages/`: Home, catálogo y detalle de producto.
  - `frontend/src/components/`: encabezado, pie, tarjetas y estados reutilizables.
  - `frontend/src/services/productService.js`: búsqueda, filtros, orden y paginación sobre el catálogo local.
  - `frontend/src/hooks/useProducts.js`: estado de carga, error, reintento y cancelación de solicitudes.
  - `frontend/src/data/products.js`: fuente local con todos los productos quemados.
- **Data Flow:** la UI construye los filtros, el hook solicita los datos al servicio local y el servicio filtra, ordena y pagina el arreglo de productos antes de devolverlo.

## Data source

- Los productos están definidos en `frontend/src/data/products.js`.
- No se realizan solicitudes HTTP al backend.
- Para agregar o modificar productos basta con editar el arreglo `PRODUCTS`; las categorías se generan automáticamente.

## Setup & Usage

- **Prerequisites:** Node.js y dependencias instaladas con `npm install` dentro de `frontend`.
- **Execution:** `npm run dev` y abrir `http://localhost:5173`.
- **Configuration:** no requiere variables de entorno ni backend para mostrar el catálogo.

## Testing

- Ejecutar `npm run lint` para revisión estática.
- Ejecutar `npm run build` para validar el bundle de producción.
- Probar búsqueda desde el navbar, filtros y paginación en `/productos`, apertura de tarjetas y aviso de receta en `/productos/3`.

## Changelog

- **Initial implementation:** experiencia pública responsive con estados de carga, vacío y error.
- **Hardcoded catalog:** se eliminó la dependencia de FastAPI y se estableció el arreglo local como fuente única de productos.
- **Responsive navbar:** se agregaron los accesos a Tienda, Categorías, Bienestar y Nosotros, además de una búsqueda adaptable sin controles de carrito, perfil o usuario.
- **Mobile navigation:** en tablet y celular los accesos se presentan dentro de un menú desplegable; el buscador ocupa una segunda fila compacta en pantallas pequeñas.
- **Mobile search:** en celular el campo permanece oculto y se abre desde un botón dedicado, con foco automático, cierre explícito y soporte para la tecla Escape.
- **Shop view:** el acceso Tienda abre `/tienda`, con hero comercial y una grilla de doce productos. Las tarjetas incluyen etiqueta, valoración, precio anterior y acción rápida, mientras “Ver todos” conduce al catálogo con filtros.
- **Categories preview:** `/categorias` muestra ocho accesos visuales. Cada categoría abre una ruta de Tienda, presenta una transición de carga y luego una vista “en construcción” con retorno a la tienda o al listado de categorías.
- **Wellness Hub:** `/bienestar` ofrece una introducción editorial, guía destacada, artículos desplegables accesibles y un acceso contextual hacia la tienda.
- **Active navigation:** el navbar de escritorio y el menú móvil resaltan automáticamente Tienda, Categorías, Wellness Hub o Nosotros según la ruta actual, incluyendo `aria-current`.
- **About page:** `/nosotros` presenta la misión de PharmaSphere, una sección narrativa, tres principios de diseño responsable y accesos hacia Tienda y Wellness Hub.
