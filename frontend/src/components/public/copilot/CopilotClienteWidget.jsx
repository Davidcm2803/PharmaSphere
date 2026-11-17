// frontend/src/components/public/copilot/CopilotClienteWidget.jsx
import { HeartPulse } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import useCopilotCliente from "../../../hooks/useCopilotCliente";
import CopilotClientePanel from "./CopilotClientePanel";

// Montar UNA vez en el layout publico (ej. PublicLayout.jsx), fuera de las
// rutas de admin. Se autooculta si el usuario no esta logueado o no es cliente.
export default function CopilotClienteWidget() {
  const { user } = useAuth();
  const {
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
  } = useCopilotCliente();

  if (user?.rol !== "cliente") return null;

  if (open) {
    return (
      <CopilotClientePanel
        messages={messages}
        loading={loading}
        error={error}
        isAuthError={isAuthError}
        onSend={send}
        onRetry={retry}
        onClear={clear}
        onClose={closeChat}
      />
    );
  }

  return (
    <button
      onClick={openChat}
      aria-label="Abrir Javier, asistente de bienestar"
      title="Javier · Asistente de bienestar"
      className="fixed bottom-28 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-brand-primary-foreground shadow-lg transition hover:bg-brand-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring lg:bottom-6 lg:right-6"
    >
      <HeartPulse className="h-6 w-6" />
    </button>
  );
}