import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import WidgetCard from "./WidgetCard";
import { Variation } from "./KpiCard";

const TIPOS = { ajuste: "Ajuste", venta: "Venta", transferencia_entrada: "Transferencia (entrada)", transferencia_salida: "Transferencia (salida)" };

export default function RecentMovements({ query }) {
  const rows = query.data;
  return (
    <WidgetCard title="Últimos movimientos" subtitle="Inventario" query={query} isEmpty={!rows.length} emptyText="Aún no hay movimientos de inventario.">
      <ul className="divide-y divide-brand-border">
        {rows.map((m) => (
          <li key={m.id_movimiento} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="h-10 w-1 shrink-0 rounded-full bg-brand-primary-dark" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-brand-foreground">{TIPOS[m.tipo] ?? m.tipo} · {m.producto_nombre}</p>
              <p className="truncate text-xs text-brand-muted-foreground">{m.sucursal} · {format(parseISO(m.fecha), "d MMM, HH:mm", { locale: es })}</p>
            </div>
            <Variation value={Number(m.cantidad)} className="shrink-0" />
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}