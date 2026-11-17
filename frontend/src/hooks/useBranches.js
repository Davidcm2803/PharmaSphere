import useFetch from "./useFetch";
import { ENDPOINTS } from "../config/api";

// Sucursales activas para que el cliente elija dónde retirar. Devuelve { data, loading, error, refetch }
export const useBranchOptions = () => useFetch(ENDPOINTS.BRANCH_OPTIONS);
