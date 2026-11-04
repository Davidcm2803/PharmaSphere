import { useEffect, useState } from "react";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { cn } from "../../lib/utils";

const stepperBtn =
  "flex h-full w-10 items-center justify-center text-brand-foreground transition-colors hover:bg-brand-muted disabled:cursor-not-allowed disabled:opacity-40";

export default function AddToCartButton({ product, className = "", showQuantity = false }) {
  const { items, addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const enCarrito =
    items.find((i) => i.id_producto === product.id_producto)?.cantidad ?? 0;
  const agotado = !(product.stock_total > 0);
  const disponible = Math.max(0, (product.stock_total ?? 0) - enCarrito);
  const maximo = !agotado && disponible === 0;
  const cantidad = Math.min(Math.max(Number(quantity) || 1, 1), Math.max(disponible, 1));

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(timer);
  }, [added]);

  const handleClick = () => {
    addItem(product, cantidad);
    setAdded(true);
    setQuantity(1);
  };

  const handleType = (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    setQuantity(digits === "" ? "" : Number(digits));
  };

  const blocked = agotado || maximo;

  const button = (
    <button
      type="button"
      onClick={handleClick}
      disabled={blocked}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
        showQuantity ? "flex-1" : "w-full",
        blocked
          ? "cursor-not-allowed border-brand-border bg-brand-muted text-brand-muted-foreground"
          : added
            ? "border-brand-success bg-brand-success text-white"
            : "border-brand-foreground/20 bg-transparent text-brand-foreground hover:border-brand-primary hover:bg-brand-primary hover:text-brand-primary-foreground",
      )}
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
          <ShoppingCart className="h-4 w-4" />{" "}
          {showQuantity && cantidad > 1 ? `Agregar ${cantidad} al carrito` : "Agregar al carrito"}
        </>
      )}
    </button>
  );

  if (!showQuantity) {
    return <div className={className}>{button}</div>;
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex h-11 shrink-0 items-center overflow-hidden rounded-full border border-brand-border bg-brand-card",
          blocked && "opacity-50",
        )}
      >
        <button
          type="button"
          onClick={() => setQuantity(Math.max(1, cantidad - 1))}
          disabled={blocked || cantidad <= 1}
          aria-label="Disminuir cantidad"
          className={stepperBtn}
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={quantity === "" ? "" : cantidad}
          onChange={handleType}
          onBlur={() => setQuantity(cantidad)}
          onFocus={(e) => e.target.select()}
          disabled={blocked}
          aria-label="Cantidad"
          className="h-full w-12 bg-transparent text-center text-base font-semibold tabular-nums text-brand-foreground focus:outline-none sm:text-sm"
        />
        <button
          type="button"
          onClick={() => setQuantity(Math.min(disponible, cantidad + 1))}
          disabled={blocked || cantidad >= disponible}
          aria-label="Aumentar cantidad"
          className={stepperBtn}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {button}
    </div>
  );
}