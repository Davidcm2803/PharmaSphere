import { lazy, Suspense, useRef } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { Wallet } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";
import useBrandColors from "../../../hooks/useBrandColors";

// Único shader del dashboard: carga diferida, pausado fuera de pantalla.
const MeshGradient = lazy(() => import("@paper-design/shaders-react").then((m) => ({ default: m.MeshGradient })));

export default function HeroKpiCard({ label, value, loading }) {
  const ref = useRef(null);
  const visible = useInView(ref);
  const reduce = useReducedMotion();
  const colors = useBrandColors();
  return (
    <div ref={ref} className="relative min-h-[104px] overflow-hidden rounded-2xl bg-linear-to-br from-brand-primary-light via-brand-primary to-brand-accent-deep p-5 text-brand-primary-foreground shadow-sm">
      {!reduce && colors.length > 0 && (
        <Suspense fallback={null}>
          <MeshGradient className="absolute inset-0 h-full w-full" colors={colors} speed={visible ? 0.35 : 0} distortion={0.8} swirl={0.1} aria-hidden="true" />
        </Suspense>
      )}
      <div className="relative flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Wallet className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm opacity-90">{label}</p>
          <p className="text-2xl font-bold tracking-tight">
            {loading || value == null ? <span className="inline-block h-7 w-28 animate-pulse rounded bg-white/25" /> : <AnimatedNumber value={value} />}
          </p>
        </div>
      </div>
    </div>
  );
}