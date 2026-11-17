import { useEffect, useState } from "react";

// Devuelve `value` pero retrasado `delay` ms (para no pedir al backend en cada tecla)
export default function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
