import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FilePlus,
  Minus,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  UserPlus,
  X,
} from "lucide-react";
import { useBranchOptions } from "../../hooks/useBranches";
import { useCreateCounterSale } from "../../hooks/useAdminSales";
import { useCustomerByCedula } from "../../hooks/useCustomersAdmin";
import { useActiveRecipes } from "../../hooks/useRecipes";
import { useDebounced, usePuntoDeVentaProductos } from "../../hooks/usePuntoDeVenta";
import { formatPrice } from "../../lib/format";
import { formatDate } from "../../lib/query";
import PageHeader from "../../components/admin/ui/PageHeader";
import ActionButton from "../../components/admin/ui/ActionButton";
import Panel from "../../components/admin/ui/Panel";
import Notice from "../../components/admin/ui/Notice";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import ClienteModal from "../../components/admin/customers/ClienteModal";
import RecetaModal from "../../components/admin/recipes/RecetaModal";

const MAX_QTY = 100;
const BRANCH_KEY = "pharmasphere_pos_branch";

const fieldClass =
  "h-11 w-full rounded-lg border border-brand-border bg-brand-card px-3 text-base text-brand-foreground placeholder:text-brand-muted-foreground focus:border-brand-primary focus:outline-none sm:text-sm";

const qtyBtn =
  "flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border bg-brand-card text-brand-foreground transition-colors hover:bg-brand-muted disabled:pointer-events-none disabled:opacity-40";

const toneClass = {
  warning: "text-brand-warning",
  danger: "text-brand-danger",
  success: "text-brand-success",
};

// "3x paracetamol" o "3*paracetamol" -> { qty: 3, text: "paracetamol" }
const parseSearch = (value) => {
  const match = value.match(/^\s*(\d{1,3})\s*[x*]\s*(.*)$/i);
  if (!match) return { qty: 1, text: value };
  return { qty: Math.min(Number(match[1]) || 1, MAX_QTY), text: match[2] };
};

const readBranch = () => {
  try {
    return localStorage.getItem(BRANCH_KEY) ?? "";
  } catch {
    return "";
  }
};

