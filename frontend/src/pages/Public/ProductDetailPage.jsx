import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, TriangleAlert } from "lucide-react";
import { useProduct } from "../../hooks/useProducts";
import { ProductImage } from "../../components/layout/ProductCard";
import { StatePanel } from "../../components/layout/ProductList";
import { formatPrice } from "../../lib/format";

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data: p, loading, error, retry } = useProduct(id);

  const back = (
    <Link to="/shop" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-brand-muted-foreground transition-colors hover:text-brand-primary">
      <ArrowLeft className="h-4 w-4" /> Volver a la tienda
    </Link>
  );

  return (
    <div className="mx-auto max-w-[1536px] px-4 py-10 sm:px-6 lg:px-8">
      {back}

      {loading && (
        <div className="grid gap-10 md:grid-cols-2" aria-busy="true">
          <div className="aspect-square animate-pulse rounded-3xl bg-brand-muted" />
          <div className="space-y-4">
            <div className="h-6 w-1/3 animate-pulse rounded bg-brand-muted" />
            <div className="h-12 w-3/4 animate-pulse rounded bg-brand-muted" />
            <div className="h-32 animate-pulse rounded bg-brand-muted" />
          </div>
        </div>
      )}

      {error && (
        <StatePanel icon={AlertTriangle} title="No pudimos mostrar este producto" text={error} action="Intentar de nuevo" onClick={retry} />
      )}

      {p && (
        <div className="grid items-start gap-10 md:grid-cols-2 lg:gap-16">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-brand-muted">
            <ProductImage src={p.imagen_url} alt={p.nombre} className="p-10" />
          </div>

          <div>
            {p.categoria && <p className="text-sm font-semibold text-brand-primary">{p.categoria}</p>}
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-foreground sm:text-4xl lg:text-5xl">{p.nombre}</h1>
            <p className="mt-4 text-3xl font-bold text-brand-foreground">{formatPrice(p.precio)}</p>

            <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${p.stock_total > 0 ? "bg-brand-success-soft text-brand-success" : "bg-brand-danger-soft text-brand-danger"}`}>
              {p.stock_total > 0 ? `Disponible · ${p.stock_total} unidades` : "Agotado"}
            </span>

            {p.descripcion && <p className="mt-6 max-w-xl leading-relaxed text-brand-muted-foreground">{p.descripcion}</p>}

            {p.requiere_receta && (
              <div role="note" className="mt-6 flex gap-3 rounded-2xl border border-brand-warning/30 bg-brand-warning-soft p-4 text-brand-warning">
                <TriangleAlert className="h-6 w-6 shrink-0" />
                <div>
                  <p className="font-semibold">Este medicamento requiere receta médica</p>
                  <p className="mt-1 text-sm">Presenta una receta válida al retirar o recibir tu pedido. La compra queda sujeta a validación farmacéutica.</p>
                </div>
              </div>
            )}

            <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-brand-border pt-6">
              <div>
                <dt className="text-xs text-brand-muted-foreground">Condición de venta</dt>
                <dd className="text-sm font-semibold text-brand-foreground">{p.requiere_receta ? "Con receta" : "Venta libre"}</dd>
              </div>
              <div>
                <dt className="text-xs text-brand-muted-foreground">Disponibilidad</dt>
                <dd className="text-sm font-semibold text-brand-foreground">{p.stock_total > 0 ? "En existencia" : "Sin existencias"}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}