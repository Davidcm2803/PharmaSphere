import useFetch from "./useFetch";
import useMutation from "./useMutation";
import { ENDPOINTS } from "../config/api";
import { buildQuery } from "../lib/query";
import { createPurchase, receivePurchase } from "../services/purchaseService";

// Lista paginada de compras. Devuelve { data, error, loading, refetch }
export const usePurchasesList = (params) =>
  useFetch(`${ENDPOINTS.PURCHASES}${buildQuery(params)}`);

// Detalle de una compra
export const usePurchase = (id) =>
  useFetch(id ? `${ENDPOINTS.PURCHASES}/${id}` : null);

// Proveedores activos para el selector del formulario
export const useSupplierOptions = () => useFetch(ENDPOINTS.SUPPLIER_OPTIONS);

// Búsqueda de productos para armar la orden. Sin texto suficiente no pide nada
export const useProductSearch = (q) =>
  useFetch(
    q && q.length >= 2
      ? `${ENDPOINTS.PRODUCTS}${buildQuery({ q, page_size: 8 })}`
      : null,
  );

// submit(body) devuelve la compra creada o null; `error` es un mensaje
export function useCreatePurchase() {
  const { run, submitting, error, reset } = useMutation(createPurchase);
  return { submit: run, submitting, error: error?.message ?? null, reset };
}

// submit({ id, lineas }) devuelve { compra, lotes } o null
export function useReceivePurchase() {
  const { run, submitting, error, reset } = useMutation(receivePurchase);
  return { submit: run, submitting, error: error?.message ?? null, reset };
}
