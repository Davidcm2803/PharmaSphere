import { useEffect } from "react";
import ActionButton from "./ActionButton";

export default function ConfirmDialog({ title, message, confirmLabel = "Confirmar", loading, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !loading && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={loading ? undefined : onCancel} aria-hidden="true" />
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
        className="relative w-full max-w-md rounded-3xl border border-brand-border bg-brand-card p-6 shadow-xl">
        <h2 id="confirm-title" className="text-lg font-bold text-brand-foreground">{title}</h2>
        <p className="mt-2 text-[15px] text-brand-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <ActionButton onClick={onCancel} disabled={loading}>Cancelar</ActionButton>
          <ActionButton variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Eliminando…" : confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}