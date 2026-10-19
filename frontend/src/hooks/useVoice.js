import { useCallback, useEffect, useRef, useState } from "react";

const Recognition =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const synth =
  typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
const LANG = "es-CR";

const MIC_DENIED = "Permiso de micrófono denegado. Actívalo en el navegador.";
const MIC_ERRORS = {
  "not-allowed": MIC_DENIED,
  "service-not-allowed": MIC_DENIED,
  "audio-capture": "No se encontró un micrófono.",
  network: "El reconocimiento de voz necesita conexión a internet.",
};

const pickVoice = () => {
  const voices = synth?.getVoices() ?? [];
  return (
    voices.find((v) => v.lang === "es-CR") ||
    voices.find((v) => v.lang === "es-MX" || v.lang === "es-419") ||
    voices.find((v) => v.lang.toLowerCase().startsWith("es"))
  );
};

// Voz del navegador (gratis): dictado con SpeechRecognition y respuestas con speechSynthesis.
// Un toque en el microfono = una frase (push-to-talk). onResult recibe el texto final.
export default function useVoice({ onResult }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const recRef = useRef(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  });

  const cancelSpeech = useCallback(() => {
    synth?.cancel();
    setSpeaking(false);
  }, []);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    if (!Recognition || recRef.current) return;
    // que el micro no capte la voz de Javier
    synth?.cancel();
    setSpeaking(false);

    const rec = new Recognition();
    rec.lang = LANG;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = "";

    rec.onstart = () => {
      setListening(true);
      setVoiceError(null);
    };
    rec.onresult = (e) => {
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else partial += r[0].transcript;
      }
      setInterim(finalText + partial);
    };
    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setVoiceError(MIC_ERRORS[e.error] ?? "No se pudo usar el micrófono.");
      }
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      setInterim("");
      const text = finalText.trim();
      if (text) onResultRef.current?.(text);
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      recRef.current = null;
    }
  }, []);

  const speak = useCallback((text, onEnd) => {
    if (!synth || !text) {
      onEnd?.();
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG;
    utterance.rate = 1.05;
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
  }, []);

  useEffect(
    () => () => {
      recRef.current?.abort();
      synth?.cancel();
    },
    [],
  );

  return {
    supported: { listen: Boolean(Recognition), speak: Boolean(synth) },
    listening,
    interim,
    speaking,
    voiceError,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
  };
}