import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import PageHeader from "../../components/public/PageHeader";
import CartSummary from "../../components/layout/CartSummary";
import CheckoutForm, {
  CHECKOUT_FORM_ID,
} from "../../components/layout/CheckoutForm";
import CheckoutItems from "../../components/layout/CheckoutItems";
import Alert from "../../components/ui/Alert";
import Button from "../../components/Ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useBranchOptions } from "../../hooks/useBranches";
import { useCreateSale } from "../../hooks/useSales";

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, count, total, clear } = useCart();
  const navigate = useNavigate();
  const {
    data: branches,
    loading,
    error: branchesError,
    refetch,
  } = useBranchOptions();
  const { submit, submitting, error } = useCreateSale();
  // Al terminar la compra el carrito queda vacío: así no se redirige de vuelta a /cart
  const [done, setDone] = useState(false);

  if (items.length === 0 && !done) return <Navigate to="/cart" replace />;

  const handleSubmit = async (values) => {
    const venta = await submit({
      id_sucursal: Number(values.id_sucursal),
      items: items.map(({ id_producto, cantidad }) => ({
        id_producto,
        cantidad,
      })),
      telefono: values.telefono.trim() || null,
      cedula: values.cedula.trim() || null,
    });
    if (!venta) return;
    setDone(true);
    clear();
    navigate("/checkout/exito", { replace: true, state: { venta } });
  };

  const ready = !loading && !branchesError && branches?.length > 0;

  return (
    <>
      <PageHeader title="Finalizar compra">
        Elige dónde retirar y confirma tu pedido.
      </PageHeader>

      <div className="mx-auto min-h-[60vh] max-w-[1536px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="space-y-6">
            {error && (
              <Alert type="error">
                <p className="font-semibold">No pudimos completar tu compra</p>
                <ul className="mt-1 list-disc pl-5">
                  {error.split("; ").map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
                <Link
                  to="/cart"
                  className="mt-2 inline-block font-semibold underline"
                >
                  Revisar mi carrito
                </Link>
              </Alert>
            )}

            {loading && (
              <div
                className="h-80 animate-pulse rounded-3xl bg-brand-muted"
                aria-busy="true"
              />
            )}

            {branchesError && (
              <Alert type="error">
                <p>No pudimos cargar las sucursales: {branchesError}</p>
                <button
                  type="button"
                  onClick={refetch}
                  className="mt-2 font-semibold underline"
                >
                  Reintentar
                </button>
              </Alert>
            )}

            {!loading && !branchesError && !branches?.length && (
              <Alert type="warning">
                No hay sucursales disponibles para retirar en este momento.
              </Alert>
            )}

            {ready && (
              <CheckoutForm
                user={user}
                branches={branches}
                onSubmit={handleSubmit}
              />
            )}

            <CheckoutItems items={items} />
          </div>

          <CartSummary count={count} total={total}>
            <p className="text-sm text-brand-muted-foreground">
              Pagas al retirar en la sucursal.
            </p>
            <Button
              type="submit"
              form={CHECKOUT_FORM_ID}
              className="w-full"
              loading={submitting}
              disabled={!ready}
            >
              Confirmar compra
            </Button>
            <Link
              to="/cart"
              className="block text-center text-sm font-semibold text-brand-primary hover:underline"
            >
              Volver al carrito
            </Link>
          </CartSummary>
        </div>
      </div>
    </>
  );
}
