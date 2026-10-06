import { useCallback, useEffect, useState } from "react";
import { getProductById, getProducts } from "../services/productService";

export function useProducts(params) {
  const [state, setState] = useState({ items: [], total: 0, error: null, requestId: null });
  const [requestKey, setRequestKey] = useState(0);
  const serializedParams = JSON.stringify(params);
  const requestId = `${serializedParams}:${requestKey}`;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      getProducts(JSON.parse(serializedParams), controller.signal)
        .then((result) => setState({ ...result, error: null, requestId }))
        .catch((error) => {
          if (error.name !== "AbortError") setState((current) => ({ ...current, error: error.message, requestId }));
        });
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [serializedParams, requestKey, requestId]);

  const retry = useCallback(() => setRequestKey((key) => key + 1), []);
  return { ...state, loading: state.requestId !== requestId, retry };
}

export function useProduct(productId) {
  const [state, setState] = useState({ item: null, error: null, requestId: null });
  const [requestKey, setRequestKey] = useState(0);
  const requestId = `${productId}:${requestKey}`;

  useEffect(() => {
    const controller = new AbortController();
    getProductById(productId, controller.signal)
      .then((result) => setState({ ...result, error: null, requestId }))
      .catch((error) => {
        if (error.name !== "AbortError") setState({ item: null, error: error.message, requestId });
      });
    return () => controller.abort();
  }, [productId, requestKey, requestId]);

  return { ...state, loading: state.requestId !== requestId, retry: () => setRequestKey((key) => key + 1) };
}
