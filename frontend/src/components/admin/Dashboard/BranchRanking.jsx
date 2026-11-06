import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { motion, useReducedMotion } from "motion/react";
import WidgetCard from "./WidgetCard";
import { formatPrice } from "../../../lib/format";

const COLORS = [
  "var(--color-brand-primary)",
  "var(--color-brand-accent-deep)",
  "var(--color-brand-primary-light)",
  "var(--color-brand-warning)",
  "var(--color-brand-muted-foreground)",
];

const pctText = (v) => Number(v).toLocaleString("es-CR", { maximumFractionDigits: 1 });

function BranchTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-xl border border-brand-border bg-brand-card px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-brand-foreground">{r.nombre}</p>
      <p className="text-brand-muted-foreground">{formatPrice(r.total)} · {pctText(r.pct)}%</p>
    </div>
  );
}

export default function BranchRanking({ query }) {
  const reduce = useReducedMotion();
  const rows = query.data;
  const total = rows.reduce((a, r) => a + Number(r.total ?? 0), 0);
  return (
    <WidgetCard title="Ventas por sucursal" subtitle="% del total vendido" query={query} isEmpty={!rows.length} emptyText="Sin ventas por sucursal en este período." className="h-full">
      <div role="img" aria-label="Gráfica de dona con el porcentaje de ventas por sucursal" className="relative mx-auto h-40 w-full max-w-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="total"
              nameKey="nombre"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={rows.length > 1 ? 3 : 0}
              cornerRadius={7}
              stroke="none"
              isAnimationActive={!reduce}
            >
              {rows.map((r, i) => (
                <Cell key={r.id_sucursal} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<BranchTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-brand-muted-foreground">Total</span>
          <span className="text-base font-bold text-brand-foreground">{formatPrice(total)}</span>
        </div>
      </div>
      <ul className="mt- space-y-2.5">
        {rows.map((r, i) => (
          <motion.li
            key={r.id_sucursal}
            initial={reduce ? false : { opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.07 }}
            className="flex items-center gap-2 text-sm"
          >
            <span className="h-10 w-3 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-brand-foreground">{r.nombre}</span>
            <span className="shrink-0 text-xs text-brand-muted-foreground">{formatPrice(r.total)}</span>
            <span className="w-14 shrink-0 text-right font-semibold tabular-nums text-brand-foreground">{pctText(r.pct)}%</span>
          </motion.li>
        ))}
      </ul>
    </WidgetCard>
  );
}