import { CircleAlert, CircleCheck, X } from "lucide-react";
import { cn } from "../../../lib/utils";

export default function Notice({ type = "success", onClose, className, children }) {
  const ok = type === "success";
  const Icon = ok ? CircleCheck : CircleAlert;
  return (
    <div
      role={ok ? "status" : "alert"}
      className={cn(
        "flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium",
        ok ? "bg-brand-success-soft text-brand-accent-foreground" : "bg-brand-danger-soft text-brand-danger",
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} aria-label="Cerrar mensaje" className="opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}