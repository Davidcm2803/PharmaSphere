import { useState } from "react";
import { Send } from "lucide-react";
import Button from "../../ui/Button";
import Input from "../../ui/Input";

export default function CopilotClienteInput({ onSend, disabled }) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 border-t border-brand-border p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
    >
      <div className="min-w-0 flex-1">
        <Input
          id="copilot-cliente-input"
          aria-label="Escribe tu mensaje para Javier"
          placeholder="Cuéntame cómo te sientes o qué necesitas…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          autoComplete="off"
          className="w-full text-base sm:text-sm"
        />
      </div>
      <Button type="submit" disabled={!text.trim() || disabled} aria-label="Enviar mensaje" className="shrink-0 px-3">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}