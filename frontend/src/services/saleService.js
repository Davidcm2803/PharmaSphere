import { apiFetch, ENDPOINTS } from "../config/api";
import { buildQuery } from "../lib/query";

// Registrar una compra online.
export const createSale = (body) =>
  apiFetch(ENDPOINTS.SALES, {
    method: "POST",
    body,
  });

// Obtener los pedidos del cliente autenticado.
export const getMySales = () => apiFetch(ENDPOINTS.SALES_ME);
// Productos más vendidos (público, sin token).
export const getTopProducts = (limit = 8) =>
  apiFetch(`${ENDPOINTS.SALES_TOP}?limit=${limit}`, { auth: false });

// Panel: lista paginada (desde, hasta, id_sucursal, tipo, estado, page, page_size)
export const listSales = (params = {}) =>
  apiFetch(`${ENDPOINTS.SALES}${buildQuery(params)}`);

// Panel: detalle de una venta
export const getSale = (id) => apiFetch(`${ENDPOINTS.SALES}/${id}`);

// Panel: venta del punto de venta. Nunca se envía precio ni total
export const createCounterSale = (body) =>
  apiFetch(ENDPOINTS.SALES_COUNTER, { method: "POST", body });