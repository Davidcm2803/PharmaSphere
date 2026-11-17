import useFetch from "./useFetch";
import useMutation from "./useMutation";
import { ENDPOINTS } from "../config/api";
import { createCustomer, updateCustomer } from "../services/customerService";
import { buildQuery } from "../lib/query";

// Lista paginada con buscador (?q). Devuelve { data, error, loading, refetch }
export const useCustomers = (params) =>
  useFetch(`${ENDPOINTS.CUSTOMERS}${buildQuery(params)}`);

// Búsqueda exacta por cédula (punto de venta). Con cédula vacía no pide nada
export const useCustomerByCedula = (cedula) =>
  useFetch(cedula ? `${ENDPOINTS.CUSTOMERS}${buildQuery({ cedula })}` : null);

// Crear o editar. run(body) | run({ id, body }) devuelven el cliente o null
export const useCreateCustomer = () => {
  const m = useMutation(createCustomer);
  return { ...m, error: m.error };
};

export const useUpdateCustomer = () => {
  const m = useMutation(updateCustomer);
  return { ...m, error: m.error };
};