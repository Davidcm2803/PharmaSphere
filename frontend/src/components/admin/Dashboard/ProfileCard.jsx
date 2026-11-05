const Count = ({ value, label }) => (
  <div className="text-center">
    <p className="text-xl font-bold text-brand-foreground">{value == null ? "—" : Number(value).toLocaleString("es-CR")}</p>
    <p className="text-xs text-brand-muted-foreground">{label}</p>
  </div>
);

export default function ProfileCard({ nombre, email, productos, clientes, empleados }) {
  const initials = (nombre ?? "A").split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <section className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-brand-border bg-brand-card p-5 text-center shadow-sm">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-accent text-xl font-bold text-brand-primary-dark" aria-hidden="true">{initials}</span>
      <p className="mt-3 font-bold text-brand-foreground">{nombre ?? "Administrador"}</p>
      {email && <p className="text-sm text-brand-muted-foreground">{email}</p>}
      <div className="mt-6 grid w-full grid-cols-3 gap-2 border-t border-brand-border pt-4">
        <Count value={productos} label="Productos" />
        <Count value={clientes} label="Clientes" />
        <Count value={empleados} label="Empleados" />
      </div>
    </section>
  );
}