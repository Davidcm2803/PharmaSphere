import Notice from "../ui/Notice";
import { cn } from "../../../lib/utils";

export default function WidgetCard({ title, subtitle, query, isEmpty, emptyText = "Aún no hay datos para mostrar.", action, className, children }) {
  const { loading, error, refetch } = query ?? {};
  return (
    <section className={cn("flex min-h-72 flex-col rounded-2xl border border-brand-border bg-brand-card p-5 shadow-sm", className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-brand-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-brand-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      {error ? (
        <div className="space-y-3">
          <Notice type="error">{error}</Notice>
          <button onClick={refetch} className="h-9 rounded-lg border border-brand-border px-4 text-sm font-semibold hover:bg-brand-muted">Reintentar</button>
        </div>
      ) : loading ? (
        <div aria-busy="true" className="min-h-48 flex-1 animate-pulse rounded-xl bg-brand-muted" />
      ) : isEmpty ? (
        <p className="m-auto text-center text-sm text-brand-muted-foreground">{emptyText}</p>
      ) : (
        children
      )}
    </section>
  );
}