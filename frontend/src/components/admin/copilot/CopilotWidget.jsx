import { Bot } from "lucide-react";
import CopilotPanel from "./CopilotPanel";

// Boton flotante abajo a la derecha. En celular sube para no tapar la barra inferior.
export default function CopilotWidget({
  open,
  openChat,
  closeChat,
  messages,
  loading,
  error,
  accion,
  confirming,
  voice,
  speakReplies,
  handsFree,
  send,
  retry,
  clear,
  confirm,
  cancel,
  toggleSpeakReplies,
  toggleHandsFree,
}) {
  if (open) {
    return (
      <CopilotPanel
        messages={messages}
        loading={loading}
        error={error}
        accion={accion}
        confirming={confirming}
        voice={voice}
        speakReplies={speakReplies}
        handsFree={handsFree}
        onSend={send}
        onRetry={retry}
        onClear={clear}
        onClose={closeChat}
        onConfirm={confirm}
        onCancel={cancel}
        onToggleSpeak={toggleSpeakReplies}
        onToggleHandsFree={toggleHandsFree}
      />
    );
  }

  return (
    <button
      onClick={openChat}
      aria-label="Abrir Pharmacy Copilot"
      title="Pharmacy Copilot"
      className="fixed bottom-28 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-brand-primary-foreground shadow-lg transition hover:bg-brand-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring lg:bottom-6 lg:right-6"
    >
      <Bot className="h-6 w-6" />
    </button>
  );
}