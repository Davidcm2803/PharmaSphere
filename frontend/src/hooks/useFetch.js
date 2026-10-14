import { useEffect, useState } from "react";
import { apiFetch } from "../config/api";

// El conexion con el backend en config api
export default function useFetch(path) {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });

  const requestKey = `${path}|${tick}`;

  useEffect(() => {
    let cancelled = false;

    apiFetch(path)
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, data, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setResult({ key: requestKey, data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [path, requestKey]);

  return {
    data: result.key === requestKey ? result.data : null,
    error: result.key === requestKey ? result.error : null,
    loading: result.key !== requestKey,
    refetch: () => setTick((t) => t + 1),
  };
}