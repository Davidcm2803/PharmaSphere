export const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8010/api";

// Deben coincidir con backend/app/routes/auth_routes.py (prefijo /api/auth)
export const ENDPOINTS = {
  AUTH_REGISTER: "/auth/register", // POST
  AUTH_LOGIN: "/auth/login", // POST
  AUTH_ME: "/auth/me", // GET (requiere token)
  AUTH_USERS: "/auth/users", // GET (solo admin)

  // Sucursales (tarea #7) -> /branches y /branches/{id}
  BRANCHES: "/branches", // GET, POST | PUT, DELETE en /branches/{id}

  // Proveedores -> /suppliers y /suppliers/{id}
  SUPPLIERS: "/suppliers", // GET, POST | PUT, DELETE en /suppliers/{id}

  // Empleados (ligados a sucursal) -> /employees y /employees/{id}
  EMPLOYEES: "/employees", // GET, POST | PUT, DELETE en /employees/{id}

  // Inventario por sucursal
  INVENTORY: "/inventory", // GET ?id_sucursal=1&low_stock=true
  INVENTORY_ADJUST: "/inventory/adjust", // POST { id_producto, id_sucursal, cantidad, motivo }
  INVENTORY_TRANSFER: "/inventory/transfer", // POST { id_producto, id_origen, id_destino, cantidad }
};

const TOKEN_KEY = "pharmasphere_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function apiFetch(
  path,
  { method = "GET", body, auth = true } = {},
) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // El backend siempre responde { success, status_code, message, details }
    const error = new Error(
      data?.message ?? "Error de conexión con el servidor",
    );
    error.status = res.status;
    error.details = data?.details;
    throw error;
  }

  return data;
}
