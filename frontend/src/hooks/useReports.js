import { useState } from "react";
import { format, subDays } from "date-fns";
import useFetch from "./useFetch";
import { ENDPOINTS } from "../config/api";

// Acepta lista o { items }, igual que toList en Inventario
const toList = (d) => (Array.isArray(d) ? d : (d?.items ?? []));
const withList = (res) => ({ ...res, data: toList(res.data) });
const qs = (params) => new URLSearchParams(params).toString();

// Un hook por widget: cada tarjeta carga y falla por separado.
export const useSummary = () => useFetch(ENDPOINTS.REPORTS_SUMMARY);

export function useSalesByDay(dias) {
  // "hoy" se fija una vez (initializer) para no llamar new Date() en cada render
  const [hoy] = useState(() => new Date());
  const params = qs({
    desde: format(subDays(hoy, dias - 1), "yyyy-MM-dd"),
    hasta: format(hoy, "yyyy-MM-dd"),
  });
  return withList(useFetch(`${ENDPOINTS.REPORTS_SALES_BY_DAY}?${params}`));
}

export const useTopProducts = (limit = 5, orden = "unidades") =>
  withList(useFetch(`${ENDPOINTS.REPORTS_TOP_PRODUCTS}?${qs({ limit, orden })}`));

export const useBranchRanking = () => withList(useFetch(ENDPOINTS.REPORTS_BRANCHES));

export const useMostViewed = (limit = 6) =>
  withList(useFetch(`${ENDPOINTS.REPORTS_MOST_VIEWED}?${qs({ limit })}`));

export const useAlerts = () => withList(useFetch(ENDPOINTS.REPORTS_ALERTS));

export const useMovements = (limit = 6) =>
  withList(useFetch(`${ENDPOINTS.REPORTS_MOVEMENTS}?${qs({ limit })}`));