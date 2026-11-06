import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { formatPrice } from "../../../lib/format";

// Cuenta de 0 al valor sin usar setState (MotionValue)
export default function AnimatedNumber({ value, format = formatPrice }) {
  const reduce = useReducedMotion();
  const target = Number(value) || 0;
  const mv = useMotionValue(reduce ? target : 0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    if (reduce) {
      mv.set(target);
      return undefined;
    }
    const controls = animate(mv, target, { duration: 0.9, ease: "easeOut" });
    return () => controls.stop();
  }, [target, reduce, mv]);
  return <motion.span>{text}</motion.span>;
}