export default function PuntoDeVenta() {
  const searchRef = useRef(null);
  const focusSearch = () => searchRef.current?.focus();

  // Sucursal: se recuerda en este equipo
  const branches = useBranchOptions();
  const branchList = branches.data ?? [];
  const [selectedBranch, setSelectedBranch] = useState(readBranch);
  const branchId = branchList.some((b) => String(b.id_sucursal) === selectedBranch)
    ? selectedBranch
    : String(branchList[0]?.id_sucursal ?? "");

  const changeBranch = (value) => {
    setSelectedBranch(value);
    try {
      localStorage.setItem(BRANCH_KEY, value);
    } catch {
      // sin localStorage: solo vale para esta sesión
    }
  };

  // Productos
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const parsed = parseSearch(search);
  const term = useDebounced(parsed.text, 200);
  const products = usePuntoDeVentaProductos(term);
  const productItems = products.data?.items ?? [];
  const activeIndex = Math.min(active, Math.max(productItems.length - 1, 0));

  // Carrito (el total es solo referencia: el real lo calcula el backend)
  const [cart, setCart] = useState([]);
  const [sale, setSale] = useState(null);
  const cartTotal = cart.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const cartUnits = cart.reduce((sum, i) => sum + i.cantidad, 0);

  const addProduct = (p, qty = 1) => {
    const max = Math.min(p.stock_total ?? MAX_QTY, MAX_QTY);
    if (max < 1) return;
    setSale(null);
    setCart((current) => {
      const existing = current.find((i) => i.id_producto === p.id_producto);
      if (existing) {
        return current.map((i) =>
          i.id_producto === p.id_producto
            ? { ...i, stock_total: p.stock_total, cantidad: Math.min(i.cantidad + qty, max) }
            : i,
        );
      }
      return [
        ...current,
        {
          id_producto: p.id_producto,
          nombre: p.nombre,
          precio: Number(p.precio),
          requiere_receta: Boolean(p.requiere_receta),
          stock_total: p.stock_total ?? MAX_QTY,
          cantidad: Math.min(qty, max),
        },
      ];
    });
  };

  const setQty = (id, value) =>
    setCart((current) =>
      current
        .map((i) =>
          i.id_producto === id
            ? { ...i, cantidad: Math.min(Math.max(value, 0), i.stock_total, MAX_QTY) }
            : i,
        )
        .filter((i) => i.cantidad > 0),
    );

  const removeItem = (id) => setCart((current) => current.filter((i) => i.id_producto !== id));

  const pick = (p) => {
    addProduct(p, parsed.qty);
    setSearch("");
    setActive(0);
    focusSearch();
  };

  const onSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, productItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Espera a que lleguen los resultados de lo que se escribió
      if (parsed.text !== term || products.loading) return;
      const p = productItems[activeIndex];
      if (p && (p.stock_total ?? 0) > 0) pick(p);
    } else if (e.key === "Escape") {
      setSearch("");
      setActive(0);
    }
  };

  // Cliente (opcional, obligatorio si hay productos con receta): se busca solo al escribir la cédula
  const [cedulaInput, setCedulaInput] = useState("");
  const cedulaQuery = useDebounced(cedulaInput.trim(), 500);
  const [createdCustomer, setCreatedCustomer] = useState(null);
  const lookup = useCustomerByCedula(cedulaQuery);
  const foundCustomer = lookup.data?.items?.[0] ?? null;
  const customer = createdCustomer ?? foundCustomer;
  const [customerModal, setCustomerModal] = useState(false);

  const clearCustomer = () => {
    setCreatedCustomer(null);
    setCedulaInput("");
  };

  // Recetas vigentes del cliente (una sola petición; se cruzan por producto)
  const recipes = useActiveRecipes(customer?.cedula ?? "");
  const [recipeModalFor, setRecipeModalFor] = useState(null);

  const rxItems = useMemo(() => cart.filter((i) => i.requiere_receta), [cart]);

  // Estado de receta por producto: ok | short | missing | loading | no_customer | no_cedula | error
  const rxStatus = useMemo(() => {
    const result = {};
    const list = recipes.data?.items ?? [];
    rxItems.forEach((item) => {
      if (!customer) {
        result[item.id_producto] = { state: "no_customer" };
      } else if (!customer.cedula) {
        result[item.id_producto] = { state: "no_cedula" };
      } else if (recipes.loading) {
        result[item.id_producto] = { state: "loading" };
      } else if (recipes.error) {
        result[item.id_producto] = { state: "error" };
      } else {
        const matches = list.filter((r) => r.id_producto === item.id_producto);
        const best = [...matches].sort((a, b) => b.cantidad - a.cantidad)[0];
        if (!best) result[item.id_producto] = { state: "missing" };
        else if (best.cantidad < item.cantidad) result[item.id_producto] = { state: "short", recipe: best };
        else result[item.id_producto] = { state: "ok", recipe: best };
      }
    });
    return result;
  }, [rxItems, customer, recipes.data, recipes.loading, recipes.error]);

  const rxBlocked = rxItems.some((i) => rxStatus[i.id_producto]?.state !== "ok");

  // Pago
  const [metodo, setMetodo] = useState("efectivo");
  const [card4, setCard4] = useState("");
  const [received, setReceived] = useState("");
  const cardInvalid = metodo === "tarjeta" && !/^\d{4}$/.test(card4);
  const change = received === "" ? null : Number(received) - cartTotal;

  const { submit, submitting, error, reset } = useCreateCounterSale();

  const canCharge =
    !submitting && cart.length > 0 && Boolean(branchId) && !rxBlocked && !cardInvalid;

  const handleCharge = async () => {
    if (!canCharge) return;
    const venta = await submit({
      id_sucursal: Number(branchId),
      items: cart.map(({ id_producto, cantidad }) => ({ id_producto, cantidad })),
      ...(customer?.cedula ? { cedula_cliente: customer.cedula } : {}),
      metodo_pago: metodo,
      ...(metodo === "tarjeta" ? { tarjeta_ultimos_4: card4 } : {}),
    });
    if (!venta) return; // el carrito se conserva si falla
    setSale(venta);
    setCart([]);
    setCard4("");
    setReceived("");
    clearCustomer();
    setSearch("");
    products.refetch(); // refresca el stock mostrado
    focusSearch();
  };

  // Vaciar sin vender (para cotizar)
  const clearAll = () => {
    setCart([]);
    setReceived("");
    clearCustomer();
    reset();
    setSearch("");
    focusSearch();
  };

  // Atajos: F2 busca, F4 cobra
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "F4") {
        e.preventDefault();
        handleCharge();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const rxMessage = (item) => {
    const s = rxStatus[item.id_producto];
    switch (s?.state) {
      case "no_customer":
        return { tone: "warning", text: "Requiere receta: ingresa la cédula del cliente." };
      case "no_cedula":
        return { tone: "danger", text: "El cliente no tiene cédula; edítalo en Clientes." };
      case "loading":
        return { tone: "warning", text: "Validando receta…" };
      case "error":
        return { tone: "danger", text: `No se pudo validar la receta: ${recipes.error}` };
      case "missing":
        return { tone: "danger", text: "Sin receta vigente", action: true };
      case "short":
        return {
          tone: "danger",
          text: `La receta autoriza ${s.recipe.cantidad} y vendes ${item.cantidad}.`,
          action: true,
        };
      case "ok":
        return {
          tone: "success",
          text: `Receta vigente${s.recipe.medico ? ` · ${s.recipe.medico}` : ""}${
            s.recipe.vigencia_hasta ? ` · hasta ${formatDate(s.recipe.vigencia_hasta)}` : ""
          }`,
        };
      default:
        return null;
    }
  };

  const showNoCustomer = cedulaQuery && !lookup.loading && !lookup.error && !foundCustomer;

  return (
    <>
      <PageHeader
        eyebrow="Operaciones de farmacia"
        title="Punto de venta"
        subtitle="Escribe, presiona Enter y cobra."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <select
              aria-label="Sucursal"
              value={branchId}
              onChange={(e) => changeBranch(e.target.value)}
              disabled={branches.loading}
              className="h-10 w-full rounded-lg border border-brand-border bg-brand-card px-3 text-sm font-semibold text-brand-foreground focus:border-brand-primary focus:outline-none sm:w-56"
            >
              {branchList.length === 0 && (
                <option value="">{branches.loading ? "Cargando…" : "Sin sucursales"}</option>
              )}
              {branchList.map((b) => (
                <option key={b.id_sucursal} value={b.id_sucursal}>
                  {b.nombre}
                </option>
              ))}
            </select>
            <ActionButton to="/admin/ventas">Ver ventas</ActionButton>
          </div>
        }
      />

      {branches.error && (
        <Alert type="error">
          No se pudieron cargar las sucursales: {branches.error}
          <button onClick={branches.refetch} className="ml-2 font-semibold underline">Reintentar</button>
        </Alert>
      )}

      {sale && (
        <Notice type="success" onClose={() => setSale(null)} className="mt-6">
          <span>
            Venta <strong>#{sale.id_venta}</strong> cobrada: <strong>{formatPrice(sale.total)}</strong>.
          </span>{" "}
          <Link to={`/admin/ventas/${sale.id_venta}`} className="ml-2 font-semibold underline">
            Ver detalle
          </Link>
        </Notice>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_440px] lg:items-start">
        {/* Buscador y resultados */}
        <section className="min-w-0">
          <label className="block">
            <span className="sr-only">Buscar producto</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-muted-foreground" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onSearchKeyDown}
                placeholder="Buscar producto…  (ej. 2x paracetamol)"
                autoFocus
                autoComplete="off"
                className="h-14 w-full rounded-2xl border-2 border-brand-border bg-brand-card pl-12 pr-4 text-lg text-brand-foreground placeholder:text-brand-muted-foreground focus:border-brand-primary focus:outline-none"
              />
            </span>
          </label>
          <p className="mt-2 hidden text-xs text-brand-muted-foreground sm:block">
            <kbd className="font-semibold">Enter</kbd> agrega · <kbd className="font-semibold">↑ ↓</kbd> elige ·{" "}
            <kbd className="font-semibold">3x nombre</kbd> cantidad · <kbd className="font-semibold">F2</kbd> buscar ·{" "}
            <kbd className="font-semibold">F4</kbd> cobrar
          </p>

          <div className="mt-4">
            {products.error ? (
              <Notice type="error">
                No se pudieron cargar los productos: {products.error}
                <button onClick={products.refetch} className="ml-2 font-semibold underline">Reintentar</button>
              </Notice>
            ) : products.loading && productItems.length === 0 ? (
              <p className="py-10 text-center text-brand-muted-foreground">Cargando productos…</p>
            ) : productItems.length === 0 ? (
              <p className="rounded-2xl border border-brand-border px-5 py-10 text-center text-brand-muted-foreground">
                No hay productos que coincidan con “{term}”.
              </p>
            ) : (
              <ul className="space-y-2" role="listbox" aria-label="Resultados">
                {productItems.map((p, index) => {
                  const soldOut = (p.stock_total ?? 0) < 1;
                  const inCart = cart.find((i) => i.id_producto === p.id_producto);
                  const isActive = index === activeIndex;
                  return (
                    <li key={p.id_producto}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        disabled={soldOut}
                        onClick={() => pick(p)}
                        onMouseEnter={() => setActive(index)}
                        className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          isActive
                            ? "border-brand-primary bg-brand-accent"
                            : "border-brand-border bg-brand-card hover:bg-brand-muted"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-brand-foreground">{p.nombre}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-2">
                            {soldOut ? (
                              <Badge variant="danger">Agotado</Badge>
                            ) : (
                              <Badge variant="neutral">{p.stock_total} en stock</Badge>
                            )}
                            {p.requiere_receta && <Badge variant="warning">Receta</Badge>}
                            {inCart && <Badge variant="success">En carrito: {inCart.cantidad}</Badge>}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="text-lg font-extrabold text-brand-primary-dark">{formatPrice(p.precio)}</span>
                          <Plus className="h-5 w-5 text-brand-muted-foreground" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Venta: carrito, cliente y cobro en un solo bloque */}
        <Panel title="Venta" subtitle={`${cartUnits} ${cartUnits === 1 ? "unidad" : "unidades"}`}>
          {cart.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-brand-border px-5 py-8 text-center text-sm text-brand-muted-foreground">
              Busca un producto y presiona Enter.
            </p>
          ) : (
            <ul className="divide-y divide-brand-border">
              {cart.map((item) => {
                const msg = item.requiere_receta ? rxMessage(item) : null;
                return (
                  <li key={item.id_producto} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-foreground">{item.nombre}</p>
                        <p className="text-sm text-brand-muted-foreground">{formatPrice(item.precio)} c/u</p>
                      </div>
                      <p className="shrink-0 font-bold text-brand-foreground">
                        {formatPrice(item.precio * item.cantidad)}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button className={qtyBtn} onClick={() => setQty(item.id_producto, item.cantidad - 1)} aria-label={`Quitar una unidad de ${item.nombre}`}>
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={Math.min(item.stock_total, MAX_QTY)}
                          value={item.cantidad}
                          onChange={(e) => setQty(item.id_producto, Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          aria-label={`Cantidad de ${item.nombre}`}
                          className="h-10 w-16 rounded-lg border border-brand-border bg-brand-card text-center text-base font-semibold text-brand-foreground focus:border-brand-primary focus:outline-none"
                        />
                        <button
                          className={qtyBtn}
                          disabled={item.cantidad >= Math.min(item.stock_total, MAX_QTY)}
                          onClick={() => setQty(item.id_producto, item.cantidad + 1)}
                          aria-label={`Agregar una unidad de ${item.nombre}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id_producto)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-brand-muted-foreground hover:bg-brand-muted hover:text-brand-danger"
                        aria-label={`Quitar ${item.nombre}`}
                        title="Quitar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {msg && (
                      <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium ${toneClass[msg.tone]}`}>
                        <span className="flex items-center gap-1">
                          <TriangleAlert className="h-4 w-4 shrink-0" />
                          {msg.text}
                        </span>
                        {msg.action && (
                          <button
                            onClick={() => setRecipeModalFor(item)}
                            className="flex items-center gap-1 font-semibold underline"
                          >
                            <FilePlus className="h-4 w-4" /> Registrar receta
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Total grande: es lo primero que ve el cliente al cotizar */}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand-accent px-4 py-4 text-brand-accent-foreground">
            <span className="font-semibold">Total</span>
            <span className="text-3xl font-extrabold">{formatPrice(cartTotal)}</span>
          </div>

          {/* Cliente */}
          <div className="mt-4">
            {customer ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-border px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-brand-foreground">{customer.nombre}</p>
                  <p className="text-sm text-brand-muted-foreground">{customer.cedula ?? "Sin cédula"}</p>
                </div>
                <button onClick={clearCustomer} className="text-brand-muted-foreground hover:text-brand-danger" aria-label="Quitar cliente">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <input
                  value={cedulaInput}
                  onChange={(e) => setCedulaInput(e.target.value)}
                  placeholder={rxItems.length > 0 ? "Cédula del cliente (obligatoria)" : "Cédula del cliente (opcional)"}
                  aria-label="Cédula del cliente"
                  autoComplete="off"
                  className={fieldClass}
                />
                {cedulaQuery && lookup.loading && (
                  <p className="mt-2 text-sm text-brand-muted-foreground">Buscando cliente…</p>
                )}
                {cedulaQuery && lookup.error && <Alert type="error">{lookup.error}</Alert>}
                {showNoCustomer && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-brand-muted-foreground">
                    <span>No hay un cliente con esa cédula.</span>
                    <button
                      onClick={() => setCustomerModal(true)}
                      className="flex items-center gap-1 font-semibold text-brand-primary hover:underline"
                    >
                      <UserPlus className="h-4 w-4" /> Registrar cliente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pago */}
          {error && (
            <div className="mt-4">
              <Alert type="error">
                <ul className="list-disc pl-5">
                  {error.split("; ").map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              </Alert>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ["efectivo", "Efectivo"],
              ["tarjeta", "Tarjeta"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMetodo(value)}
                aria-pressed={metodo === value}
                className={`h-12 rounded-lg border text-sm font-semibold transition-colors ${
                  metodo === value
                    ? "border-brand-primary bg-brand-primary-dark text-brand-primary-foreground"
                    : "border-brand-border bg-brand-card text-brand-foreground hover:bg-brand-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {metodo === "efectivo" ? (
            <div className="mt-3 grid grid-cols-2 items-center gap-3">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                placeholder="Recibido ₡"
                aria-label="Monto recibido"
                className={fieldClass}
              />
              <p className="text-right text-sm text-brand-muted-foreground">
                Vuelto:{" "}
                <strong className={change != null && change < 0 ? "text-brand-danger" : "text-brand-foreground"}>
                  {change == null ? "—" : change < 0 ? `faltan ${formatPrice(-change)}` : formatPrice(change)}
                </strong>
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <input
                inputMode="numeric"
                maxLength={4}
                value={card4}
                onChange={(e) => setCard4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Últimos 4 dígitos de la tarjeta"
                aria-label="Últimos 4 dígitos de la tarjeta"
                className={fieldClass}
              />
              {card4 && cardInvalid && <p className="mt-1 text-xs text-brand-danger">Ingresa los 4 dígitos.</p>}
            </div>
          )}

          {rxBlocked && (
            <p className="mt-3 text-sm font-medium text-brand-danger">
              Resuelve las recetas pendientes para poder cobrar.
            </p>
          )}

          <Button type="button" className="mt-4 h-14 w-full text-lg" loading={submitting} disabled={!canCharge} onClick={handleCharge}>
            Cobrar {cart.length > 0 && formatPrice(cartTotal)} <span className="hidden text-sm font-normal opacity-80 sm:inline">(F4)</span>
          </Button>

          {cart.length > 0 && (
            <button onClick={clearAll} className="mt-3 w-full text-center text-sm font-semibold text-brand-muted-foreground hover:text-brand-danger">
              Vaciar y empezar de nuevo
            </button>
          )}
        </Panel>
      </div>

      {customerModal && (
        <ClienteModal
          defaultCedula={cedulaQuery}
          onClose={() => setCustomerModal(false)}
          onSaved={(created) => {
            setCustomerModal(false);
            setCreatedCustomer(created);
            setCedulaInput(created.cedula ?? "");
          }}
        />
      )}

      {recipeModalFor && customer && (
        <RecetaModal
          customer={customer}
          product={recipeModalFor}
          defaultQuantity={recipeModalFor.cantidad}
          onClose={() => setRecipeModalFor(null)}
          onSaved={() => {
            setRecipeModalFor(null);
            recipes.refetch();
          }}
        />
      )}
    </>
  );
}