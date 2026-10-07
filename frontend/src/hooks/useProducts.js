import { useEffect, useState } from "react";
import {
  getCategories,
  getProductById,
  getProducts,
} from "../services/productService";

// Ejecuta `fn` cada vez que cambia `key` y expone { data, loading, error, retry }
function useAsync(fn, key) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const requestKey = `${key}:${attempt}`;

  useEffect(() => {
    let cancelled = false;
    fn()
      .then((data) => !cancelled && setResult({ key: requestKey, data, error: null }))
      .catch((err) => !cancelled && setResult({ key: requestKey, data: null, error: err.message }));
    return () => {
      cancelled = true;
    };
    // fn se recrea en cada render; key identifica cuando hay que volver a pedir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const loading = result.key !== requestKey;
  return {
    data: result.data,
    loading,
    error: loading ? null : result.error,
    retry: () => setAttempt((n) => n + 1),
  };
}

export const useProducts = (params) =>
  useAsync(() => getProducts(params), JSON.stringify(params));

export const useProduct = (id) => useAsync(() => getProductById(id), String(id));

export const useCategories = () => useAsync(getCategories, "categories");