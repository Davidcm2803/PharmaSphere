import { AlertTriangle, Info, Siren } from "lucide-react";

const CONFIG = {
  moderado: { label: "Moderado", icon: Info, clase: "bg-sky-600 text-white" },
  grave: { label: "Grave", icon: AlertTriangle, clase: "bg-orange-600 text-white" },
  emergencia: { label: "Emergencia", icon: Siren, clase: "bg-red-600 text-white" },
};

export default function NivelCasoBadge({ nivel }) {
  const cfg = CONFIG[nivel];

  if (!cfg) {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-600 px-2 py-1 text-xs font-semibold text-white">
        {nivel}
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