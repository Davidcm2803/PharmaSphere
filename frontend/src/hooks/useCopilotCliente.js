import { useCallback, useEffect, useRef, useState } from "react";
import { sendCopilotClienteMessage } from "../services/copilotClienteService";

const MAX_HISTORY = 6; // igual que copilot_max_historial del backend

// Estado del chat del Copiloto de Cliente (Sofía). Sin voz ni acciones
// pendientes: a diferencia del admin, aquí lo único "especial" por mensaje
// es el nivel_alerta y el escalamiento que vienen del backend.
export default function useCopilotCliente() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);

  const pending = useRef(null); // ultima peticion, para "Reintentar"
  const nextId = useRef(0);
  const generation = useRef(0); // si cambia (clear), se ignoran respuestas viejas

  const addMessage = useCallback((rol, contenido, extra = {}) => {
    const id = ++nextId.current;
    setMessages((prev) => [...prev, { id, rol, contenido, ...extra }]);
    return id;
  }, []);

  const ask = useCallback(
    async (request) => {
      const current = generation.current;
      pending.current = { request };
      setLoading(true);
      setError(null);
      setErrorStatus(null);
      try {
        const res = await sendCopilotClienteMessage(request);
        if (current !== generation.current) return;
        addMessage("assistant", res.respuesta, {
          fuentes: res.fuentes ?? [],
          nivelAlerta: res.nivel_alerta ?? "leve",
          escalamiento: res.escalamiento ?? null,
        });
        pending.current = null;
      } catch (err) {
        if (current !== generation.current) return;
        setError(err.message);
        setErrorStatus(err.status ?? null);
      } finally {
        if (current === generation.current) setLoading(false);
      }
    },
    [addMessage],
  );

  const send = useCallback(
    (text) => {
      const pregunta = text.trim();
      if (!pregunta || loading) return;

      const historial = messages
        .slice(-MAX_HISTORY)
        .map(({ rol, contenido }) => ({ rol, contenido }));
      addMessage("user", pregunta);
      ask({ pregunta, historial });
    },
    [ask, addMessage, loading, messages],
  );

  const retry = useCallback(() => {
    if (pending.current && !loading) ask(pending.current.request);
  }, [ask, loading]);

  const clear = useCallback(() => {
    generation.current += 1;
    pending.current = null;
    setMessages([]);
    setError(null);
    setErrorStatus(null);
    setLoading(false);
  }, []);

  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => setOpen(false), []);

  // 401/403: la sesión ya no sirve, reintentar no va a ayudar
  const isAuthError = errorStatus === 401 || errorStatus === 403;

  return {
    open,
    openChat,
    closeChat,
    messages,
    loading,
    error,
    isAuthError,
    send,
    retry,
    clear,
  };
}