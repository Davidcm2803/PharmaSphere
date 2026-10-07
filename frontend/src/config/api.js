export const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8010/api";

// Base del servidor sin el prefijo /api (para servir /static/...)
export const SERVER_URL = API_URL.replace(/\/api\/?$/, "");

// Convierte "/static/productos/x.jpg" en URL completa; si ya es http(s) la deja igual
export const assetUrl = (path) =>
  !path ? null : path.startsWith("http") ? path : `${SERVER_URL}${path}`;

// Siempre debe coincidir con el prefijo del backend de app /api/auth)
export const ENDPOINTS = {
  AUTH_REGISTER: "/auth/register", // POST
  AUTH_LOGIN: "/auth/login", // POST
  AUTH_FIREBASE: "/auth/firebase", // POST { id_token, nombre? }
  AUTH_ME: "/auth/me", // GET (requiere token)
  AUTH_USERS: "/auth/users", // GET (solo admin)
  PRODUCTS: "/products", // GET público | POST admin | /{id}: GET, PUT, DELETE
  CATEGORIES: "/categories", // GET público
  SUPPLIERS: "/suppliers", // GET (lista para el dropdowm de proveedor)
  SUPPLIER_OPTIONS: "/suppliers/options",
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