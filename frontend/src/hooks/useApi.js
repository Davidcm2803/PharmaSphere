import { useEffect, useState } from "react";
import { apiFetch } from "../config/api";

// GET autenticado (manda el token JWT). Devuelve { data, error, loading, refetch }
// Si `path` es null/"" no hace la petición (útil cuando aún falta un parámetro).
export default function useApi(path) {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: "" });

  const requestKey = `${path}|${tick}`;

  useEffect(() => {
    if (!path) return;
    let cancelled = false;

    apiFetch(path)
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, data, error: "" });
      })
      .catch((err) => {
        if (!cancelled)
          setResult({ key: requestKey, data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [path, requestKey]);

  const current = Boolean(path) && result.key === requestKey;

  return {
    data: current ? result.data : null,
    error: current ? result.error : "",
    loading: Boolean(path) && !current,
    refetch: () => setTick((t) => t + 1),
  };
}
