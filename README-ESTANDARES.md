# PharmaSphere: estándares de código (v1.2)

Para el equipo y para cualquier IA. **Todo se construye en Layered Architecture: cada capa solo habla con la inmediata inferior y nunca salta capas.** Copia el patrón de *productos* (`products_routes.py`, `product_service.py`, `product_schema.py`, `test_products.py`, `ShopPage.jsx`, `useProducts.js`, `productService.js`); no inventes estructura, librerías ni carpetas.


## 1. Reglas de oro

1. **Capas:** backend `routes → services → models` (con `schemas` en la frontera); frontend `página → hook → servicio → apiFetch`. Prohibido saltarse una capa.
2. Español en tablas, campos JSON, parámetros de API, textos de UI y comentarios. Funciones y variables técnicas pueden ir en inglés.
3. Cambiar un endpoint = en el mismo cambio: schema, ruta, `ENDPOINTS`, servicio frontend y test.
4. Todo cambio de backend lleva test(Opcional). Todo cambio de tabla lleva modelo + migración Alembic + `app/db/pharmasphere.dbml`.
5. Sin secretos en el repo: todo en `.env` (ignorado). Variable nueva → primero en `Settings` (backend) o `import.meta.env` solo dentro de `config/` (frontend).
6. Sin dependencias nuevas (no axios, moment, styled-components ni otro manejador de estado).
7. Solo colores `brand-*`. Sin hex ni colores sueltos de Tailwind. todo montado en tailwind preferiblemente solo colores en el .css
8. Mobile-first: toda pantalla se prueba en celular (barra inferior) y escritorio (sidebar).

## 2. Arquitectura en capas

### Backend (FastAPI, SQLAlchemy síncrono, PostgreSQL)

| Capa | Carpeta | Hace | NO hace |
|---|---|---|---|
| Rutas | `routes/` | Endpoints, roles (`require_role`), paginación (`get_page_params`), traduce excepciones del servicio a `HTTPException` | Lógica de negocio, SQL |
| Schemas | `schemas/` | Pydantic: `Create`, `Update` (todo Optional), `Out`, `AdminOut` | Acceso a BD |
| Servicios | `services/` | Lógica, consultas, transacciones, excepciones propias | `HTTPException`, importar de `routes/` |
| Modelos | `models/` | Tablas con `Mapped[...]` | Lógica |
| Transversal | `utils/`, `dependencies/`, `middlewares/` | `pagination`, `escape_like`; `get_current_user`, `require_role`; auth y manejo de errores | Lógica de negocio |

Nombres: `models/x_model.py`, `schemas/x_schema.py`, `services/x_service.py`, `routes/xs_routes.py` (plural), `test/test_xs.py`. `get_db` **no hace commit**: lo decide el servicio.

### Frontend (React 19, Vite, Tailwind v4)

```
pages/ (una pantalla por ruta)  →  hooks/ (useX)  →  services/ (xService.js)  →  config/api.js (apiFetch)  →  backend
        └─ components/ (solo presentación: reciben props, no hacen fetch)
```

| Capa | Regla |
|---|---|
| Página | Compone componentes y usa hooks. Nunca llama `fetch`, `apiFetch` ni servicios. |
| Hook | `useFetch` (GET autenticado del panel) o `useX` (público, sobre `useAsync`). Devuelven `{ data, loading, error, retry/refetch }`. |
| Servicio | Una función por endpoint, devuelve `apiFetch(...)` con los nombres de parámetros del backend. Públicos con `{ auth: false }`; escritura con `{ method, body }`. |
| `apiFetch` | Único que usa `fetch`. Agrega el token y lanza `Error` con el `message` del backend (`error.status`, `error.details`). |

Excepción transitoria: una lectura GET del panel puede usar `useFetch(ENDPOINTS.X)` directo en la página mientras no exista un hook propio. **Toda escritura (POST/PUT/DELETE) va en un servicio.**

## 3. Levantar y comandos

```bash
docker compose up -d --build   # db :5434, qdrant :6335, API :8010 (docs en /docs)
cd frontend && npm install && npm run dev   # :5173 (el CORS solo permite este puerto)
npm run lint && npm run build  # deben pasar antes de subir(OPCIONAL ya que usamos github actions que cubre cada PR)
docker compose exec backend pytest app/test -q
```

Reiniciar BD: `scripts/reset-db.sh` o `.ps1`.

