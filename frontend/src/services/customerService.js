import { apiFetch, ENDPOINTS } from "../config/api";

// Consultar el perfil del cliente autenticado.
export const getMyProfile = () => apiFetch(ENDPOINTS.CUSTOMER_ME);
