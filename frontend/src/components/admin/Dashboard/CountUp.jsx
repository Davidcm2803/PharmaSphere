import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

const nf = new Intl.NumberFormat("es-CR");

export default function CountUp({ value, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const target = Number(value);
  const valid = value != null && Number.isFinite(target);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView || !valid) return undefined;
    const controls = animate(0, target, { duration: reduce ? 0 : 0.9, ease: "easeOut", onUpdate: setShown });
    return () => controls.stop();
  }, [inView, valid, target, reduce]);

  return (
    <span ref={ref} className={className}>
      {valid ? nf.format(Math.round(shown)) : "—"}
    </span>
  );
}