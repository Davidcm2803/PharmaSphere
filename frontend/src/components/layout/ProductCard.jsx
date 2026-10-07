import { useState } from "react";
import { Link } from "react-router-dom";
import { Pill } from "lucide-react";
import { formatPrice } from "../../lib/format";

// Muestra imagen_url como fallback y la foto nunca lo estira. `className` se usa para el padding interno.
export function ProductImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center text-brand-primary/40 ${className}`}>
        <Pill className="h-1/3 w-1/3 -rotate-45" strokeWidth={1.25} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`absolute inset-0 h-full w-full object-contain ${className}`}
    />
  );
}

export default function ProductCard({ product }) {
  const { id_producto, nombre, categoria, precio, requiere_receta, imagen_url } = product;

  return (
    <Link
      to={`/shop/${id_producto}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-card transition hover:border-brand-primary/50 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-brand-muted">
        <ProductImage src={imagen_url} alt={nombre} className="p-6" />
        {requiere_receta && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-warning-soft px-3 py-1 text-xs font-semibold text-brand-warning">
            Requiere receta
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {categoria && (
          <span className="text-xs font-semibold text-brand-primary">{categoria}</span>
        )}
        <h3 className="line-clamp-2 font-semibold text-brand-foreground transition-colors group-hover:text-brand-primary">
          {nombre}
        </h3>
        <p className="mt-auto pt-3 text-lg font-bold text-brand-foreground">
          {formatPrice(precio)}
        </p>
      </div>
    </Link>
  );
}