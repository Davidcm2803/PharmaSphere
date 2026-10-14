import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCategories, useProducts } from "../../hooks/useProducts";
import ProductList from "../../components/layout/ProductList";
import PageHeader from "../../components/public/PageHeader";
import { cn } from "../../lib/utils";

const PAGE_SIZE = 12;
const SORTS = [
  ["recientes", "Más recientes"],
  ["nombre", "Nombre A–Z"],
  ["precio_asc", "Precio: menor a mayor"],
  ["precio_desc", "Precio: mayor a menor"],
];

const field =
  "h-10 w-full rounded-lg border border-brand-border bg-brand-card px-3 text-sm text-brand-foreground placeholder:text-brand-muted-foreground focus:border-brand-primary focus:outline-none";

const chip = (active) =>
  cn(
    "rounded-lg px-3 py-2 text-left text-sm transition-colors",
    active
      ? "bg-brand-accent font-semibold text-brand-accent-foreground"
      : "text-brand-muted-foreground hover:bg-brand-muted hover:text-brand-foreground",
  );

// Todos los filtros viven en la URL (?q=&categoria=&orden=&page=...),
export default function ShopPage() {
  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") ?? "";
  const categoria = sp.get("categoria") ?? "";
  const precioMin = sp.get("precio_min") ?? "";
  const precioMax = sp.get("precio_max") ?? "";
  const orden = sp.get("orden") ?? "recientes";
  const page = Number(sp.get("page")) || 1;

  const { data, loading, error, retry } = useProducts({
    q,
    categoria,
    precio_min: precioMin,
    precio_max: precioMax,
    orden,
    page,
    page_size: PAGE_SIZE,
  });
  const { data: categories } = useCategories();

  const update = (changes) => {
    const next = new URLSearchParams(sp);
    Object.entries({ page: "", ...changes }).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    setSp(next);
  };

  const applyPrice = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    update({ precio_min: form.get("min"), precio_max: form.get("max") });
  };

  const total = data?.total ?? 0;
  const pages = data?.pages ?? 0;

  return (
    <>
      <PageHeader title="Tienda">
        {q ? `Resultados para “${q}”` : "Explora el catálogo y encuentra lo que necesitas para tu cuidado diario."}
      </PageHeader>

      <div className="mx-auto grid max-w-[1536px] gap-8 px-4 py-8 sm:px-6 lg:py-10 lg:grid-cols-[240px_1fr] lg:px-8 2xl:grid-cols-[280px_1fr] 2xl:gap-12">
        {/* Filtros */}
        <aside aria-label="Filtros" className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-bold text-brand-foreground">Categoría</h2>
            <div className="flex flex-wrap gap-1 lg:flex-col">
              <button className={chip(!categoria)} onClick={() => update({ categoria: "" })}>
                Todas
              </button>
              {categories?.map((name) => (
                <button key={name} className={chip(categoria === name)} onClick={() => update({ categoria: name })}>
                  {name}
                </button>
              ))}
            </div>
          </div>

          <form key={`${precioMin}-${precioMax}`} onSubmit={applyPrice}>
            <h2 className="mb-2 text-sm font-bold text-brand-foreground">Precio</h2>
            <div className="grid grid-cols-2 gap-2">
              <input name="min" type="number" min="0" defaultValue={precioMin} placeholder="Mín." aria-label="Precio mínimo" className={field} />
              <input name="max" type="number" min="0" defaultValue={precioMax} placeholder="Máx." aria-label="Precio máximo" className={field} />
            </div>
            <button type="submit" className="mt-2 h-10 w-full rounded-lg border border-brand-border bg-brand-card text-sm font-semibold text-brand-foreground transition-colors hover:border-brand-primary hover:text-brand-primary">
              Aplicar
            </button>
          </form>

          <button onClick={() => setSp({})} className="text-sm font-semibold text-brand-primary hover:text-brand-primary-dark">
            Limpiar filtros
          </button>
        </aside>

        {/* Resultados */}
        <section>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-brand-muted-foreground">
              {loading ? "Buscando productos..." : `${total} producto${total === 1 ? "" : "s"}`}
            </p>
            <select
              value={orden}
              onChange={(e) => update({ orden: e.target.value })}
              aria-label="Ordenar productos"
              className={cn(field, "sm:w-56")}
            >
              {SORTS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <ProductList
            items={data?.items}
            loading={loading}
            error={error}
            onRetry={retry}
            onReset={() => setSp({})}
            skeletons={3}
            className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4"
          />

          {!error && pages > 1 && (
            <nav aria-label="Paginación" className="mt-10 flex items-center justify-center gap-4">
              <button
                disabled={loading || page <= 1}
                onClick={() => update({ page: String(page - 1) })}
                aria-label="Página anterior"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border bg-brand-card text-brand-foreground transition-colors hover:border-brand-primary disabled:opacity-40 disabled:hover:border-brand-border"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-brand-muted-foreground">Página {page} de {pages}</span>
              <button
                disabled={loading || page >= pages}
                onClick={() => update({ page: String(page + 1) })}
                aria-label="Página siguiente"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border bg-brand-card text-brand-foreground transition-colors hover:border-brand-primary disabled:opacity-40 disabled:hover:border-brand-border"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          )}
        </section>
      </div>
    </>
  );
}