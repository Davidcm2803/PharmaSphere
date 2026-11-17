import { formatPrice } from "../../lib/format";

// Lista compacta de lo que se va a comprar (solo lectura)
export default function CheckoutItems({ items }) {
  return (
    <section className="rounded-3xl border border-brand-border bg-brand-card p-6">
      <h2 className="text-lg font-bold text-brand-foreground">Tu pedido</h2>
      <ul className="mt-4 divide-y divide-brand-border">
        {items.map(({ id_producto, nombre, cantidad, precio }) => (
          <li
            key={id_producto}
            className="flex items-start justify-between gap-4 py-3 text-sm"
          >
            <span className="text-brand-foreground">
              {nombre}{" "}
              <span className="text-brand-muted-foreground">× {cantidad}</span>
            </span>
            <span className="shrink-0 font-semibold text-brand-foreground">
              {formatPrice(precio * cantidad)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
