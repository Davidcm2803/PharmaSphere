import { useEffect, useRef } from "react";
import { Bot, Trash2, Volume2, VolumeX, X } from "lucide-react";
import Spinner from "../../Ui/Spinner";
import Notice from "../ui/Notice";
import CopilotAction from "./CopilotAction";
import CopilotInput from "./CopilotInput";
import CopilotMessage from "./CopilotMessage";

const SUGGESTIONS = [
  "¿Qué productos tienen más inventario?",
  "¿Qué productos vencen este mes?",
  "Agrega 40 unidades de paracetamol",
  "¿Qué sucursales tenemos activas?",
];

const headerButton =
  "flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted-foreground transition-colors hover:bg-brand-muted hover:text-brand-foreground";

// Celular: pantalla completa (vista de chat). Escritorio: ventana flotante abajo a la derecha.
export default function CopilotPanel({
  messages,
  loading,
  error,
  accion,
  confirming,
  voice,
  speakReplies,
  handsFree,
  onSend,
  onRetry,
  onClear,
  onClose,
  onConfirm,
  onCancel,
  onToggleSpeak,
  onToggleHandsFree,
}) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading, error, accion]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isEmpty = messages.length === 0 && !loading;
  const canSpeak = voice.supported.speak;

  return (
    <section
      role="dialog"
      aria-label="Pharmacy Copilot"
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-brand-card pt-[env(safe-area-inset-top)] text-brand-foreground lg:inset-auto lg:bottom-6 lg:right-6 lg:h-[600px] lg:max-h-[calc(100vh-3rem)] lg:w-[400px] lg:rounded-[28px] lg:border lg:border-brand-border lg:pt-0 lg:shadow-2xl"
    >
      <header className="flex items-center gap-3 border-b border-brand-border px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-brand-primary-foreground">
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Javier · Pharmacy Copilot</h2>
          <p className="truncate text-xs text-brand-muted-foreground">
            {voice.listening ? "Escuchando…" : voice.speaking ? "Hablando…" : "Inventario, vencimientos y procedimientos"}
          </p>
        </div>
        {canSpeak && (
          <button
            onClick={onToggleSpeak}
            className={headerButton}
            aria-pressed={speakReplies}
            aria-label={speakReplies ? "Silenciar respuestas" : "Responder en voz alta"}
            title={speakReplies ? "Silenciar respuestas" : "Responder en voz alta"}
          >
            {speakReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        )}
        {messages.length > 0 && (
          <button onClick={onClear} className={headerButton} aria-label="Nueva conversación" title="Nueva conversación">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <button onClick={onClose} className={headerButton} aria-label="Cerrar" title="Cerrar">
          <X className="h-4 w-4" />
        </button>
      </header>

      {voice.supported.listen && canSpeak && (
        <div className="flex items-center justify-between gap-2 border-b border-brand-border px-4 py-1.5 text-xs text-brand-muted-foreground">
          <span>Manos libres (se recomienda audifonos).</span>
          <button
            onClick={onToggleHandsFree}
            aria-pressed={handsFree}
            className={`shrink-0 rounded-full border px-2.5 py-0.5 font-semibold transition-colors ${
              handsFree
                ? "border-brand-primary bg-brand-primary text-brand-primary-foreground"
                : "border-brand-border hover:bg-brand-muted"
            }`}
          >
            {handsFree ? "Activado" : "Activar"}
          </button>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-brand-muted-foreground">
              Pregúntame por inventario, vencimientos, sucursales o procedimientos, o pídeme registrar una entrada de mercadería.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSend(s)}
                  className="rounded-2xl border border-brand-border px-3 py-2 text-sm transition-colors hover:bg-brand-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <CopilotMessage key={m.id} rol={m.rol} contenido={m.contenido} fuentes={m.fuentes} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-brand-muted-foreground">
            <Spinner size="sm" /> Consultando…
          </div>
        )}

        {error && (
          <Notice type="error">
            {error}
            <button onClick={onRetry} className="ml-2 font-semibold underline">Reintentar</button>
          </Notice>
        )}

        {voice.error && <Notice type="error">{voice.error}</Notice>}
        <div ref={endRef} />
      </div>

      {accion && (
        <CopilotAction accion={accion} confirming={confirming} onConfirm={onConfirm} onCancel={onCancel} />
      )}

      <CopilotInput onSend={onSend} disabled={loading || confirming} voice={voice} />
    </section>
  );
}