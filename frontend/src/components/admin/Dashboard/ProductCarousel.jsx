import { useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useReducedMotion } from "motion/react";
import WidgetCard from "./WidgetCard";
import { assetUrl } from "../../../config/api";
import { cn } from "../../../lib/utils";

const iconBtn = "flex h-8 w-8 items-center justify-center rounded-full bg-brand-muted text-brand-foreground hover:bg-brand-accent";

export default function ProductCarousel({ query }) {
  const reduce = useReducedMotion();
  const plugins = useMemo(() => (reduce ? [] : [Autoplay({ delay: 4500, stopOnMouseEnter: true, stopOnInteraction: false })]), [reduce]);
  const [viewport, api] = useEmblaCarousel({ loop: true }, plugins);
  const [index, setIndex] = useState(0);
  const rows = query.data;

  // Suscripción a embla: setState solo dentro del callback del evento
  useEffect(() => {
    if (!api) return undefined;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => api.off("select", onSelect);
  }, [api]);

  const onKey = (e) => {
    if (e.key === "ArrowLeft") api?.scrollPrev();
    if (e.key === "ArrowRight") api?.scrollNext();
  };

  return (
    <WidgetCard title="Productos más vistos" query={query} isEmpty={!rows.length} emptyText="Aún no hay vistas registradas." className="h-full">
      <div ref={viewport} onKeyDown={onKey} tabIndex={0} aria-roledescription="carrusel" aria-label="Productos más vistos" className="overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-brand-ring">
        <div className="flex">
          {rows.map((p, i) => (
            <article key={p.id_producto} role="group" aria-roledescription="diapositiva" aria-label={`${i + 1} de ${rows.length}`} className="min-w-0 flex-[0_0_100%]">
              <div className="flex h-45 items-center justify-center overflow-hidden rounded-xl bg-brand-muted">
                {p.imagen_url ? <img src={assetUrl(p.imagen_url)} alt={p.nombre} loading="lazy" className="h-full w-full object-contain p-2" /> : <ImageOff className="h-10 w-10 text-brand-muted-foreground" aria-label="Sin imagen" />}
              </div>
              <h3 className="mt-3 truncate font-semibold text-brand-foreground">{p.nombre}</h3>
              <p className="text-sm text-brand-muted-foreground">{p.categoria}</p>
              <div className="mt-2 flex gap-2 text-xs font-medium">
                <span className="rounded-full bg-brand-muted px-2.5 py-1">{Number(p.vistas).toLocaleString("es-CR")} vistas</span>
                <span className="rounded-full bg-brand-muted px-2.5 py-1">{Number(p.stock_total).toLocaleString("es-CR")} en stock</span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button className={iconBtn} onClick={() => api?.scrollPrev()} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></button>
          <button className={iconBtn} onClick={() => api?.scrollNext()} aria-label="Siguiente"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-1.5">
          {rows.map((p, i) => (
            <button key={p.id_producto} onClick={() => api?.scrollTo(i)} aria-label={`Ir al producto ${i + 1}`} aria-current={i === index} className={cn("h-2 rounded-full transition-all", i === index ? "w-5 bg-brand-primary" : "w-2 bg-brand-border")} />
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}