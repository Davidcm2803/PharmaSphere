import useFetch from "./useFetch";
import useMutation from "./useMutation";
import { ENDPOINTS } from "../config/api";
import { createCounterSale } from "../services/saleService";
import { buildQuery } from "../lib/query";

// Lista paginada de ventas del panel. Devuelve { data, error, loading, refetch }
export const useSalesList = (params) =>
  useFetch(`${ENDPOINTS.SALES}${buildQuery(params)}`);

// Detalle de una venta
export const useSale = (id) => useFetch(id ? `${ENDPOINTS.SALES}/${id}` : null);

// Venta del POS. submit(body) devuelve la venta o null; `error` es un mensaje
export function useCreateCounterSale() {
  const { run, submitting, error, reset } = useMutation(createCounterSale);
  return { submit: run, submitting, error: error?.message ?? null, reset };
}