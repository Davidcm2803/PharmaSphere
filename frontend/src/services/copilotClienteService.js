import { apiFetch, ENDPOINTS } from "../config/api";

export const sendCopilotClienteMessage = ({ pregunta, historial = [], voz = false }) =>
  apiFetch(ENDPOINTS.AI_CHAT_CLIENTE, {
    method: "POST",
    body: { pregunta, historial, voz },
  });