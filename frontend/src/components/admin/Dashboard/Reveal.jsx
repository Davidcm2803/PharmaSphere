import { motion, useReducedMotion } from "motion/react";

// Entrada escalonada (~60 ms por tarjeta). Sin movimiento si el usuario lo pide.
export default function Reveal({ index = 0, className, children }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: reduce ? 0 : index * 0.06 }}
    >
      {children}
    </motion.div>
  );
}