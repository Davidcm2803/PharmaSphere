import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { GrainGradient } from "@paper-design/shaders-react";
import { ArrowUpRight, Pill } from "lucide-react";
import { useTopProducts } from "../../hooks/useTopProducts";
import { assetUrl } from "../../config/api";
import { cn } from "../../lib/utils";

const SLIDE_COUNT = 4;
const AUTOPLAY_SECONDS = 7;
const WIPE_SECONDS = 1.1;
const EASE = [0.22, 1, 0.36, 1];

// Equipos modestos (≤4 núcleos o ≤4 GB): sin derrame circular, menos píxeles en el shader.
const LITE =
  typeof navigator !== "undefined" &&
  ((navigator.hardwareConcurrency ?? 8) <= 4 || (navigator.deviceMemory ?? 8) <= 4);
// Tope de píxeles que dibuja el shader. El gradiente es suave, así que bajar esto casi no se nota.
const SHADER_MAX_PIXELS = LITE ? 350_000 : 800_000;

// Una paleta por producto. `back` es el fondo profundo; `colors` las masas de color del shader.
const STYLES = [
  { slogan: "Alivio que se siente.", back: "#04342c", colors: ["#10d9a0", "#22d3ee", "#7ddc3a", "#0b7a5a"] },
  { slogan: "Tu energía, de vuelta.", back: "#14134d", colors: ["#4f6bff", "#22d3ee", "#c4a3ff", "#2a2ad6"] },
  { slogan: "Cuídate sin pausa.", back: "#4a1a05", colors: ["#ff7a1a", "#ffc233", "#ff3d3d", "#b8350a"] },
  { slogan: "Salud al instante.", back: "#500724", colors: ["#ff3d7f", "#ff9ad0", "#ff9a3d", "#b3124f"] },
];

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};
const group = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
  exit: { transition: { staggerChildren: 0.02 } },
};
const word = {
  hidden: { y: "110%" },
  show: { y: 0, transition: { duration: 0.6, ease: EASE } },
  exit: { y: "-110%", transition: { duration: 0.3 } },
};
const bigGroup = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
  exit: { transition: { staggerChildren: 0.015 } },
};
const letter = {
  hidden: { y: "105%" },
  show: { y: 0, transition: { duration: 0.7, ease: EASE } },
  exit: { y: "-105%", transition: { duration: 0.3, ease: "easeIn" } },
};

// El producto entra desde el lado hacia el que "avanzas" y sale por el contrario.
const productV = {
  enter: (d) => ({ x: d * 260, rotate: d * 14, scale: 0.82, opacity: 0 }),
  center: {
    x: 0,
    rotate: 0,
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 16,
      opacity: { duration: 0.3 },
    },
  },
  exit: (d) => ({
    x: d * -260,
    rotate: d * -14,
    scale: 0.82,
    opacity: 0,
    transition: { duration: 0.4, ease: "easeIn" },
  }),
};

/*  Piezas  */

function ProductImage({ slide, small = false }) {
  const sources = [slide.cutout, slide.src].filter(Boolean);
  const [stage, setStage] = useState(0);
  const src = sources[stage];
  const box = cn("absolute inset-0 flex items-center justify-center", small && "p-1.5");

  if (!src) {
    return (
      <span className={cn(box, "text-white")}>
        <Pill className="h-1/2 w-1/2 -rotate-45" />
      </span>
    );
  }
  const isCutout = src === slide.cutout;
  return (
    <span className={box}>
      <img
        src={src}
        alt={slide.name}
        draggable={false}
        decoding="async"
        onError={() => setStage((s) => s + 1)}
        className={
          isCutout
            ? cn("h-full w-full object-contain", !small && "drop-shadow-[0_40px_40px_rgba(0,0,0,0.38)]")
            : small
              ? "h-auto max-h-full w-full rounded-lg bg-white object-contain"
              : "h-auto max-h-[86%] w-full rounded-3xl bg-white object-contain shadow-2xl ring-1 ring-white/40"
        }
      />
    </span>
  );
}

function CountUp({ value }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString("es-CR"));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.4, ease: EASE, delay: 0.3 });
    return () => controls.stop();
  }, [value, mv]);
  return <motion.span>{text}</motion.span>;
}

