import { apiFetch, ENDPOINTS } from "../config/api";

// Registrar una compra online.
export const createSale = (body) =>
  apiFetch(ENDPOINTS.SALES, {
    method: "POST",
    body,
  });

// Obtener los pedidos del cliente autenticado.
export const getMySales = () => apiFetch(ENDPOINTS.SALES_ME);
