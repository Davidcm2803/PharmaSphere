import { useCallback, useEffect, useState } from "react";
import { createSale, getMySales } from "../services/saleService";

// Registrar una compra online.
export function useCreateSale() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = useCallback(async (body) => {
    setSubmitting(true);
    setError(null);

    try {
      return await createSale(body);
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submit, submitting, error };
}

// Obtener el historial de pedidos del cliente.
export function useMySales() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getMySales();
      setOrders(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    getMySales()
      .then((response) => {
        if (active) {
          setOrders(Array.isArray(response) ? response : []);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { orders, loading, error, refetch };
}
