import useFetch from "./useFetch";
import useMutation from "./useMutation";
import { ENDPOINTS } from "../config/api";
import { createRecipe, updateRecipe } from "../services/recipeService";
import { buildQuery } from "../lib/query";

// Lista paginada con filtros. Devuelve { data, error, loading, refetch }
export const useRecipes = (params) =>
  useFetch(`${ENDPOINTS.RECIPES}${buildQuery(params)}`);

// Recetas vigentes de un cliente (punto de venta). Sin cédula no pide nada
export const useActiveRecipes = (cedula) =>
  useFetch(
    cedula
      ? `${ENDPOINTS.RECIPES}${buildQuery({ cedula, estado: "vigente", page_size: 100 })}`
      : null,
  );

// Productos que requieren receta (selector del formulario)
export const useRxProducts = () =>
  useFetch(
    `${ENDPOINTS.PRODUCTS}${buildQuery({ requiere_receta: true, page_size: 100 })}`,
  );

export const useCreateRecipe = () => useMutation(createRecipe);
export const useUpdateRecipe = () => useMutation(updateRecipe);