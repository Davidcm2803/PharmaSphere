import { apiFetch, ENDPOINTS } from "../config/api";

function withQuery(base, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  ).toString();
  return query ? `${base}?${query}` : base;
}

export const listCasosEscalados = ({ estado, nivel, page = 1, page_size = 20 } = {}) =>
  apiFetch(withQuery(ENDPOINTS.CASOS_ESCALADOS, { estado, nivel, page, page_size }));

export const getCasoEscalado = (idCaso) => apiFetch(`${ENDPOINTS.CASOS_ESCALADOS}/${idCaso}`);

export const tomarCasoEscalado = (idCaso) =>
  apiFetch(`${ENDPOINTS.CASOS_ESCALADOS}/${idCaso}/tomar`, { method: "POST" });

export const cerrarCasoEscalado = (idCaso) =>
  apiFetch(`${ENDPOINTS.CASOS_ESCALADOS}/${idCaso}/cerrar`, { method: "POST" });

export const reabrirCasoEscalado = (idCaso) =>
  apiFetch(`${ENDPOINTS.CASOS_ESCALADOS}/${idCaso}/reabrir`, { method: "POST" });