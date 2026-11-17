import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useReducedMotion } from "motion/react";
import WidgetCard from "./WidgetCard";
import PeriodSelect from "./PeriodSelect";
import { formatPrice } from "../../../lib/format";

const day = (f) => format(parseISO(f), "d MMM", { locale: es });

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-brand-border bg-brand-card px-3 py-2 text-sm shadow-md">
      <p className="text-brand-muted-foreground">{day(label)}</p>
      <p className="font-bold text-brand-foreground">{formatPrice(payload[0].value)}</p>
    </div>
  );
}

function Chip({ label, value }) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-card px-4 py-2 shadow-sm">
      <p className="text-xs text-brand-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-brand-foreground">{formatPrice(value)}</p>
    </div>
  );
}

export default function SalesChart({ query, dias, onDiasChange }) {
  const reduce = useReducedMotion();
  const rows = query.data;
  const { total, ganancia } = useMemo(
    () => rows.reduce((a, r) => ({ total: a.total + Number(r.total), ganancia: a.ganancia + Number(r.ganancia ?? 0) }), { total: 0, ganancia: 0 }),
    [rows],
  );
  return (
    <WidgetCard title="Ventas por día" query={query} isEmpty={!rows.length} action={<PeriodSelect value={dias} onChange={onDiasChange} />} className="h-full">
      <div className="mb-3 flex flex-wrap gap-3">
        <Chip label="Total del período" value={total} />
        <Chip label="Ganancia estimada" value={ganancia} />
      </div>
      <p className="sr-only">Ventas de los últimos {dias} días: {formatPrice(total)} en total.</p>
      <div role="img" aria-label={`Gráfica de ventas por día, últimos ${dias} días`} className="relative min-h-60 w-full flex-1">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ventasFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-brand-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-brand-border)" />
              <XAxis dataKey="fecha" tickFormatter={day} tickLine={false} axisLine={false} minTickGap={28} tick={{ fill: "var(--color-brand-muted-foreground)", fontSize: 12 }} />
              <YAxis hide />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="total" stroke="var(--color-brand-primary-dark)" strokeWidth={2.5} fill="url(#ventasFill)" isAnimationActive={!reduce} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </WidgetCard>
  );
}