import { useState } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import Button from "../../Ui/Button";
import Input from "../../Ui/Input";

export default function CopilotInput({ onSend, disabled, voice }) {
  const [text, setText] = useState("");
  const canListen = voice.supported.listen;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
  };

  const placeholder = voice.listening ? voice.interim || "Escuchando…" : "Escribe o habla…";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 border-t border-brand-border p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
    >
      <div className="min-w-0 flex-1">
        <Input
          id="copilot-input"
          aria-label="Pregunta para el Copilot"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          autoComplete="off"
          className="w-full text-base sm:text-sm"
        />
      </div>
      {canListen && (
        <Button
          type="button"
          variant={voice.listening ? "danger" : "outline"}
          onClick={voice.toggleMic}
          disabled={disabled && !voice.listening}
          aria-label={voice.listening ? "Dejar de escuchar" : "Hablar con Javier"}
          aria-pressed={voice.listening}
          title={voice.listening ? "Dejar de escuchar" : "Hablar con Javier"}
          className="shrink-0 px-3"
        >
          {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      )}
      <Button type="submit" disabled={!text.trim() || disabled} aria-label="Enviar pregunta" className="shrink-0 px-3">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}