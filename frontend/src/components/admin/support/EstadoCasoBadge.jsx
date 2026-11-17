import { CheckCircle2, CircleDot, Clock } from "lucide-react";

const CONFIG = {
  abierto: { label: "Abierto", icon: CircleDot, clase: "bg-blue-600 text-white" },
  atendido: { label: "En atención", icon: Clock, clase: "bg-amber-600 text-white" },
  cerrado: { label: "Cerrado", icon: CheckCircle2, clase: "bg-emerald-600 text-white" },
};

export default function EstadoCasoBadge({ estado }) {
  const cfg = CONFIG[estado];

  if (!cfg) {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-600 px-2 py-1 text-xs font-semibold text-white">
        {estado}
      </span>
    );
  }

  const Icono = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold leading-none ${cfg.clase}`}
    >
      <Icono className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}