import { Link } from "react-router-dom";
import WidgetCard from "./WidgetCard";
import { cn } from "../../../lib/utils";

const TIPOS = {
  stock_bajo: { label: "Stock bajo", cls: "bg-brand-warning-soft text-brand-warning" },
  por_vencer: { label: "Por vencer", cls: "bg-brand-warning-soft text-brand-warning" },
  vencido: { label: "Vencido", cls: "bg-brand-danger-soft text-brand-danger" },
};

export default function AlertsList({ query }) {
  const rows = query.data;
  return (
    <WidgetCard title="Alertas" subtitle="Stock bajo, por vencer y vencidos" query={query} isEmpty={!rows.length} emptyText="Todo en orden: no hay alertas de inventario.">
      <ul className="divide-y divide-brand-border">
        {rows.map((a, i) => {
          const t = TIPOS[a.tipo] ?? TIPOS.stock_bajo;
          return (
            <li key={`${a.tipo}-${a.id_producto}-${i}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="h-10 w-1 shrink-0 rounded-full bg-brand-primary-dark" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-foreground">{a.nombre}</p>
                <p className="truncate text-xs text-brand-muted-foreground">{a.detalle}</p>
              </div>
              <Link to={`/admin/productos/${a.id_producto}/editar`} className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold hover:opacity-80", t.cls)}>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}