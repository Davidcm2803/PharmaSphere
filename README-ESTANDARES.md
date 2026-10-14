# PharmaSphere: estándares de código

Para el equipo y para cualquier IA. **Copia el patrón existente; no inventes estructura, librerías ni carpetas nuevas.** Referencia de todo: el recurso *productos* (`products_routes.py`, `product_service.py`, `product_schema.py`, `test_products.py`, `ShopPage.jsx`, `useProducts.js`, `productService.js`).

## Reglas

1. Una responsabilidad por capa. Página nunca llama `fetch`; ruta nunca escribe SQL.
2. Español en tablas, campos JSON, parámetros de API, textos de UI y comentarios. Funciones/variables técnicas pueden ir en inglés.
3. Cambiar un endpoint = actualizar en el mismo cambio: schema, ruta, `ENDPOINTS`, servicio frontend y test.
4. Todo cambio de backend lleva test; todo cambio de tabla lleva migración Alembic + actualizar `app/db/pharmasphere.dbml`.
5. Sin secretos en código: todo en `.env`. Variable nueva → primero en `Settings` (backend) o leída con `import.meta.env` solo en `config/` (frontend).
6. Sin dependencias nuevas (no axios, moment, styled-components, otro manejador de estado).

## Levantar

```bash
docker compose up -d --build     # db :5434, qdrant :6335, API :8010 (docs en /docs)
cd frontend && npm install && npm run dev    # :5173 (CORS del backend solo permite este puerto)
npm run lint && npm run build    # deben pasar antes de subir
docker compose exec backend pytest app/test -q
```

Reiniciar BD: `scripts/reset-db.sh` o `.ps1`. Variables del frontend empiezan con `VITE_` (`VITE_API_URL`, `VITE_FIREBASE_*`).

## Backend (FastAPI)

Flujo: `routes → schemas → services → models → PostgreSQL`; auth con `dependencies/`.

| Capa | Hace | NO hace |
|---|---|---|
| `routes/` | Endpoints, roles, traduce errores a `HTTPException` | Lógica de negocio, SQL |
| `schemas/` | Pydantic: `Create`, `Update` (todo Optional), `Out`, `AdminOut` | Acceso a BD |
| `services/` | Lógica y consultas SQLAlchemy, excepciones propias | `HTTPException` |
| `models/` | Tablas (`Mapped[...]`) | Lógica |

Nombres: `models/x_model.py`, `schemas/x_schema.py`, `services/x_service.py`, `routes/xs_routes.py` (plural), `test/test_xs.py`.

**Receta de recurso nuevo:**
1. Modelo + migración.
2. Schemas: `XCreate`, `XUpdate`, `XOut` (cliente) y `XAdminOut` (admin, con datos internos como `costo`). Montos con el tipo `Money` de `product_schema.py`; textos con `_strip`.
3. Servicio: `list_x`, `get_x(only_active=True)`, `create_x`, `update_x`, `delete_x`. Borrado **lógico** (`activo = False`). Búsqueda con `ilike` + `_escape_like`. Listas con `paginate(db, stmt, params)`.
4. Rutas: GET público (paginado con `get_page_params` y `build_page`), POST/PUT/DELETE con `Depends(require_role("admin"))`. Público que cambia por rol → `get_optional_user`. Excepciones del servicio → `HTTPException(400, detail=str(exc))`.
5. Registrar en `app.py`: `prefix="/api/<recurso-plural>"`.
6. Test: caso feliz, 401 sin token, 403 rol incorrecto, 404 inexistente, 400/422 datos inválidos. Fixture `client` y helpers (`token_admin`, `auth_header`, `registrar_y_loguear`) se **importan** de `test_auth.py`. Nombres en español: `test_crear_como_cliente_devuelve_403`.

**Errores:** siempre `{ "success": false, "status_code": 404, "message": "...", "details": null }`. Lanza `HTTPException(detail="texto en español legible")`; el frontend muestra `message`. No cambiar esta forma.

Roles: `admin | empleado | cliente`. Estados de venta: `pendiente | pagada | retirada | cancelada`. No inventar valores sin migración.

## Frontend (React + Vite + Tailwind v4)

Flujo: **Página → hook (`hooks/`) → servicio (`services/`) → `apiFetch` (`config/api.js`) → backend.**

| Carpeta | Contenido |
|---|---|
| `pages/Public`, `pages/Admin` | Una pantalla por ruta |
| `components/Ui` | Base: `Button`, `Input`, `Select`, `Modal`, `Alert`, `Badge`, `Spinner`, `Table` |
| `components/layout` | `Navbar`, `ProductCard`, `ProductList`, `CategoryGrid`, `AuthModal` |
| `components/public` | `PublicLayout`, `Footer`, `PageHeader` |
| `components/home`, `admin`, `auth` | Secciones de inicio, panel admin, `ProtectedRoute` |
| `config/api.js` | `API_URL`, `ENDPOINTS`, token, `apiFetch`, `assetUrl` |
| `context/AuthContext` | `useAuth()` → `{ user, loading, login, register, loginWithGoogle, logout }` |
| `lib/` | `cn` (utils), `formatPrice` (format), firebase, `useTheme` |

**Rutas:** solo en `App.jsx`. `BrowserRouter` y `AuthProvider` están en `main.jsx`. El sitio público cuelga de `PublicLayout` (ya pone Navbar y Footer; las páginas **nunca** los renderizan). Admin: `<ProtectedRoute roles={["admin","empleado"]} />`. El login es un modal, no una ruta.

