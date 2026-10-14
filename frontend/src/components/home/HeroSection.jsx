import { useCallback, useMemo, useSyncExternalStore } from "react";
import { Link, useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useProducts } from "../../hooks/useProducts";
import { assetUrl } from "../../config/api";
import Button from "../Ui/Button";

const PARAMS = { orden: "recientes", page_size: 8 };

const getImage = (p) =>
  assetUrl(p.imagen_url ?? p.url_imagen ?? p.imagen ?? p.image_url ?? p.foto ?? null);
const getName = (p) => p.nombre ?? p.name ?? "";
const heroBtn = "h-10 rounded-lg px-5";

const frame = "h-[360px] w-full sm:h-[460px] xl:h-[540px]";

function HeroCarousel({ slides }) {
  const plugins = useMemo(
    () => [
      Autoplay({
        delay: 6000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ],
    [],
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 45 }, plugins);

  const subscribe = useCallback(
    (notify) => {
      if (!emblaApi) return () => {};
      emblaApi.on("select", notify);
      emblaApi.on("reInit", notify);
      return () => {
        emblaApi.off("select", notify);
        emblaApi.off("reInit", notify);
      };
    },
    [emblaApi],
  );
  const selected = useSyncExternalStore(
    subscribe,
    () => (emblaApi ? emblaApi.selectedScrollSnap() : 0),
    () => 0,
  );

  return (
    <>
      <div
        ref={emblaRef}
        className="w-full max-w-full select-none overflow-hidden rounded-[2rem] bg-brand-accent [&_img]:pointer-events-none"
        role="region"
        aria-roledescription="carrusel"
        aria-label="Productos destacados"
      >
        <div className="flex [touch-action:pan-y_pinch-zoom]">
          {slides.map(({ id, src, name }, i) => (
            <div
              key={id}
              className="relative min-w-0 flex-[0_0_100%]"
              role="group"
              aria-roledescription="diapositiva"
              aria-label={`${i + 1} de ${slides.length}`}
            >
              <img
                src={src}
                alt={name}
                loading={i === 0 ? "eager" : "lazy"}
                draggable={false}
                className={`${frame} max-w-full object-contain p-6 sm:p-12`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map(({ id }, i) => (
          <button
            key={id}
            type="button"
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={`Ir a la diapositiva ${i + 1}`}
            aria-current={i === selected}
            className={`h-2 rounded-full transition-all ${
              i === selected ? "w-6 bg-brand-primary" : "w-2 bg-brand-primary/30 hover:bg-brand-primary/60"
            }`}
          />
        ))}
      </div>
    </>
  );
}

export default function Hero() {
  const navigate = useNavigate();
  const { data, loading } = useProducts(PARAMS);
  const slides = useMemo(
    () =>
      (data?.items ?? [])
        .map((p) => ({ id: p.id_producto, src: getImage(p), name: getName(p) }))
        .filter((s) => s.src),
    [data],
  );

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-[1536px] grid-cols-1 items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-2 lg:gap-12 lg:px-8 xl:gap-16">
        {/* Texto */}
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-accent px-3 py-1.5 text-xs font-semibold text-brand-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Mejor cuidado, más simple
          </span>

          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-brand-foreground sm:text-5xl xl:text-6xl">
            Siéntete mejor.
            <span className="mt-1 block text-3xl text-brand-primary sm:text-4xl xl:text-5xl">
              Vive con más energía.
            </span>
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-brand-muted-foreground">
            Productos de bienestar, asesoría de confianza y atención de farmacia, todo en un solo lugar.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:mt-8">
            <Button
              className={`${heroBtn} !bg-brand-foreground !text-brand-card hover:!opacity-90`}
              onClick={() => navigate("/shop")}
            >
              Comprar medicamentos
              <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className={heroBtn} onClick={() => navigate("/categories")}>
              Explorar categorías
            </Button>
          </div>
        </div>

        {/* Carrusel con productos de la API */}
        <div className="relative min-w-0">
          {slides.length > 0 ? (
            <HeroCarousel slides={slides} />
          ) : (
            <div
              aria-hidden="true"
              className={`${frame} flex items-center justify-center rounded-[2rem] bg-brand-accent ${
                loading ? "animate-pulse" : ""
              }`}
            >
              <Sparkles className="h-16 w-16 text-brand-primary/30" />
            </div>
          )}

          {/* Oferta */}
          <Link
            to="/offers"
            className="absolute right-2 top-4 z-10 rotate-6 rounded-xl bg-brand-primary px-4 py-2.5 text-center text-brand-primary-foreground transition-transform hover:rotate-3 hover:scale-105 sm:-right-4 sm:top-10 sm:px-5 sm:py-3"
          >
            <span className="block text-[11px] font-medium leading-none opacity-90">
              Ofertas de la semana
            </span>
            <span className="mt-1 block text-lg font-extrabold leading-none sm:text-xl">
              Hasta -30%
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}