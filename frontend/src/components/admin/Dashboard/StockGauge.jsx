import { motion, useReducedMotion } from "motion/react";
import WidgetCard from "./WidgetCard";
import CountUp from "./CountUp";
import { cn } from "../../../lib/utils";

const ARC = "M20 100a80 80 0 01160 0";

function status(pct) {
  if (pct >= 80) return { label: "Buen estado", stroke: "var(--color-brand-primary)", text: "text-brand-success" };
  if (pct >= 50) return { label: "Requiere atención", stroke: "var(--color-brand-warning)", text: "text-brand-warning" };
  return { label: "Estado crítico", stroke: "var(--color-brand-danger)", text: "text-brand-danger" };
}

function Count({ value, label, tone }) {
  return (
    <div className="rounded-xl bg-brand-muted px-2 py-3 text-center">
      <p className={cn("text-xl font-bold", Number(value) > 0 ? tone : "text-brand-foreground")}>
        <CountUp value={value} />
      </p>
      <p className="text-xs text-brand-muted-foreground">{label}</p>
    </div>
  );
}

export default function StockGauge({ query }) {
  const reduce = useReducedMotion();
  const s = query.data;
  const pct = Math.max(0, Math.min(100, Number(s?.pct_stock_sano ?? 0)));
  const st = status(pct);
  return (
    <WidgetCard title="Salud del inventario" subtitle="Productos con stock sobre el mínimo" query={query} isEmpty={!s} className="h-full">
      <div role="img" aria-label={`${Math.round(pct)}% de los productos tiene stock sano: ${st.label}`} className="mx-auto my-auto w-full max-w-60">
        <svg viewBox="0 0 200 110" className="w-full" aria-hidden="true">
          <path d={ARC} fill="none" stroke="var(--color-brand-muted)" strokeWidth="18" strokeLinecap="round" />
          <motion.path d={ARC} fill="none" stroke={st.stroke} strokeWidth="18" strokeLinecap="round" initial={{ pathLength: reduce ? pct / 100 : 0 }} animate={{ pathLength: pct / 100 }} transition={{ duration: 1, ease: "easeOut" }} />
        </svg>
        <p className="-mt-9 text-center text-3xl font-bold text-brand-foreground">{Math.round(pct)}%</p>
        <p className={cn("mt-1 text-center text-xs font-semibold", st.text)}>{st.label}</p>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2">
        <Count value={s?.stock_bajo} label="Stock bajo" tone="text-brand-warning" />
        <Count value={s?.por_vencer} label="Por vencer" tone="text-brand-warning" />
        <Count value={s?.vencidos} label="Vencidos" tone="text-brand-danger" />
      </div>
    </WidgetCard>
  );
}