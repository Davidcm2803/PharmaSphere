import { motion, useReducedMotion } from "motion/react";
import { cn } from "../../../lib/utils";

export default function BarRow({ label, valueText, percent, rank, highlight = false, index = 0 }) {
  const reduce = useReducedMotion();
  const width = `${Math.max(3, Math.min(100, Number(percent) || 0))}%`;
  return (
    <li>
      <div className="mb-1.5 flex items-center gap-2 text-sm">
        {rank != null && (
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
              highlight ? "bg-brand-primary text-brand-primary-foreground" : "bg-brand-muted text-brand-muted-foreground",
            )}
          >
            {rank}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-brand-foreground">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-brand-foreground">{valueText}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-brand-muted">
        <motion.div
          className={cn("h-full rounded-full", highlight ? "bg-brand-primary" : "bg-brand-primary-light")}
          initial={reduce ? false : { width: 0 }}
          animate={{ width }}
          transition={{ duration: 0.7, delay: index * 0.08, ease: "easeOut" }}
        />
      </div>
    </li>
  );
}