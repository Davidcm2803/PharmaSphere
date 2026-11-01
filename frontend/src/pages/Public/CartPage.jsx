import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import PageHeader from "../../components/public/PageHeader";
import { StatePanel } from "../../components/layout/ProductList";
import CartItemRow from "../../components/layout/CartItemRow";
import CartSummary from "../../components/layout/CartSummary";
import { AuthModal } from "../../components/layout/AuthModal";
import Button from "../../components/Ui/Button";
import Alert from "../../components/ui/Alert";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";

export default function CartPage() {
  const { items, count, total, setQuantity, removeItem, clear } = useCart();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  // Admin y empleado usan el panel; solo los clientes compran
  const esStaff = Boolean(user) && user.rol !== "cliente";

  const handleCheckout = () => {
    if (!user) return setShowModal(true);
    navigate("/checkout");
  };

  const handleAuthSuccess = (loggedUser) => {
    if (loggedUser?.rol === "cliente") navigate("/checkout");
  };

  return (
    <>
      <PageHeader title="Carrito">
        Revisa tus productos antes de comprar.
      </PageHeader>

      <div className="mx-auto min-h-[50vh] max-w-[1536px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {items.length === 0 ? (
          <StatePanel
            icon={ShoppingCart}
            title="Tu carrito está vacío"
            text="Explora la tienda y agrega lo que necesites."
            action="Ir a la tienda"
            onClick={() => navigate("/shop")}
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
            <section aria-label="Productos del carrito">
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id_producto}>
                    <CartItemRow
                      item={item}
                      onQuantityChange={setQuantity}
                      onRemove={removeItem}
                    />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={clear}
                className="mt-4 text-sm font-semibold text-brand-danger hover:underline"
              >
                Vaciar carrito
              </button>
            </section>

            <CartSummary count={count} total={total}>
              {esStaff ? (
                <Alert type="info">
                  Estás con una cuenta del panel. Inicia sesión como cliente
                  para comprar.
                </Alert>
              ) : (
                <Button
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={loading}
                >
                  {user
                    ? "Continuar con la compra"
                    : "Inicia sesión para comprar"}
                </Button>
              )}
            </CartSummary>
          </div>
        )}
      </div>

      {showModal && (
        <AuthModal
          onClose={() => setShowModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
}
