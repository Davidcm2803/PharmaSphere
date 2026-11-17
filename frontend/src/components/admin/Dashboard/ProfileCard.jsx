import { Briefcase, Pill, Users } from "lucide-react";
import CountUp from "./CountUp";

const STATS = [
  { key: "productos", label: "Productos", icon: Pill },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "empleados", label: "Empleados", icon: Briefcase },
];

export default function ProfileCard({ nombre, email, productos, clientes, empleados }) {
  const values = { productos, clientes, empleados };
  const initials =
    (nombre ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <section className="flex h-full min-h-72 flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-card p-5 shadow-sm">
      <div className="-mx-5 -mt-5 h-20 bg-linear-to-br from-brand-primary-light via-brand-primary to-brand-accent-deep" aria-hidden="true" />
      <div className="-mt-9 flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-brand-card bg-brand-accent text-lg font-bold text-brand-primary-dark shadow-sm">
          {initials}
        </span>
        <p className="mt-2 max-w-full truncate font-semibold text-brand-foreground">{nombre ?? "—"}</p>
        {email && <p className="max-w-full truncate text-xs text-brand-muted-foreground">{email}</p>}
      </div>
      <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
        {STATS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-xl bg-brand-muted px-2 py-3 text-center">
            <Icon className="mx-auto mb-1 h-4 w-4 text-brand-primary-dark" aria-hidden="true" />
            <p className="text-xl font-bold text-brand-foreground"><CountUp value={values[key]} /></p>
            <p className="text-xs text-brand-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}