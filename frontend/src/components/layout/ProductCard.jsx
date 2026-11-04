import { useState } from "react";
import { Link } from "react-router-dom";
import { Pill } from "lucide-react";
import { assetUrl } from "../../config/api";
import { formatPrice } from "../../lib/format";
import AddToCartButton from "./AddToCartButton";

// Muestra imagen_url como fallback y la foto nunca lo estira. `className` se usa para el padding interno.
export function ProductImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);
  const url = assetUrl(src);

  if (!url || failed) {
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center text-brand-primary/40 ${className}`}
      >
        <Pill className="h-1/3 w-1/3 -rotate-45" strokeWidth={1.25} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`absolute inset-0 h-full w-full object-contain ${className}`}
    />
  );
}

export default function ProductCard({ product }) {
  const {
    id_producto,
    nombre,
    descripcion,
    categoria,
    precio,
    requiere_receta,
    imagen_url,
  } = product;

  return (
    <div className="group/card flex h-full flex-col transition-all duration-300 ease-out group-hover/list:not-hover:scale-[0.95] group-hover/list:not-hover:opacity-75">
      <Link to={`/shop/${id_producto}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden rounded-[1.75rem] bg-brand-muted ring-1 ring-brand-border transition-shadow duration-300 group-hover/card:shadow-xl">
          <ProductImage
            src={imagen_url}
            alt={nombre}
            className="p-7 transition-transform duration-500 ease-out group-hover/card:scale-110"
          />
          {requiere_receta && (
            <span className="absolute left-3 top-3 rounded-full bg-brand-warning-soft px-3 py-1 text-xs font-semibold text-brand-warning">
              Requiere receta
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 px-1 pt-4">
          {categoria && (
            <span className="text-xs font-semibold text-brand-primary">
              {categoria}
            </span>
          )}
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 font-semibold text-brand-foreground transition-colors group-hover/card:text-brand-primary">
              {nombre}
            </h3>
            <p className="shrink-0 font-bold tabular-nums text-brand-foreground">
              {formatPrice(precio)}
            </p>
          </div>
          {descripcion && (
            <p className="line-clamp-1 text-sm text-brand-muted-foreground">
              {descripcion}
            </p>
          )}
        </div>
      </Link>

      <div className="px-1 pb-1 pt-4">
        <AddToCartButton
          product={product}
          className="w-full !rounded-full !border !border-brand-border !bg-transparent !text-brand-foreground transition-colors hover:!border-brand-primary hover:!bg-brand-primary hover:!text-brand-primary-foreground"
        />
      </div>
    </div>
  );
}