/* Hero */

function HeroStage({ slides }) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  // Capas de color: la nueva se revela en círculo desde la pestaña pulsada.
  const [layers, setLayers] = useState([{ key: 0, idx: 0, at: "50% 100%" }]);

  const panelRef = useRef(null);
  const tabs = useRef([]);
  const layerKey = useRef(0);

  const newestKey = layers[layers.length - 1].key;
  const n = slides.length;
  const slide = slides[active];
  const next = slides[(active + 1) % n];
  const palette = STYLES[active % STYLES.length];

  // Parallax con el mouse (-0.5 … 0.5) + tilt 3D del producto
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 16, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 60, damping: 16, mass: 0.6 });
  const wordX = useTransform(sx, (v) => v * 60);
  const prodX = useTransform(sx, (v) => v * -40);
  const prodY = useTransform(sy, (v) => v * -26);
  const tiltY = useTransform(sx, (v) => v * 22);
  const tiltX = useTransform(sy, (v) => v * -16);

  const onMove = (e) => {
    if (reduce || e.pointerType !== "mouse" || !panelRef.current) return;
    const r = panelRef.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const go = (i, d) => {
    if (i === active) return;
    setDir(d ?? (i > active ? 1 : -1));
    setActive(i);

    const panel = panelRef.current;
    const tab = tabs.current[i];
    if (!panel || !tab) return;
    const p = panel.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    layerKey.current += 1;
    const layer = {
      key: layerKey.current,
      idx: i,
      at: `${Math.round(t.left + t.width / 2 - p.left)}px ${Math.round(t.top + t.height / 2 - p.top)}px`,
    };
    setLayers((ls) => (reduce ? [layer] : [...ls, layer]));
  };

  const onKey = (e) => {
    if (e.key === "ArrowRight") go((active + 1) % n, 1);
    if (e.key === "ArrowLeft") go((active - 1 + n) % n, -1);
  };

  const bigWord = slide.name.split(/\s+/)[0].toUpperCase();
  const bigVw = Math.min(21, 92 / (bigWord.length * 0.7)); // cel: ancho completo
  const bigMax = Math.floor(1400 / (bigWord.length * 0.7));
  const bigVwLg = Math.min(14, 50 / (bigWord.length * 0.7)); // desktop: solo la mitad izquierda
  const bigMaxLg = Math.floor(900 / (bigWord.length * 0.7));
  const arcSize = Math.min(13, 70 / (bigWord.length * 0.7));

  return (
    <section
      className="relative w-full px-3 pb-3 sm:px-5 sm:pb-5"
      aria-roledescription="carrusel"
      aria-label="Productos más vendidos"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onKeyDown={onKey}
    >
      <div
        ref={panelRef}
        className="relative isolate flex min-h-[780px] flex-col overflow-hidden rounded-[2rem] text-white lg:h-[calc(100svh-88px-1.25rem)] lg:max-h-[940px] lg:min-h-[680px]"
      >
        {/*  Fondo: shader de degradado con grano; el nuevo se revela en círculo */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black">
          {layers.map((l) => {
            const p = STYLES[l.idx % STYLES.length];
            return (
              <motion.div
                key={l.key}
                className="absolute inset-0"
                initial={
                  reduce ? false : LITE ? { opacity: 0 } : { clipPath: `circle(0vmax at ${l.at})` }
                }
                animate={LITE ? { opacity: 1 } : { clipPath: `circle(140vmax at ${l.at})` }}
                transition={{ duration: LITE ? 0.6 : WIPE_SECONDS, ease: [0.7, 0, 0.2, 1] }}
                onAnimationComplete={() =>
                  setLayers((ls) => {
                    const k = ls.findIndex((x) => x.key === l.key);
                    return k > 0 ? ls.slice(k) : ls; // quita las capas viejas ya tapadas
                  })
                }
              >
                <GrainGradient
                  className="absolute inset-0"
                  width="100%"
                  height="100%"
                  colorBack={p.back}
                  colors={p.colors}
                  shape="blob"
                  softness={0.85}
                  intensity={0.5}
                  noise={0.45}
                  scale={1.15}
                  // ¡Clave! Por defecto la librería usa minPixelRatio=2 (4× los píxeles aunque la pantalla sea 1x)
                  minPixelRatio={1}
                  maxPixelCount={SHADER_MAX_PIXELS}
                  // Solo la capa más nueva se anima; las viejas quedan congeladas (speed 0 = sin rAF)
                  speed={reduce || l.key !== newestKey ? 0 : LITE ? 0.3 : 0.45}
                />
              </motion.div>
            );
          })}
          {/* Viñeta inferior para que el texto siempre se lea */}
          <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        {/*  Fila superior: vendidos · siguiente producto  */}
        <div className="relative z-30 flex items-start justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-7 lg:px-12 lg:pt-9">
          <div className="min-h-[3.5rem]">
            {slide.sold > 0 && (
              <>
                <p className="text-4xl font-black leading-none tabular-nums tracking-tight lg:text-5xl">
                  <CountUp value={slide.sold} />
                </p>
                <p className="mt-1 text-sm text-white/75">{slide.sold === 1 ? "vendido" : "vendidos"}</p>
              </>
            )}
          </div>

          {n > 1 && (
            <button
              type="button"
              onClick={() => go((active + 1) % n, 1)}
              aria-label={`Siguiente: ${next.name}`}
              className="group hidden items-center gap-3 rounded-2xl bg-black/25 p-2 pr-4 text-left ring-1 ring-white/25 transition-colors hover:bg-black/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:flex"
            >
              <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/20">
                <ProductImage slide={next} small />
              </span>
              <span className="min-w-0">
                <span className="block max-w-[11rem] truncate text-sm font-semibold">{next.name}</span>
                <span className="block text-xs tabular-nums text-white/70">
                  {String((active + 1) % n + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          )}
        </div>

        {/*  Escenario: palabra gigante · aro · producto  */}
        <div className="relative z-10 min-h-[280px] flex-1 [contain:layout]">
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden place-items-center lg:grid lg:place-items-center lg:justify-items-start lg:pl-12"
            style={{ x: wordX }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                variants={bigGroup}
                initial="hidden"
                animate="show"
                exit="exit"
                className="flex w-full justify-center overflow-hidden py-[0.06em] font-black uppercase leading-[0.85] tracking-tighter text-white [font-size:var(--fs)] lg:w-auto lg:justify-start lg:[font-size:var(--fs-lg)]"
                style={{
                  "--fs": `min(${bigVw}vw, ${bigMax}px)`,
                  "--fs-lg": `min(${bigVwLg}vw, ${bigMaxLg}px)`,
                }}
              >
                {bigWord.split("").map((ch, i) => (
                  <motion.span key={i} variants={letter} className="inline-block">
                    {ch}
                  </motion.span>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Aro fino que se dibuja alrededor del producto */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center lg:left-[40%]">
            <AnimatePresence>
              <motion.svg
                key={slide.id}
                viewBox="0 0 100 100"
                className="aspect-square h-[88%] max-w-none shrink-0 -rotate-90 overflow-visible lg:h-[112%]"
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                <motion.circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth="0.3"
                  initial={{ pathLength: reduce ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: EASE, delay: 0.3 }}
                />
              </motion.svg>
            </AnimatePresence>
          </div>

          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center lg:hidden">
            <svg viewBox="0 0 100 100" className="aspect-square h-[88%] max-w-none shrink-0 overflow-visible">
              <path id="hero-arc" d="M 0 50 A 50 50 0 0 1 100 50" fill="none" />
              <AnimatePresence mode="wait">
                <motion.text
                  key={slide.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  fill="white"
                  fontWeight="900"
                  fontSize={arcSize}
                  textAnchor="middle"
                >
                  <textPath href="#hero-arc" startOffset="50%">
                    {bigWord}
                  </textPath>
                </motion.text>
              </AnimatePresence>
            </svg>
          </div>

          {/* Producto con parallax + tilt 3D */}
          <motion.div
            className="pointer-events-none absolute inset-0 lg:left-[40%]"
            style={{ x: prodX, y: prodY, rotateX: tiltX, rotateY: tiltY, transformPerspective: 1200 }}
          >
            <AnimatePresence custom={dir} initial={false}>
              <motion.div
                key={slide.id}
                custom={dir}
                variants={productV}
                initial={reduce ? false : "enter"}
                animate="center"
                exit="exit"
                className="absolute inset-0 flex items-center justify-center"
              >
                <motion.div
                  className="relative aspect-square h-[84%] max-w-full shrink-0 will-change-transform lg:h-[104%]"
                  animate={reduce ? undefined : { y: [0, -14, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Link
                    to={`/shop/${slide.id}`}
                    aria-label={`Ver ${slide.name}`}
                    className="pointer-events-auto relative block h-full w-full rounded-[2rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    <ProductImage slide={slide} />
                  </Link>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/*  Texto + acciones  */}
        <div className="relative z-30 grid grid-cols-1 items-end gap-6 px-5 pb-5 sm:px-8 md:grid-cols-[1fr_auto] lg:px-12 lg:pb-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              variants={group}
              initial="hidden"
              animate="show"
              exit="exit"
              className="min-w-0"
            >
              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                {palette.slogan.split(" ").map((w, i) => (
                  <span key={i} className="mr-[0.25em] inline-block overflow-hidden pb-[0.12em] align-top">
                    <motion.span variants={word} className="inline-block">
                      {w}
                    </motion.span>
                  </span>
                ))}
              </h1>
              <motion.p variants={fade} className="mt-3 text-lg font-semibold">
                {slide.name}
              </motion.p>
              {slide.description && (
                <motion.p variants={fade} className="mt-1 line-clamp-2 max-w-lg text-white/80">
                  {slide.description}
                </motion.p>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to={`/shop/${slide.id}`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-brand-foreground transition-transform hover:scale-105"
            >
              Comprar ahora
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/shop"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/40 bg-black/20 px-7 text-sm font-semibold transition-colors hover:bg-black/30"
            >
              Ver catálogo
            </Link>
          </div>
        </div>

        {/*  Barra de pestañas (pill blanco que se desliza + progreso del autoplay)  */}
        <div
          role="tablist"
          aria-label="Productos más vendidos"
          className="relative z-30 mx-3 mb-3 grid rounded-2xl bg-black/50 p-1 ring-1 ring-white/15 sm:mx-5 sm:mb-5"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {slides.map((s, i) => {
            const on = i === active;
            return (
              <button
                key={s.id}
                ref={(el) => (tabs.current[i] = el)}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => (on ? navigate(`/shop/${s.id}`) : go(i))}
                className={cn(
                  "relative h-11 min-w-0 rounded-xl px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-white sm:px-4 sm:text-sm",
                  on ? "text-brand-foreground" : "text-white/90 hover:text-white",
                )}
              >
                {on && (
                  <motion.span
                    layoutId="hero-pill"
                    className="absolute inset-0 rounded-xl bg-white shadow-lg"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative block truncate">{s.name}</span>
                {on && !reduce && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-1 h-0.5 origin-left rounded-full bg-brand-primary"
                    style={{
                      animation: `hero-progress ${AUTOPLAY_SECONDS}s linear forwards`,
                      animationPlayState: paused ? "paused" : "running",
                    }}
                    onAnimationEnd={() => go((active + 1) % n, 1)}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Hero() {
  const { data, loading } = useTopProducts(8);

  const slides = useMemo(
    () =>
      (data ?? [])
        .map((p) => ({
          id: p.id_producto,
          name: p.nombre,
          description: p.descripcion,
          sold: p.vendidos ?? 0,
          src: assetUrl(p.imagen_url),
          cutout: assetUrl(p.imagen_cutout_url),
        }))
        .filter((s) => s.src || s.cutout)
        .slice(0, SLIDE_COUNT),
    [data],
  );

  if (slides.length === 0) {
    return (
      <section className="w-full px-4 py-10 sm:px-6">
        <div
          aria-hidden="true"
          className={cn(
            "mx-auto h-[420px] max-w-[1400px] rounded-[2rem] bg-brand-accent",
            loading && "animate-pulse",
          )}
        />
      </section>
    );
  }

  return <HeroStage slides={slides} />;
}