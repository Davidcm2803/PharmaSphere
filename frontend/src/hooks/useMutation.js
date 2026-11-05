import { useCallback, useState } from "react";

// Envuelve una escritura (POST/PUT) de un servicio.
// run(args) devuelve el resultado, o null si falló (el mensaje queda en `error`).
export default function useMutation(fn) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (args) => {
      setSubmitting(true);
      setError(null);
      try {
        return await fn(args);
      } catch (err) {
        setError(err);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [fn],
  );

  const reset = useCallback(() => setError(null), []);

  return { run, submitting, error, reset };
}