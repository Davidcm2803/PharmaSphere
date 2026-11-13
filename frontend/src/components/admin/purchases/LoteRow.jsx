import { Trash2 } from "lucide-react";
import Input from "../../Ui/Input";

// Un lote de un producto: número, vencimiento y cantidad. `errors` trae los mensajes del lote
export default function LoteRow({
  id,
  lote,
  minDate,
  errors,
  canRemove,
  onChange,
  onRemove,
}) {
  return (
    <li className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[1fr_1fr_110px_auto]">
      <Input
        id={`${id}-numero`}
        label="N.º de lote"
        value={lote.numero_lote}
        onChange={(e) => onChange({ numero_lote: e.target.value })}
        error={errors?.numero_lote}
        placeholder="Ej. L-2026-001"
        maxLength={100}
        className="text-base sm:text-sm"
      />
      <Input
        id={`${id}-vence`}
        label="Vencimiento"
        type="date"
        min={minDate}
        value={lote.fecha_vencimiento}
        onChange={(e) => onChange({ fecha_vencimiento: e.target.value })}
        error={errors?.fecha_vencimiento}
        className="text-base sm:text-sm"
      />
      <Input
        id={`${id}-cantidad`}
        label="Cantidad"
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        value={lote.cantidad}
        onChange={(e) => onChange({ cantidad: e.target.value })}
        error={errors?.cantidad}
        className="text-base sm:text-sm"
      />
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar lote"
          title="Quitar lote"
          className="mt-6 flex h-9 w-9 items-center justify-center justify-self-end rounded-lg text-brand-muted-foreground transition-colors hover:bg-brand-muted hover:!text-brand-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}
