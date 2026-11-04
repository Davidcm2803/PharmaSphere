import { Link } from "react-router-dom";
import { Package, RefreshCw, ShoppingBag } from "lucide-react";
import PageHeader from "../../components/public/PageHeader";
import { useMySales } from "../../hooks/useSales";
import { formatPrice } from "../../lib/format";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("es-CR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Fecha no disponible";

const statusLabels = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  retirada: "Retirada",
  cancelada: "Cancelada",
};

export default function MyOrdersPage() {
  const { orders, loading, error, refetch } = useMySales();

  return (
    <>
      <PageHeader title="Mis pedidos">
        Consulta el historial y detalle de tus compras.
      </PageHeader>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-brand-foreground">
            Historial de compras
          </h1>

          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-2 text-sm font-semibold text-brand-primary disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>

        {loading && (
          <p role="status" className="text-brand-muted-foreground">
            Cargando tus pedidos...
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-300 p-5 text-red-600"
          >
            <p>No pudimos cargar tus pedidos: {error}</p>
            <button
              type="button"
              onClick={refetch}
              className="mt-3 font-semibold underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <section className="rounded-3xl border border-brand-border bg-brand-card p-10 text-center">
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-brand-primary" />
            <h2 className="text-xl font-bold text-brand-foreground">
              Todavía no tienes pedidos
            </h2>
            <p className="mt-2 text-brand-muted-foreground">
              Cuando realices una compra, aparecerá aquí.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex rounded-xl bg-brand-primary px-6 py-3 font-semibold text-brand-primary-foreground"
            >
              Explorar productos
            </Link>
          </section>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="space-y-5">
            {orders.map((order) => (
              <article
                key={order.id_venta}
                className="overflow-hidden rounded-3xl border border-brand-border bg-brand-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 p-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-brand-primary" />
                      <h2 className="font-bold text-brand-foreground">
                        Pedido #{order.id_venta}
                      </h2>
                    </div>
                    <p className="mt-2 text-sm text-brand-muted-foreground">
                      {formatDate(order.fecha)}
                    </p>
                    <p className="mt-1 text-sm text-brand-muted-foreground">
                      Retiro: {order.sucursal_nombre}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold text-brand-primary">
                      {formatPrice(order.total)}
                    </p>
                    <span className="mt-2 inline-block rounded-full bg-brand-muted px-3 py-1 text-xs font-semibold text-brand-foreground">
                      {statusLabels[order.estado] ?? order.estado}
                    </span>
                  </div>
                </div>

                <details className="border-t border-brand-border">
                  <summary className="cursor-pointer px-6 py-4 font-semibold text-brand-primary">
                    Ver detalle del pedido
                  </summary>

                  <div className="border-t border-brand-border px-6 pb-6">
                    <ul className="divide-y divide-brand-border">
                      {order.items.map((item) => (
                        <li
                          key={item.id_producto}
                          className="flex justify-between gap-4 py-4 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-brand-foreground">
                              {item.nombre}
                            </p>
                            <p className="text-brand-muted-foreground">
                              {item.cantidad} ×{" "}
                              {formatPrice(item.precio_unitario)}
                            </p>
                          </div>
                          <span className="font-semibold text-brand-foreground">
                            {formatPrice(item.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex justify-between border-t border-brand-border pt-4 font-bold text-brand-foreground">
                      <span>Total</span>
                      <span>{formatPrice(order.total)}</span>
                    </div>

                    <p className="mt-4 text-sm text-brand-muted-foreground">
                      Método de pago:{" "}
                      {order.metodo_pago === "pago_en_sucursal"
                        ? "Pago en sucursal"
                        : order.metodo_pago || "No especificado"}
                    </p>
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
