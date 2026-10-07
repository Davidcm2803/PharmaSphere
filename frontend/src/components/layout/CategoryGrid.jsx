import { Link } from "react-router-dom";
import { Baby, Droplets, HeartPulse, Leaf, Pill, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { useCategories } from "../../hooks/useProducts";

// Las categorias vienen del backend
const ICONS = [Sparkles, HeartPulse, Leaf, Stethoscope, Baby, ShieldCheck, Droplets, Pill];

export default function CategoryGrid({ limit }) {
  const { data, loading, error } = useCategories();
  const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4";

  if (loading) {
    return (
      <div className={grid} aria-busy="true">
        {Array.from({ length: limit ?? 8 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-brand-muted" />
        ))}
      </div>
    );
  }
  if (error) return <p className="text-sm text-brand-muted-foreground">No pudimos cargar las categorías.</p>;
  if (!data?.length) return <p className="text-sm text-brand-muted-foreground">Todavía no hay categorías disponibles.</p>;

  return (
    <div className={grid}>
      {data.slice(0, limit).map((name, i) => {
        const Icon = ICONS[i % ICONS.length];
        return (
          <Link
            key={name}
            to={`/shop?categoria=${encodeURIComponent(name)}`}
            className="group flex items-center gap-4 rounded-2xl border border-brand-border bg-brand-card p-5 transition hover:border-brand-primary/50 hover:shadow-lg"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-accent text-brand-accent-foreground transition-colors group-hover:bg-brand-primary group-hover:text-brand-primary-foreground">
              <Icon className="h-6 w-6" />
            </span>
            <span className="font-semibold text-brand-foreground">{name}</span>
          </Link>
        );
      })}
    </div>
  );
}