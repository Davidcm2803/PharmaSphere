import useFetch from "./useFetch";
import { ENDPOINTS } from "../config/api";
import { buildQuery } from "../lib/query";

// Lotes con stock que vencen en los próximos `days` días (más cercanos primero)
export const useExpiringLots = ({ days, id_sucursal }) =>
  useFetch(
    `${ENDPOINTS.INVENTORY_EXPIRING}${buildQuery({ days, id_sucursal })}`,
  );

// Lotes con stock que ya vencieron
export const useExpiredLots = ({ id_sucursal }) =>
  useFetch(`${ENDPOINTS.INVENTORY_EXPIRED}${buildQuery({ id_sucursal })}`);
