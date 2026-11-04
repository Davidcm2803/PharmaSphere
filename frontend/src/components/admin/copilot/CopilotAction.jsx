import { Package } from "lucide-react";
import Button from "../../Ui/Button";

// Tarjeta de confirmacion: nada se guarda hasta que el usuario aprueba
export default function CopilotAction({ accion, confirming, onConfirm, onCancel }) {
  return (
    <div
      role="group"
      aria-label="Confirmar acción"
      className="mx-4 mb-3 rounded-2xl border border-brand-primary bg-brand-accent p-3 text-brand-accent-foreground"
    >
      <div className="flex items-start gap-2">
        <Package className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-sm font-medium leading-snug">{accion.resumen}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <Button onClick={onConfirm} loading={confirming} className="flex-1">
          Confirmar
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={confirming} className="flex-1">
          Cancelar
        </Button>
      </div>
      <p className="mt-2 text-xs opacity-80">También puedes decir «sí» o «cancela».</p>
    </div>
  );
}