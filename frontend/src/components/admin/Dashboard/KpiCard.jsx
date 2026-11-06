import AnimatedNumber from "./AnimatedNumber";
import { cn } from "../../../lib/utils";

const pct = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 2, signDisplay: "always" });

export function Variation({ value, className }) {
  if (value == null) return null;
  const up = Number(value) >= 0;
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", up ? "bg-brand-success-soft text-brand-success" : "bg-brand-danger-soft text-brand-danger", className)}>
      {pct.format(Number(value))}%
    </span>
  );
}

export default function KpiCard({ icon: Icon, label, value, variation, loading }) {
  return (
    <div className="flex min-h-[104px] items-center gap-4 rounded-2xl border border-brand-border bg-brand-card p-5 shadow-sm">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-accent text-brand-primary-dark">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-brand-muted-foreground">{label}</p>
        <p className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-brand-foreground">
          {loading || value == null ? <span className="inline-block h-7 w-28 animate-pulse rounded bg-brand-muted" /> : <AnimatedNumber value={value} />}
          {!loading && <Variation value={variation} />}
        </p>
      </div>
    </div>
  );
}