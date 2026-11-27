import { useEffect, useRef } from "react";
import { HeartPulse, Trash2, X } from "lucide-react";
import Spinner from "../../ui/Spinner";
import CopilotClienteInput from "./CopilotClienteInput";
import CopilotClienteMensaje from "./CopilotClienteMensaje";

const SUGERENCIAS = [
  "No me he sentido bien, ¿qué puedo hacer?",
  "¿Tienen ibuprofeno en existencia?",
  "¿Dónde está la sucursal más cercana?",
  "Necesito hablar con un farmacéutico",
];

const headerButton =
  "flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted-foreground transition-colors hover:bg-brand-muted hover:text-brand-foreground";

export default function CopilotClientePanel({
  messages,
  loading,
  error,
  isAuthError,
  onSend,
  onRetry,
  onClear,
  onClose,
}) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading, error]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isEmpty = messages.length === 0 && !loading;

  return (
    <section
      role="dialog"
      aria-label="Javier, asistente de bienestar"
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-brand-card pt-[env(safe-area-inset-top)] text-brand-foreground lg:inset-auto lg:bottom-6 lg:right-6 lg:h-[600px] lg:max-h-[calc(100vh-3rem)] lg:w-[400px] lg:rounded-[28px] lg:border lg:border-brand-border lg:pt-0 lg:shadow-2xl"
    >
      <header className="flex items-center gap-3 border-b border-brand-border px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-brand-primary-foreground">
          <HeartPulse className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Javier · Asistente de bienestar</h2>
          <p className="truncate text-xs text-brand-muted-foreground">
            Dudas sobre productos, sucursales y cómo te sientes
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={onClear} className={headerButton} aria-label="Nueva conversación" title="Nueva conversación">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <button onClick={onClose} className={headerButton} aria-label="Cerrar" title="Cerrar">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-brand-muted-foreground">
              Soy Javier. Puedo orientarte sobre productos, sucursales y cómo te sientes —
              no reemplazo a un farmacéutico ni a un médico.
            </p>
            <div className="flex flex-col gap-2">
              {SUGERENCIAS.map((s) => (
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
          <CopilotClienteMensaje
            key={m.id}
            rol={m.rol}
            contenido={m.contenido}
            fuentes={m.fuentes}
            nivelAlerta={m.nivelAlerta}
            escalamiento={m.escalamiento}
          />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-brand-muted-foreground">
            <Spinner size="sm" /> Pensando…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {error}
            {!isAuthError && (
              <button onClick={onRetry} className="ml-2 font-semibold underline">
                Reintentar
              </button>
            )}
            {isAuthError && (
              <p className="mt-1 text-xs">Tu sesión expiró, inicia sesión de nuevo para continuar.</p>
            )}
          </div>
        )}

        <div ref={endRef} />
      </div>

      <CopilotClienteInput onSend={onSend} disabled={loading} />
    </section>
  );
}