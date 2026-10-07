import { AlertTriangle, SearchX } from "lucide-react";
import ProductCard from "./ProductCard";

export const GRID = "grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

export function StatePanel({ icon: Icon, title, text, action, onClick }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-brand-border px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-accent text-brand-accent-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-bold text-brand-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-brand-muted-foreground">{text}</p>
      {action && onClick && (
        <button
          onClick={onClick}
          className="mt-5 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-brand-primary-foreground transition-colors hover:bg-brand-primary-dark"
        >
          {action}
        </button>
      )}
    </div>
  );
}

// Un solo componente para los 4 estados: cargando, error, vacío y lista
export default function ProductList({
  items,
  loading,
  error,
  onRetry,
  onReset,
  skeletons = 4,
  className = GRID,
}) {
  const firstLoad = loading && items === undefined;
  const dim = loading ? "opacity-60 transition-opacity" : "transition-opacity";

  if (firstLoad) {
    return (
      <div className={className} aria-busy="true">
        {Array.from({ length: skeletons }, (_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-brand-muted" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <StatePanel
        icon={AlertTriangle}
        title="No pudimos cargar los productos"
        text={error}
        action="Intentar de nuevo"
        onClick={onRetry}
      />
    );
  }
  if (!items?.length) {
    return (
      <div className={dim} aria-busy={loading}>
        <StatePanel
          icon={SearchX}
          title="No encontramos productos"
          text="Prueba con otro término o quita algunos filtros."
          action={onReset && "Limpiar filtros"}
          onClick={onReset}
        />
      </div>
    );
  }
  return (
    <div className={`${className} ${dim}`} aria-busy={loading}>
      {items.map((p) => (
        <ProductCard key={p.id_producto} product={p} />
      ))}
    </div>
  );
}