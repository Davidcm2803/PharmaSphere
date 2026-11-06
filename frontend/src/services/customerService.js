import { apiFetch, ENDPOINTS } from "../config/api";
import { buildQuery } from "../lib/query";

// Consultar el perfil del cliente autenticado.
export const getMyProfile = () => apiFetch(ENDPOINTS.CUSTOMER_ME);

// Panel: lista paginada (?q parcial, ?cedula exacta)
export const listCustomers = (params = {}) =>
  apiFetch(`${ENDPOINTS.CUSTOMERS}${buildQuery(params)}`);

export const getCustomer = (id) => apiFetch(`${ENDPOINTS.CUSTOMERS}/${id}`);

export const createCustomer = (body) =>
  apiFetch(ENDPOINTS.CUSTOMERS, { method: "POST", body });

export const updateCustomer = ({ id, body }) =>
  apiFetch(`${ENDPOINTS.CUSTOMERS}/${id}`, { method: "PUT", body });