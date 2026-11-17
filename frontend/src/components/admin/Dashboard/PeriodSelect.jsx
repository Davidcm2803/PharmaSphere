import { cn } from "../../../lib/utils";

const OPTIONS = [{ value: 7, label: "7 días" }, { value: 30, label: "30 días" }, { value: 90, label: "90 días" }];

export default function PeriodSelect({ value, onChange }) {
  return (
    <div role="group" aria-label="Período" className="flex rounded-full bg-brand-muted p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", value === o.value ? "bg-brand-card font-semibold text-brand-foreground shadow-sm" : "text-brand-muted-foreground hover:text-brand-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}