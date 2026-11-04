import { formatPrice } from "../../lib/format";

// Resumen del carrito: cantidad de productos y total. Las acciones llegan como children
export default function CartSummary({ count, total, children }) {
  return (
    <aside
      aria-label="Resumen del pedido"
      className="rounded-3xl border border-brand-border bg-brand-card p-6 lg:sticky lg:top-28"
    >
      <h2 className="text-lg font-bold text-brand-foreground">Resumen</h2>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-brand-muted-foreground">Productos ({count})</dt>
          <dd className="font-semibold text-brand-foreground">
            {formatPrice(total)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-brand-border pt-4">
        <span className="font-semibold text-brand-foreground">Total</span>
        <span className="text-2xl font-extrabold text-brand-foreground">
          {formatPrice(total)}
        </span>
      </div>

      <div className="mt-6 space-y-3">{children}</div>
    </aside>
  );
}
