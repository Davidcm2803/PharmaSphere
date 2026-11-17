import { useEffect, useState } from "react";
import { getTopProducts } from "../services/saleService";

export function useTopProducts(limit = 8) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    let active = true;
    getTopProducts(limit)
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((err) => active && setState({ data: null, loading: false, error: err.message }));
    return () => {
      active = false;
    };
  }, [limit]);

  return state;
}