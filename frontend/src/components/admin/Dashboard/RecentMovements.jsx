import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeftRight, Ban, ShoppingBag, SlidersHorizontal, Truck } from "lucide-react";
import WidgetCard from "./WidgetCard";
import { cn } from "../../../lib/utils";

const TIPOS = {
  venta: { label: "Venta", icon: ShoppingBag },
  compra: { label: "Compra", icon: Truck },
  ajuste: { label: "Ajuste", icon: SlidersHorizontal },
  transferencia_entrada: { label: "Transferencia (entrada)", icon: ArrowLeftRight },
  transferencia_salida: { label: "Transferencia (salida)", icon: ArrowLeftRight },
  vencimiento: { label: "Vencimiento", icon: Ban },
};

const units = new Intl.NumberFormat("es-CR", { signDisplay: "exceptZero" });

export default function RecentMovements({ query }) {
  const reduce = useReducedMotion();
  const rows = query.data;
  return (
    <WidgetCard title="Últimos movimientos" subtitle="Inventario" query={query} isEmpty={!rows.length} emptyText="Aún no hay movimientos de inventario." className="h-full">
      <ul className="flex-1 divide-y divide-brand-border">
        {rows.map((m, i) => {
          const t = TIPOS[m.tipo] ?? { label: m.tipo, icon: SlidersHorizontal };
          const Icon = t.icon;
          const entra = Number(m.cantidad) > 0;
          const tone = entra ? "bg-brand-success-soft text-brand-success" : "bg-brand-danger-soft text-brand-danger";
          return (
            <motion.li
              key={m.id_movimiento}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tone)} aria-hidden="true">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-foreground">{t.label} · {m.producto_nombre}</p>
                <p className="truncate text-xs text-brand-muted-foreground">{m.sucursal} · {format(parseISO(m.fecha), "d MMM, HH:mm", { locale: es })}</p>
              </div>
              {/* Son unidades de stock, no porcentajes */}
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums", tone)}>
                {units.format(Number(m.cantidad))} u
              </span>
            </motion.li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}