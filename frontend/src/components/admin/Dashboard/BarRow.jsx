import { motion, useReducedMotion } from "motion/react";

// Fila con barra horizontal que crece desde 0.
export default function BarRow({ label, valueText, percent }) {
  const reduce = useReducedMotion();
  const width = `${Math.max(0, Math.min(100, percent))}%`;
  return (
    <li>
      <div className="flex justify-between gap-3 text-sm">
        <span className="truncate text-brand-foreground">{label}</span>
        <span className="shrink-0 font-semibold text-brand-foreground">{valueText}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-muted">
        <motion.div className="h-full rounded-full bg-brand-primary" initial={{ width: reduce ? width : 0 }} animate={{ width }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </div>
    </li>
  );
}