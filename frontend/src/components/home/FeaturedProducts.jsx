import { useMemo } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useProducts } from "../../hooks/useProducts";
import ProductList from "../layout/ProductList";
import ProductCard from "../layout/ProductCard";
import SectionHeading from "./SectionHeading";

// 100 es el máximo que permite el backend (MAX_PAGE_SIZE)
const PARAMS = { orden: "recientes", page_size: 100 };

const arrow =
  "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-brand-border bg-brand-card text-brand-foreground shadow-lg transition-colors hover:border-brand-primary hover:text-brand-primary sm:flex";

function ProductCarousel({ items }) {
  // El plugin se crea una sola vez
  const plugins = useMemo(
    () => [
      Autoplay({
        delay: 4000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        playOnInit: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      }),
    ],
    [],
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" }, plugins);

  return (
    <div className="relative">
      <button onClick={() => emblaApi?.scrollPrev()} aria-label="Anterior" className={`${arrow} sm:-left-5`}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={() => emblaApi?.scrollNext()} aria-label="Siguiente" className={`${arrow} sm:-right-5`}>
        <ChevronRight className="h-5 w-5" />
      </button>
      <div ref={emblaRef} className="-my-4 select-none overflow-hidden py-4 [&_img]:pointer-events-none">
        <div className="-ml-3 flex [touch-action:pan-y_pinch-zoom] sm:-ml-5">
          {items.map((product) => (
            <div
              key={product.id_producto}
              className="min-w-0 flex-[0_0_50%] pl-3 sm:flex-[0_0_33.333%] sm:pl-5 lg:flex-[0_0_25%] 2xl:flex-[0_0_20%]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FeaturedProducts() {
  const { data, loading, error, retry } = useProducts(PARAMS);
  const items = data?.items;

  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto max-w-[1536px] px-4 sm:px-6 lg:px-8">
        <SectionHeading title="Novedades" to="/shop" linkLabel="Ver toda la tienda" />

        {loading || error || !items?.length ? (
          // Cargando, error o vacío: reutiliza los estados de ProductList
          <ProductList
            items={items}
            loading={loading}
            error={error}
            onRetry={retry}
            skeletons={5}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 2xl:grid-cols-5"
          />
        ) : (
          <ProductCarousel items={items} />
        )}
      </div>
    </section>
  );
}