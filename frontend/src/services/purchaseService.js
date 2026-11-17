import { apiFetch, ENDPOINTS } from "../config/api";
import { buildQuery } from "../lib/query";

// Lista paginada (estado, id_proveedor, id_sucursal, page, page_size)
export const listPurchases = (params = {}) =>
  apiFetch(`${ENDPOINTS.PURCHASES}${buildQuery(params)}`);

// Detalle de una compra (con productos y lotes recibidos)
export const getPurchase = (id) => apiFetch(`${ENDPOINTS.PURCHASES}/${id}`);

// Nueva orden: { id_proveedor, id_sucursal, detalles: [{ id_producto, cantidad, costo_unitario }] }
export const createPurchase = (body) =>
  apiFetch(ENDPOINTS.PURCHASES, { method: "POST", body });

// Recepción: { id, lineas: [{ id_producto, lotes: [{ numero_lote, fecha_vencimiento, cantidad }] }] }
export const receivePurchase = ({ id, lineas }) =>
  apiFetch(`${ENDPOINTS.PURCHASES}/${id}/receive`, {
    method: "POST",
    body: { lineas },
  });
