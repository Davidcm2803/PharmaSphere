import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { ProductImage } from "./ProductCard";
import { formatPrice } from "../../lib/format";

const stepperBtn =
  "flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border bg-brand-card text-brand-foreground transition-colors hover:bg-brand-muted disabled:cursor-not-allowed disabled:opacity-50";

// Una fila del carrito. Recibe el item guardado en CartContext y avisa los cambios por props
export default function CartItemRow({ item, onQuantityChange, onRemove }) {
  const {
    id_producto,
    nombre,
    precio,
    imagen_url,
    requiere_receta,
    cantidad,
    stock_total,
  } = item;
  const sinMasStock = cantidad >= stock_total;

  return (
    <div className="flex gap-4 rounded-2xl border border-brand-border bg-brand-card p-3 sm:p-4">
      <Link
        to={`/shop/${id_producto}`}
        className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl bg-brand-muted sm:w-28"
      >
        <ProductImage src={imagen_url} alt={nombre} className="p-2" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/shop/${id_producto}`}
              className="line-clamp-2 font-semibold text-brand-foreground transition-colors hover:text-brand-primary"
            >
              {nombre}
            </Link>
            <p className="text-sm text-brand-muted-foreground">
              {formatPrice(precio)} c/u
            </p>
            {requiere_receta && (
              <span className="mt-1 inline-flex rounded-full bg-brand-warning-soft px-2.5 py-0.5 text-xs font-semibold text-brand-warning">
                Requiere receta
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRemove(id_producto)}
            aria-label={`Quitar ${nombre} del carrito`}
            className="rounded-lg p-2 text-brand-muted-foreground transition-colors hover:bg-brand-danger-soft hover:text-brand-danger"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onQuantityChange(id_producto, cantidad - 1)}
              disabled={cantidad <= 1}
              aria-label="Disminuir cantidad"
              className={stepperBtn}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span
              className="w-8 text-center font-semibold text-brand-foreground"
              aria-live="polite"
            >
              {cantidad}
            </span>
            <button
              type="button"
              onClick={() => onQuantityChange(id_producto, cantidad + 1)}
              disabled={sinMasStock}
              aria-label="Aumentar cantidad"
              className={stepperBtn}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="text-lg font-bold text-brand-foreground">
            {formatPrice(precio * cantidad)}
          </p>
        </div>
      </div>
    </div>
  );
}
