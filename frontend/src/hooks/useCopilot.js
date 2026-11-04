import { useCallback, useEffect, useRef, useState } from "react";
import { confirmCopilotAction, sendCopilotMessage } from "../services/copilotService";
import useVoice from "./useVoice";

const MAX_HISTORY = 6; // igual que copilot_max_historial del backend

// Confirmar o cancelar hablando: solo vale la frase COMPLETA ("si", "confirma", "cancela").
// "si, pero cambia a 50" NO confirma: va al asistente como un mensaje nuevo.
const normalize = (t) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const CONFIRM = /^(si|si confirma|si confirmo|confirma|confirmo|confirmar|dale|si dale|adelante|correcto|ok|okay|hazlo|si hazlo|procede|claro)$/;
const CANCEL = /^(no|no gracias|cancela|cancelar|cancelalo|detente|olvidalo|dejalo|para)$/;

const intentOf = (text) => {
  const t = normalize(text);
  if (CONFIRM.test(t)) return "confirm";
  if (CANCEL.test(t)) return "cancel";
  return null;
};

const toSpeech = (text) =>
  text.replace(/[*_#`]/g, "").replace(/→/g, " a ").replace(/\s+/g, " ").trim();

// Estado del chat del Copilot (texto y voz).
export default function useCopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accion, setAccion] = useState(null); // accion pendiente de confirmar
  const [confirming, setConfirming] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const [handsFree, setHandsFree] = useState(false);

  const pending = useRef(null); // ultima peticion, para "Reintentar"
  const nextId = useRef(0);
  const generation = useRef(0); // si cambia (clear), se ignoran respuestas viejas
  const lastByVoice = useRef(false);
  const speakRepliesRef = useRef(false);
  const handsFreeRef = useRef(false);
  const voiceTextRef = useRef(() => {});

  const voice = useVoice({ onResult: (text) => voiceTextRef.current(text) });
  const { startListening, stopListening, speak, cancelSpeech } = voice;

  useEffect(() => {
    speakRepliesRef.current = speakReplies;
    handsFreeRef.current = handsFree;
  });

  const addMessage = useCallback((rol, contenido, extra = {}) => {
    const id = ++nextId.current;
    setMessages((prev) => [...prev, { id, rol, contenido, ...extra }]);
  }, []);

  // habla la respuesta si se uso la voz o si el usuario activo "responder en voz alta"
  const reply = useCallback(
    (text, byVoice) => {
      if (!byVoice && !speakRepliesRef.current) return;
      speak(toSpeech(text), () => {
        if (handsFreeRef.current) startListening();
      });
    },
    [speak, startListening],
  );

  const ask = useCallback(
    async (request, byVoice) => {
      const current = generation.current;
      pending.current = { request, byVoice };
      setLoading(true);
      setError(null);
      try {
        const res = await sendCopilotMessage({ ...request, voz: byVoice });
        if (current !== generation.current) return;
        addMessage("assistant", res.respuesta, { fuentes: res.fuentes ?? [] });
        setAccion(res.accion ?? null);
        pending.current = null;
        reply(res.respuesta, byVoice);
      } catch (err) {
        if (current === generation.current) setError(err.message);
      } finally {
        if (current === generation.current) setLoading(false);
      }
    },
    [addMessage, reply],
  );

  const confirm = useCallback(async () => {
    if (!accion || confirming) return;
    const current = generation.current;
    setConfirming(true);
    try {
      const res = await confirmCopilotAction(accion.token);
      if (current !== generation.current) return;
      setAccion(null);
      addMessage("assistant", res.mensaje);
      reply(res.mensaje, lastByVoice.current);
    } catch (err) {
      if (current !== generation.current) return;
      // 400/404/409: la accion ya no es valida, se descarta. Otro error: se puede reintentar
      if ([400, 404, 409].includes(err.status)) setAccion(null);
      const text = `No se pudo registrar: ${err.message}`;
      addMessage("assistant", text);
      reply(text, lastByVoice.current);
    } finally {
      if (current === generation.current) setConfirming(false);
    }
  }, [accion, confirming, addMessage, reply]);

  const cancel = useCallback(() => {
    if (!accion) return;
    setAccion(null);
    const text = "Cancelado. No se registró ningún cambio.";
    addMessage("assistant", text);
    reply(text, lastByVoice.current);
  }, [accion, addMessage, reply]);

  const send = useCallback(
    (text, { byVoice = false } = {}) => {
      const pregunta = text.trim();
      if (!pregunta || loading || confirming) return;
      lastByVoice.current = byVoice;

      if (accion) {
        const intent = intentOf(pregunta);
        if (intent) {
          addMessage("user", pregunta);
          if (intent === "confirm") confirm();
          else cancel();
          return;
        }
      }

      // un mensaje nuevo reemplaza cualquier accion que estuviera pendiente
      setAccion(null);
      const historial = messages
        .slice(-MAX_HISTORY)
        .map(({ rol, contenido }) => ({ rol, contenido }));
      addMessage("user", pregunta);
      ask({ pregunta, historial }, byVoice);
    },
    [accion, ask, addMessage, cancel, confirm, confirming, loading, messages],
  );

  useEffect(() => {
    voiceTextRef.current = (text) => send(text, { byVoice: true });
  });

  const retry = useCallback(() => {
    if (pending.current && !loading) ask(pending.current.request, pending.current.byVoice);
  }, [ask, loading]);

  const clear = useCallback(() => {
    generation.current += 1;
    pending.current = null;
    stopListening();
    cancelSpeech();
    setMessages([]);
    setError(null);
    setAccion(null);
    setLoading(false);
    setConfirming(false);
  }, [stopListening, cancelSpeech]);

  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => {
    stopListening();
    cancelSpeech();
    setOpen(false);
  }, [stopListening, cancelSpeech]);

  const toggleMic = useCallback(() => {
    if (voice.listening) stopListening();
    else if (!loading && !confirming) startListening();
  }, [voice.listening, stopListening, startListening, loading, confirming]);

  const toggleSpeakReplies = useCallback(() => {
    if (speakReplies) {
      cancelSpeech();
      setHandsFree(false); // sin voz no hay manos libres
    }
    setSpeakReplies((v) => !v);
  }, [speakReplies, cancelSpeech]);

  const toggleHandsFree = useCallback(() => {
    if (!handsFree) setSpeakReplies(true); // manos libres necesita oir las respuestas
    setHandsFree((v) => !v);
  }, [handsFree]);

  return {
    open,
    openChat,
    closeChat,
    messages,
    loading,
    error,
    accion,
    confirming,
    send,
    retry,
    clear,
    confirm,
    cancel,
    voice: {
      supported: voice.supported,
      listening: voice.listening,
      interim: voice.interim,
      speaking: voice.speaking,
      error: voice.voiceError,
      toggleMic,
    },
    speakReplies,
    toggleSpeakReplies,
    handsFree,
    toggleHandsFree,
  };
}