**Página nueva:** `pages/Public/X.jsx` (export default) → `<PageHeader title>` → contenedor `mx-auto max-w-[1536px] px-4 py-12 sm:px-6 lg:px-8` → registrar en `App.jsx` → enlace en Navbar/Footer si hace falta.

**Endpoint nuevo:**
1. `ENDPOINTS.X = "/x"` en `config/api.js` (igual al prefijo del backend).
2. `services/xService.js`: funciones que devuelven `apiFetch(...)`, con los nombres de parámetros del backend. Públicos con `{ auth: false }`; admin/usuario sin eso (el token se agrega solo); escritura con `{ method, body }`.
3. `hooks/useX.js`: `useAsync(() => getX(params), JSON.stringify(params))` → `{ data, loading, error, retry }`.
4. La página usa el hook, nunca el servicio.

**`useAsync` conserva `data` mientras llega la siguiente respuesta. No lo cambies para vaciar datos al cargar** (causaba que la tienda y el footer "brincaran").

**Carga/error/vacío:** usa `ProductList` (4 estados en uno) y `StatePanel` para otros paneles. El skeleton solo en la primera carga; al cambiar filtros se atenúa la lista anterior (`opacity-60`). Nunca cambies la altura de la página entre "cargando" y "cargado" (usa `min-h-*` si hace falta).

**Listas con filtros:** filtros en la URL (`useSearchParams`: `?q=&categoria=&orden=&page=`), no en `useState`. Todo cambio pasa por `update(changes)` de `ShopPage`, que reinicia `page`. Backend responde `{ items, total, page, pages }`.

**Auth:** token solo con `getToken/setToken/clearToken`; nada de `localStorage` suelto. Rol en UI: `useAuth().user?.rol`. El frontend solo oculta; el backend siempre valida.

**Ya existe, úsalo:** `Button` (`variant`, `loading`), `Input` (`label`, `error`), `cn()`, `formatPrice()`, `ProductImage`, `ProductCard`, `ProductList`, `StatePanel`, `PageHeader`, `assetUrl()`. Librerías ya instaladas: `lucide-react` (íconos), `react-hook-form` + `zod` (formularios), `recharts`, `date-fns`.

## Estilos

- **Solo tokens `brand-*`** de `index.css` (`background, foreground, card, primary(-foreground/-dark/-light), muted(-foreground), border, input, ring, accent(-foreground), success/warning/danger(-soft)`). Prohibido hex y colores de Tailwind sueltos (`bg-green-500`). ¿Falta un color? Se agrega en `@theme` de `index.css`.
- Modo oscuro: clase `.dark` redefine los mismos tokens; con tokens `brand-*` funciona solo.
- Mobile-first. Radios: `rounded-2xl` tarjetas, `rounded-lg` botones/inputs. Imágenes: `aspect-square` + `object-contain`.
- No quitar `html { scrollbar-gutter: stable }`.

## Convenciones

- Frontend: `PascalCase.jsx` con `export default`; hooks `useX.js`; servicios `xService.js`; un componente por archivo (<~150 líneas); constantes de módulo en MAYÚSCULAS; sin `catch` vacío; textos de UI en español con tildes y `¿ ¡`.
- Backend: funciones tipadas; privadas con `_`; precios `Decimal`/`Numeric(10,2)`, nunca `float` en BD; el cliente nunca recibe `costo` ni campos internos.

## Antes de subir

- [ ] Seguí el patrón de productos y no agregué dependencias.
- [ ] Backend: modelo, schema, servicio, ruta, test; ruta registrada; escritura con `require_role`; migración si cambió una tabla; `pytest` pasa.
- [ ] Frontend: endpoint + servicio + hook; página sin `fetch`; solo `brand-*`; probé carga, error, vacío y lista sin saltos del footer; móvil y escritorio; `lint` y `build` pasan.

## Cómo pedirle cosas a la IA

**1. Sacar la estructura del proyecto.** En PowerShell, en la raíz del proyecto:

```powershell
Get-ChildItem -Recurse | Where-Object { $_.FullName -notmatch 'node_modules|__pycache__|\.git|\.venv|venv|dist|build|\.next|coverage|\.pytest_cache|\.mypy_cache|\.idea|\.vscode' } | Select-Object FullName | ForEach-Object { $_.FullName.Replace((Get-Location).Path + '\', '') }
```

Copia el resultado. Si usas Claude Code, Cursor o similar (con acceso a terminal), pídele que ejecute el comando él mismo.

**2. Adjuntar `README-ESTANDARES.md`.** Para gastar menos tokens, pega solo la sección que toca (Backend o Frontend).

**3. Pegar completos los archivos que la IA va a tocar** y uno parecido como ejemplo. Nunca pegues `.env` con valores reales.

**4. Pegar este prompt y escribir la tarea al final:**

~~~
Trabajas en PharmaSphere (React + Vite + Tailwind v4 / FastAPI + SQLAlchemy + PostgreSQL).
Te doy: la estructura del proyecto, README-ESTANDARES.md y los archivos relacionados.

Antes de escribir código:
- Sigue README-ESTANDARES.md al pie de la letra.
- Revisa la estructura y reutiliza lo que ya exista (hooks, componentes, servicios).
- Copia el patrón de productos. No inventes carpetas, patrones ni librerías.
- Si te falta ver un archivo, pídemelo por su ruta antes de escribir código. No supongas su contenido.

Al entregar:
- Archivos completos con su ruta, sin quitar mis comentarios ni agregar nuevos.
- Lista al final los archivos creados o modificados.
- Backend: incluye test y, si cambia una tabla, la migración Alembic.
- Frontend: solo colores brand-* y componentes existentes.

Tarea: <describe aquí lo que necesitas>
~~~