import { useEffect, useState } from "react";
import useFetch from "./useFetch";
import { ENDPOINTS } from "../config/api";
import { buildQuery } from "../lib/query";

// Retrasa un valor para no pedir en cada tecla
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// Busca productos para el POS (ya traen precio, stock_total y requiere_receta)
export const usePuntoDeVentaProductos = (q) =>
  useFetch(`${ENDPOINTS.PRODUCTS}${buildQuery({ q: q.trim(), page_size: 10 })}`);