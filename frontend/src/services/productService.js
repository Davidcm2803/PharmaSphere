import { apiFetch, ENDPOINTS } from "../config/api";

// Recibe los nombres de parametros del backend (q, categoria, precio_min, precio_max, orden, page, page_size)
export function getProducts(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value != null) query.set(key, value);
  });
  return apiFetch(`${ENDPOINTS.PRODUCTS}?${query}`, { auth: false });
}

export const getProductById = (id) =>
  apiFetch(`${ENDPOINTS.PRODUCTS}/${id}`, { auth: false });

export const getCategories = () =>
  apiFetch(ENDPOINTS.CATEGORIES, { auth: false });