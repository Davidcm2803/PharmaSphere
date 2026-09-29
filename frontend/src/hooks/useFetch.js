import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8010";

export default function useFetch(path) {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });

  const requestKey = `${path}|${tick}`;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_URL}${path}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((data) => setResult({ key: requestKey, data, error: null }))
      .catch((err) => {
        if (err.name === "AbortError") return;
        setResult({ key: requestKey, data: null, error: err.message });
      });

    return () => controller.abort();
  }, [path, requestKey]);

  return {
    data: result.key === requestKey ? result.data : null,
    error: result.key === requestKey ? result.error : null,
    loading: result.key !== requestKey,
    refetch: () => setTick((t) => t + 1),
  };
}