**Variables de entorno.** Cada carpeta tiene su `.env` (nunca se sube). Backend: `database_url`, `secret_key`, `qdrant_url`, `firebase_*` (ver `core/config.py`). Frontend: `VITE_API_URL` **debe terminar en `/api`** (`http://localhost:8010/api`) y `VITE_FIREBASE_*`. Vite solo lee el `.env` al arrancar: reinicia `npm run dev`. Si una variable queda vacía, `??` no usa el valor por defecto: borra la línea. Si una clave llegó a Git, rótala.

## 4. Backend

**Receta de recurso nuevo** (en este orden):
1. Modelo + migración Alembic(opcional solo si se cambia no tabla )
2. Schemas `XCreate`, `XUpdate`, `XOut` y, si hay datos internos (`costo`), `XAdminOut`. Montos con `Money` (`product_schema.py`). Texto: `field_validator(mode="before")` recorta espacios **antes** de `min_length`; en `Update`, `""` pasa a `None`.
3. Servicio: `list_x`, `get_x(only_active=True)`, `create_x`, `update_x`, `delete_x`. Borrado **lógico** (`activo = False`). Búsqueda con `ilike` + `escape_like` (de `utils/sql.py`). Listas grandes con `paginate(db, stmt, params)`. Errores de negocio = excepciones propias (ejemplo: `InvalidSupplierError`).
4. Rutas: GET paginado con `build_page`; POST/PUT/DELETE con `Depends(require_role("admin"))`. Excepción del servicio → `HTTPException(400, detail=str(exc))`.
5. Registrar en `app.py` con `prefix="/api/<plural>"`, una sola importación.
6. Test: caso feliz, 401, 403, 404 y 400/422. `client` y helpers (`token_admin`, `auth_header`, `registrar_y_loguear`) se **importan** de `test_auth.py`. Nombres en español: `test_crear_como_cliente_devuelve_403`.

**Actualización parcial:** ignora `None` salvo en campos nulables de la tabla.
```python
_NULLABLE = {"direccion", "telefono"}
for field, value in data.model_dump(exclude_unset=True).items():
    if value is None and field not in _NULLABLE:
        continue
    setattr(obj, field, value)
```

**Errores:** siempre `{ "success": false, "status_code": 404, "message": "...", "details": null }` (lo arma `middlewares/error_handler.py`). El `detail` va en español legible; el frontend muestra `message`. Los 422 traen `details` por campo, pero el frontend hoy no los muestra.

**Roles:** `admin | empleado | cliente`. **Estados de venta:** `pendiente | pagada | retirada | cancelada`. No inventes valores sin migración. Precios `Numeric(10,2)`/`Decimal`, nunca `float` en BD; el cliente nunca recibe `costo`.

**Transacciones:** una operación de negocio = un solo `commit`. Si algo falla: `rollback` y re-lanzar. Filas concurrentes con `with_for_update()` en orden fijo (por id). `IntegrityError` → 409.

**Endpoints del panel:**

| Prefijo | Roles | Notas |
|---|---|---|
| `/api/suppliers` | admin | Paginado (`Page`), `?q&activo`, `/options` |
| `/api/branches` | GET admin y empleado; resto admin | Lista simple, `?q&activo` |
| `/api/employees` | admin | Lista simple, `?q&id_sucursal&activo` |
| `/api/inventory` | admin y empleado | `?id_sucursal&q&low_stock`, `POST /adjust`, `POST /transfer` |

Sucursales, empleados e inventario devuelven lista simple (catálogos pequeños); el frontend los lee con `toList(data)`, que acepta lista o `{ items }`.

**Reglas de inventario:** stock bajo = `cantidad < stock_minimo`. Ajuste: `cantidad` con signo y ≠ 0, `motivo` obligatorio, stock final ≥ 0, sucursal activa, movimiento `ajuste`. Transferencia: origen ≠ destino, ambas activas, stock suficiente, resta y suma en **una transacción** con dos movimientos (`transferencia_salida` negativo y `transferencia_entrada` positivo). Kardex (`movimiento_inventario`): cantidad ≠ 0. No se desactiva una sucursal con stock (409).

**Migraciones:** Alembic es la fuente de verdad del esquema; `create_all` en `app.py` es solo red de seguridad en desarrollo. Tras un merge, `alembic heads` debe mostrar **un** head; si hay dos, `alembic merge heads`.

