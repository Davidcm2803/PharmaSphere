import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

// Clave vieja (un solo carrito para todos). Se borra: mezclaba los carritos de distintas cuentas
const LEGACY_CART_KEY = "pharmasphere_cart";
try {
  localStorage.removeItem(LEGACY_CART_KEY);
} catch {
  // localStorage no disponible: no hay nada que limpiar
}

// Cada cuenta tiene su propio carrito: "pharmasphere_cart:u12" (usuario 12) o "pharmasphere_cart:guest"
const cartKey = (owner) => `pharmasphere_cart:${owner}`;

// Lee el carrito de ese dueño. Si localStorage no está disponible o el JSON está dañado, empieza vacío
const loadCart = (owner) => {
  try {
    const saved = JSON.parse(localStorage.getItem(cartKey(owner)));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user, loading } = useAuth();

  // Dueño actual del carrito. "pending" = todavía no sabemos quién es (se está validando el token)
  const owner = loading ? "pending" : user ? `u${user.id_usuario}` : "guest";

  // El estado guarda de quién son los items: así nunca se mezclan al cambiar de cuenta
  const [cart, setCart] = useState(() => ({ owner, items: loadCart(owner) }));
  if (cart.owner !== owner) {
    // Cambió la cuenta (login, logout o cambio de usuario): carga el carrito de la cuenta nueva
    setCart({ owner, items: loadCart(owner) });
  }
  const items = useMemo(
    () => (cart.owner === owner ? cart.items : []),
    [cart, owner],
  );

  // Cada cambio del carrito se guarda en la clave de su dueño, así sobrevive a recargar la página
  useEffect(() => {
    if (cart.owner === "pending") return;
    try {
      localStorage.setItem(cartKey(cart.owner), JSON.stringify(cart.items));
    } catch {
      // localStorage no disponible: el carrito solo vive en esta sesión
    }
  }, [cart]);

  // Cambia solo los items del dueño actual
  const updateItems = useCallback(
    (fn) =>
      setCart((current) =>
        current.owner === "pending"
          ? current
          : { ...current, items: fn(current.items) },
      ),
    [],
  );

  // Guarda solo lo necesario para pintar el carrito. El precio real y el stock los valida el backend al comprar
  const addItem = useCallback(
    (product, cantidad = 1) => {
      updateItems((current) => {
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
    },
    [updateItems],
  );

  const removeItem = useCallback(
    (id_producto) => {
      updateItems((current) =>
        current.filter((i) => i.id_producto !== id_producto),
      );
    },
    [updateItems],
  );

  // Si la cantidad llega a 0 o menos, el producto se quita
  const setQuantity = useCallback(
    (id_producto, cantidad) => {
      updateItems((current) =>
        current
          .map((i) =>
            i.id_producto === id_producto
              ? {
                  ...i,
                  cantidad: Math.min(cantidad, i.stock_total ?? Infinity),
                }
              : i,
          )
          .filter((i) => i.cantidad > 0),
      );
    },
    [updateItems],
  );

  const clear = useCallback(() => updateItems(() => []), [updateItems]);

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
