import { motion, useReducedMotion } from "motion/react";
import WidgetCard from "./WidgetCard";

const ARC = "M20 100a80 80 0 01160 0";

function Count({ value, label }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-brand-foreground">{value ?? "—"}</p>
      <p className="text-xs text-brand-muted-foreground">{label}</p>
    </div>
  );
}

export default function StockGauge({ query }) {
  const reduce = useReducedMotion();
  const s = query.data;
  const pct = Math.max(0, Math.min(100, Number(s?.pct_stock_sano ?? 0)));
  return (
    <WidgetCard title="Salud del inventario" subtitle="Productos con stock sobre el mínimo" query={query} isEmpty={!s}>
      <div role="img" aria-label={`${Math.round(pct)}% de los productos tiene stock sano`} className="mx-auto w-full max-w-60">
        <svg viewBox="0 0 200 110" className="w-full" aria-hidden="true">
          <path d={ARC} fill="none" stroke="var(--color-brand-muted)" strokeWidth="18" strokeLinecap="round" />
          <motion.path d={ARC} fill="none" stroke="var(--color-brand-primary)" strokeWidth="18" strokeLinecap="round" initial={{ pathLength: reduce ? pct / 100 : 0 }} animate={{ pathLength: pct / 100 }} transition={{ duration: 1, ease: "easeOut" }} />
        </svg>
        <p className="-mt-9 text-center text-3xl font-bold text-brand-foreground">{Math.round(pct)}%</p>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2 border-t border-brand-border pt-4">
        <Count value={s?.stock_bajo} label="Stock bajo" />
        <Count value={s?.por_vencer} label="Por vencer" />
        <Count value={s?.vencidos} label="Vencidos" />
      </div>
    </WidgetCard>
  );
}