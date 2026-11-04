import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CART_KEY = "pharmasphere_cart";

// Lee el carrito guardado. Si localStorage no está disponible o el JSON está dañado, empieza vacío
const loadCart = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  // Cada cambio del carrito se guarda, así sobrevive a recargar la página
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // localStorage no disponible: el carrito solo vive en esta sesión
    }
  }, [items]);

  // Guarda solo lo necesario para pintar el carrito. El precio real y el stock los valida el backend al comprar
  const addItem = useCallback((product, cantidad = 1) => {
    setItems((current) => {
      const max = product.stock_total ?? Infinity;
      const existing = current.find(
        (i) => i.id_producto === product.id_producto,
      );

      if (existing) {
        return current.map((i) =>
          i.id_producto === product.id_producto
            ? {
                ...i,
                stock_total: max,
                cantidad: Math.min(i.cantidad + cantidad, max),
              }
            : i,
        );
      }
      if (max < 1) return current;

      return [
        ...current,
        {
          id_producto: product.id_producto,
          nombre: product.nombre,
          precio: Number(product.precio),
          imagen_url: product.imagen_url ?? null,
          requiere_receta: Boolean(product.requiere_receta),
          stock_total: max,
          cantidad: Math.min(cantidad, max),
        },
      ];
    });
  }, []);

  const removeItem = useCallback((id_producto) => {
    setItems((current) => current.filter((i) => i.id_producto !== id_producto));
  }, []);

  // Si la cantidad llega a 0 o menos, el producto se quita
  const setQuantity = useCallback((id_producto, cantidad) => {
    setItems((current) =>
      current
        .map((i) =>
          i.id_producto === id_producto
            ? { ...i, cantidad: Math.min(cantidad, i.stock_total ?? Infinity) }
            : i,
        )
        .filter((i) => i.cantidad > 0),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.cantidad, 0),
      total: items.reduce((sum, i) => sum + i.precio * i.cantidad, 0),
      addItem,
      removeItem,
      setQuantity,
      clear,
    }),
    [items, addItem, removeItem, setQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);
