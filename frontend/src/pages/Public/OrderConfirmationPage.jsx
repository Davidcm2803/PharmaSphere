import { Link, Navigate, useLocation } from "react-router-dom";
import PageHeader from "../../components/public/PageHeader";
import { formatPrice } from "../../lib/format";

export default function OrderConfirmationPage() {
  const location = useLocation();
  const venta = location.state?.venta;

  // Evita mostrar una confirmación sin una compra exitosa.
  if (!venta) {
    return <Navigate to="/shop" replace />;
  }

  // El backend puede devolver la venta directamente
  // o dentro de una propiedad data.
  const pedido = venta.data ?? venta;

  const numeroPedido = pedido.id_venta ?? pedido.id ?? pedido.numero_venta;

  const total = pedido.total ?? pedido.total_venta;
  const sucursal =
    pedido.sucursal_nombre ??
    pedido.sucursal?.nombre ??
    pedido.nombre_sucursal ??
    null;

  return (
    <>
      <PageHeader title="Compra confirmada">
        Tu pedido se ha registrado correctamente.
      </PageHeader>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <section className="rounded-3xl border border-brand-border bg-brand-card p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-brand-foreground sm:text-3xl">
            ¡Gracias por tu compra!
          </h1>

          <p className="mt-4 text-brand-muted-foreground">
            Tu pedido fue registrado exitosamente en PharmaSphere.
          </p>

          <p className="mt-2 text-sm text-brand-muted-foreground">
            Recuerda que el pago se realiza al retirar los productos en la
            sucursal seleccionada.
          </p>

          <div className="mt-8 rounded-2xl border border-brand-border bg-brand-muted p-6 text-left">
            <h2 className="mb-4 text-lg font-bold text-brand-foreground">
              Resumen de tu pedido
            </h2>

            <dl className="space-y-4 text-sm">
              {numeroPedido != null && (
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-muted-foreground">
                    Número de pedido
                  </dt>
                  <dd className="font-semibold text-brand-foreground">
                    #{numeroPedido}
                  </dd>
                </div>
              )}

              {sucursal && (
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-muted-foreground">
                    Sucursal de retiro
                  </dt>
                  <dd className="text-right font-semibold text-brand-foreground">
                    {sucursal}
                  </dd>
                </div>
              )}

              {total != null && (
                <div className="flex justify-between gap-4 border-t border-brand-border pt-4">
                  <dt className="font-semibold text-brand-foreground">
                    Total de la compra
                  </dt>
                  <dd className="font-bold text-brand-primary">
                    {formatPrice(Number(total))}
                  </dd>
                </div>
              )}

              <div className="flex justify-between gap-4 border-t border-brand-border pt-4">
                <dt className="text-brand-muted-foreground">Método de pago</dt>
                <dd className="font-semibold text-brand-foreground">
                  Pago en sucursal
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/shop"
              className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Seguir comprando
            </Link>

            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl border border-brand-border px-6 py-3 font-semibold text-brand-foreground transition hover:bg-brand-muted"
            >
              Volver al inicio
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