**Docker:** Monta los datos iniciales en el primer Docker Compose 


## 5. Frontend

**Endpoint nuevo:** 1) `ENDPOINTS.X = "/x"` en `config/api.js` (igual al prefijo, sin `/api`); 2) `services/xService.js`; 3) `hooks/useX.js`; 4) la página usa el hook.

**Rutas:** solo en `App.jsx` (público, dentro de `PublicLayout`, que ya pone Navbar y Footer) y `pages/Admin/AdminRoutes.jsx`. `BrowserRouter` y `AuthProvider` están en `main.jsx`. Admin: `ProtectedRoute roles={["admin","empleado"]}`. El login es un modal, no una ruta. Rol en la UI: `useAuth().user?.rol` (el frontend solo oculta; el backend valida). Token solo con `getToken/setToken/clearToken`.

**Página pública nueva:** `pages/Public/X.jsx` (`export default`) → `<PageHeader title>` → contenedor `mx-auto max-w-[1536px] px-4 py-12 sm:px-6 lg:px-8` → ruta en `App.jsx`.

**Página nueva del panel:** `pages/Admin/X.jsx`(siempre usar la misma logica de JSX  de las ya existentes en PAGES/ADMIN), ruta en `AdminRoutes.jsx` e ítem en `components/admin/layout/navItems.js` (única lista del menú): `{ path, label, icon, roles?, quick? }`. Usa `path` (no `to`) o el enlace sale a `/admin/undefined`. Importa el ícono de `lucide-react`. `quick: true` = acceso rápido en la barra inferior (máx. 4).

**Patrón de pantalla del panel** (copia `Medicines.jsx`): `PageHeader` → `Notice` (opcional) → `Panel` con 3 `StatCard` → barra de filtros (apilada en móvil: `flex-col sm:flex-row`) → `DataTable` + `Pagination`. Acciones por fila como íconos (`iconAction`), borrado/desactivado con `ConfirmDialog`. Botones del encabezado: `ActionButton` (alto fijo `h-10`); varios en móvil, en `grid grid-cols-2` con el primario en `col-span-2`. Filtros de listas con backend paginado viven en la URL (`useSearchParams`), no en `useState`.

**Componentes que ya existen (Obligatorios):** `components/admin/ui`: `PageHeader`, `Panel`, `StatCard`, `DataTable`, `Pagination`, `Notice`, `ConfirmDialog`, `ActionButton`, `Field`, `Dropdown`. `components/ui` (base, también para formularios en `Modal`): `Button` (`variant`, `loading`, `className`), `Input`, `Select`, `Modal`, `Alert`, `Badge`, `Spinner`, `Table`. Utilidades: `cn`, `formatPrice`, `assetUrl`. Librerías: `lucide-react`, `react-hook-form` + `zod`, `recharts`, `date-fns`, `react-select`.

**Carga, error y vacío:** `ProductList` y `StatePanel` (público); en el panel, texto de carga + `Notice type="error"` con "Reintentar". `useAsync` conserva `data` mientras llega la siguiente respuesta: **no lo cambies** (evita saltos de tienda y footer). Nunca cambies la altura de la página entre cargando y cargado (`min-h-*`). `useFetch` con `path` nulo no pide nada.

**Navegación del panel:** laptop (`lg+`) = `Sidebar` fijo de 264 px (`lg:ml-[264px]` en `AdminLayout`; si cambias uno, cambia el otro). Celular = `BottomNav` flotante, sin hamburguesa. `<main>` lleva `pb-36 lg:pb-28`. `index.html` necesita `viewport-fit=cover`.

## 6. Estilos

- **Tokens `brand-*`** de `index.css`: `background, foreground, card, primary(-foreground/-dark/-light), muted(-foreground), border, input, ring, accent(-foreground/-deep), success/warning/danger(-soft)`. ¿Falta uno? Se agrega en `@theme`. La opacidad sobre tokens funciona en Tailwind v4 (`bg-brand-muted/60`).
- Modo oscuro: la clase `.dark` redefine los tokens; con `brand-*` funciona solo.
- Radios: `rounded-3xl` paneles, `rounded-2xl` tarjetas, `rounded-lg` botones e inputs, `rounded-[28px]` barra y hoja flotantes. Imágenes: `aspect-square` + `object-contain`.
- Inputs de formulario con `text-base sm:text-sm` (evita el zoom de iOS). No quites `html { scrollbar-gutter: stable }`.
- Convenciones: `PascalCase.jsx` con `export default`, un componente por archivo (<~150 líneas), hooks `useX.js`, servicios `xService.js`, constantes en MAYÚSCULAS, sin `catch` vacío, UI en español con tildes y `¿ ¡`. Backend: funciones tipadas, privadas con `_`.

