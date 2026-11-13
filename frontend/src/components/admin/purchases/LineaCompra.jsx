import { Trash2 } from "lucide-react";
import Input from "../../Ui/Input";
import { formatPrice } from "../../../lib/format";

// Una línea de la orden: producto, cantidad y costo unitario. `linea.errors` trae los mensajes
export default function LineaCompra({ linea, onChange, onRemove }) {
  const subtotal =
    (Number(linea.cantidad) || 0) * (Number(linea.costo_unitario) || 0);

  return (
    <li className="rounded-2xl border border-brand-border p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-brand-foreground">{linea.nombre}</p>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${linea.nombre}`}
          title="Quitar de la orden"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-muted-foreground transition-colors hover:bg-brand-muted hover:!text-brand-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Input
          id={`cantidad-${linea.id_producto}`}
          label="Cantidad"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={linea.cantidad}
          onChange={(e) => onChange({ cantidad: e.target.value })}
          error={linea.errors?.cantidad}
          className="text-base sm:text-sm"
        />
        <Input
          id={`costo-${linea.id_producto}`}
          label="Costo unitario"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={linea.costo_unitario}
          onChange={(e) => onChange({ costo_unitario: e.target.value })}
          error={linea.errors?.costo_unitario}
          className="text-base sm:text-sm"
        />
        <div className="col-span-2 flex flex-col justify-end sm:col-span-1">
          <p className="text-xs font-medium text-brand-muted-foreground">
            Subtotal
          </p>
          <p className="py-2 text-base font-bold text-brand-foreground">
            {formatPrice(subtotal)}
          </p>
        </div>
      </div>
    </li>
  );
}
