import { useEffect, useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import Button from "../Ui/Button";
import { useCart } from "../../context/CartContext";

// Botón "Agregar al carrito" de la tienda y del detalle. Recibe el producto tal como lo devuelve GET /products
export default function AddToCartButton({ product, className = "" }) {
  const { items, addItem } = useCart();
  const [added, setAdded] = useState(false);

  const enCarrito =
    items.find((i) => i.id_producto === product.id_producto)?.cantidad ?? 0;
  const agotado = !(product.stock_total > 0);
  const maximo = !agotado && enCarrito >= product.stock_total;

  // El aviso "Agregado" dura un momento y vuelve al texto normal
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(timer);
  }, [added]);

  const handleClick = () => {
    addItem(product);
    setAdded(true);
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={agotado || maximo}
      className={className}
    >
      {agotado ? (
        "Agotado"
      ) : maximo ? (
        "Máximo en tu carrito"
      ) : added ? (
        <>
          <Check className="h-4 w-4" /> Agregado
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" /> Agregar al carrito
        </>
      )}
    </Button>
  );
}
