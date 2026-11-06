import { apiFetch, ENDPOINTS } from "../config/api";
import { buildQuery } from "../lib/query";

// Lista paginada (id_cliente, cedula, id_producto, estado, page, page_size)
export const listRecipes = (params = {}) =>
  apiFetch(`${ENDPOINTS.RECIPES}${buildQuery(params)}`);

export const getRecipe = (id) => apiFetch(`${ENDPOINTS.RECIPES}/${id}`);

export const createRecipe = (body) =>
  apiFetch(ENDPOINTS.RECIPES, { method: "POST", body });

export const updateRecipe = ({ id, body }) =>
  apiFetch(`${ENDPOINTS.RECIPES}/${id}`, { method: "PUT", body });