## 7. Git y CI

1. `git checkout Test && git pull origin Test`, luego `git checkout -b mi-rama`. Commits pequeños (`feat(frontend): ...`, `fix(backend): ...`, número de issue).
2. Antes del PR: `git fetch origin && git merge origin/Test` (las ramas no se actualizan solas). Conflictos se resuelven en tu rama.
3. PR con **base `Test`** (confirma el dropdown `base:`). Nunca `push --force` a `main` ni `Test`. Para deshacer un merge: `git revert -m 1 <commit>` en una rama nueva.
4. `package-lock.json` no se resuelve a mano: toma el de `Test` y corre `npm install`. Tras *Accept Both* en `app.py`, revisa que no queden imports ni `include_router` duplicados.

`ci.yml` corre en cada PR: pytest de `test_auth` (SQLite en memoria) → `init.sql` + `seed.sql` en Postgres → `alembic stamp 6033595434e9` → `upgrade head` → `alembic check` (**modelos y migraciones deben coincidir**) → resto de pytest; frontend: `npm ci` + `lint` (**no corre `build`**: córrelo tú); y `pip-audit` semanal.

## 8. Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| 404 en `:8010/products` | `VITE_API_URL` sin `/api`; corrige y reinicia Vite |
| 404 en `/api/branches` o `/api/employees` | Router sin registrar en `app.py` |
| Enlace a `/admin/undefined` | Ítem de `navItems.js` con `to` en vez de `path` |
| `X is not defined` (ícono) | Falta importarlo de `lucide-react` |
| Build o CI falla en Linux, no en tu PC | Mayúsculas en imports (`components/Ui` vs `ui`) |
| Inventario sin datos | No hay sucursales activas o el usuario es `cliente` (403) |
| Dos heads de Alembic | `alembic merge heads` |
| Aviso `Cross-Origin-Opener-Policy` | Popup de Google/Firebase en desarrollo; inofensivo |



## 9. Cómo pedirle cosas a la IA

Adjunta este README (o solo la sección que toca), la estructura del proyecto, los archivos que se van a tocar completos y uno parecido como ejemplo. Nunca pegues un `.env` con valores. Prompt:

~~~
Trabajas en PharmaSphere (React + Vite + Tailwind v4 / FastAPI + SQLAlchemy + PostgreSQL).
Vas a implementar un issue de GitHub. Sigue README-ESTANDARES.md al pie de la letra y respeta siempre la Layered Architecture.

Antes de escribir código:
1. Resume en máximo 5 líneas qué vas a construir y qué archivos tocarás por capa (backend: modelo, schema, servicio, ruta, test; frontend: ENDPOINTS, servicio, hook, página).
2. Revisa la estructura que te di: si una tarea del issue ya existe en el repo, dímelo y no la dupliques.
3. Si te falta ver un archivo, pídemelo por su ruta. Si una regla del README choca con el issue, avísame.
4. Pregunta solo si hay una ambigüedad que cambie el diseño.

Al implementar:
- Reutiliza lo que ya existe y copia el patrón de productos; no inventes carpetas ni librerías.
- Archivos completos con su ruta, sin quitar mis comentarios.
- Cada criterio de aceptación debe quedar probado: al menos un test en backend; en frontend, carga, error, vacío, móvil y escritorio.
- Backend: test y, si cambia una tabla, migración Alembic. Frontend: solo `brand-*` y componentes existentes.
- No hagas nada fuera del alcance del issue. Si ves deuda técnica cercana, lístala al final sin cambiarla.

Al entregar:
- Lista de archivos creados o modificados.
- Checklist de las tareas del issue (hecha/pendiente) y de los criterios de aceptación, indicando qué test o prueba cubre cada uno.
- Comandos para verificar (`pytest`, `alembic check`, `npm run lint`, `npm run build`).
- Mensaje de commit sugerido: `feat(backend): ... #<número>`.

Issue:
<pega aquí número, título, descripción, tareas y criterios de aceptación>
~~~