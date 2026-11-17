import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { Ban, Clock, Package } from "lucide-react";
import WidgetCard from "./WidgetCard";
import { cn } from "../../../lib/utils";

const MAX = 6;

const TIPOS = {
  stock_bajo: { label: "Stock bajo", icon: Package, cls: "bg-brand-warning-soft text-brand-warning" },
  por_vencer: { label: "Por vencer", icon: Clock, cls: "bg-brand-warning-soft text-brand-warning" },
  vencido: { label: "Vencido", icon: Ban, cls: "bg-brand-danger-soft text-brand-danger" },
};

export default function AlertsList({ query }) {
  const reduce = useReducedMotion();
  const rows = query.data;
  const visibles = rows.slice(0, MAX);
  const counts = rows.reduce((acc, a) => ({ ...acc, [a.tipo]: (acc[a.tipo] ?? 0) + 1 }), {});
  return (
    <WidgetCard title="Alertas" subtitle="Stock bajo, por vencer y vencidos" query={query} isEmpty={!rows.length} emptyText="Todo en orden: no hay alertas de inventario." className="h-full">
      <div className="mb-3 flex flex-wrap gap-2">
        {Object.entries(TIPOS).map(([tipo, t]) =>
          counts[tipo] ? (
            <span key={tipo} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", t.cls)}>
              {counts[tipo]} {t.label.toLowerCase()}
            </span>
          ) : null,
        )}
      </div>
      <ul className="flex-1 divide-y divide-brand-border">
        {visibles.map((a, i) => {
          const t = TIPOS[a.tipo] ?? TIPOS.stock_bajo;
          const Icon = t.icon;
          return (
            <motion.li
              key={`${a.tipo}-${a.id_producto}-${i}`}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", t.cls)} aria-hidden="true">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-foreground">{a.nombre}</p>
                <p className="truncate text-xs text-brand-muted-foreground">{a.detalle}</p>
              </div>
              <Link to={`/admin/productos/${a.id_producto}/editar`} className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold hover:opacity-80", t.cls)}>
                {t.label}
              </Link>
            </motion.li>
          );
        })}
      </ul>
      {rows.length > MAX && (
        <p className="mt-3 text-center text-xs text-brand-muted-foreground">
          y {rows.length - MAX} más ·{" "}
          <Link to="/admin/inventario" className="font-semibold text-brand-primary-dark underline">Ver inventario</Link>
        </p>
      )}
    </WidgetCard>
  );
}