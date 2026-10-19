import { apiFetch, ENDPOINTS } from "../config/api";

// Nombres de parametros del backend. historial = [{ rol: "user" | "assistant", contenido }]
export const sendCopilotMessage = ({ pregunta, historial = [], voz = false }) =>
  apiFetch(ENDPOINTS.AI_CHAT, {
    method: "POST",
    body: { pregunta, historial, voz },
  });

// Confirma una accion pendiente propuesta por el asistente.
// Devuelve { mensaje } segun lo que espera el hook.
export const confirmCopilotAction = (token) =>
  apiFetch(ENDPOINTS.AI_CONFIRMAR, {
    method: "POST",
    body: { token },
  });