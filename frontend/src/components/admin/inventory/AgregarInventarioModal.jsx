import { useState } from "react";
import { X } from "lucide-react";
import useFetch from "../../../hooks/useFetch";
import { ENDPOINTS, apiFetch } from "../../../config/api";
import Notice from "../ui/Notice";

const inputClass =
  "h-10 w-full rounded-lg border border-brand-border bg-brand-card px-3 text-sm text-brand-foreground focus:border-brand-primary focus:outline-none";

export default function AgregarInventarioModal({
  branchId,
  branchName,
  onClose,
  onDone,
}) {
  const { data, loading, error } = useFetch(
    `${ENDPOINTS.INVENTORY_MISSING}?id_sucursal=${branchId}`,
  );
  const products = Array.isArray(data) ? data : (data?.items ?? []);

  const [productId, setProductId] = useState("");
  const [cantidad, setCantidad] = useState("0");
  const [minimo, setMinimo] = useState("0");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!productId) return setFormError("Selecciona un producto");

    setSaving(true);
    try {
      const item = await apiFetch(ENDPOINTS.INVENTORY_ADD, {
        method: "POST",
        body: {
          id_producto: Number(productId),
          id_sucursal: Number(branchId),
          cantidad: Number(cantidad) || 0,
          stock_minimo: Number(minimo) || 0,
          motivo: motivo.trim() || undefined,
        },
      });
      onDone(
        `"${item.producto_nombre}" se agregó al inventario de ${branchName}`,
      );
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-card p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-brand-foreground">
              Agregar al inventario
            </h2>
            <p className="text-sm text-brand-muted-foreground">
              Sucursal: {branchName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-brand-muted-foreground hover:bg-brand-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {formError && (
          <Notice type="error" className="mb-4">
            {formError}
          </Notice>
        )}

        {error ? (
          <Notice type="error">
            No se pudieron cargar los productos: {error}
          </Notice>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
              Producto
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                disabled={loading}
                className={inputClass}
              >
                <option value="">
                  {loading
                    ? "Cargando…"
                    : products.length === 0
                      ? "Todos los productos ya están en esta sucursal"
                      : "Selecciona un producto"}
                </option>
                {products.map((p) => (
                  <option key={p.id_producto} value={p.id_producto}>
                    {p.nombre}
                    {p.categoria ? ` — ${p.categoria}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
                Cantidad inicial
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
                Stock mínimo
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={minimo}
                  onChange={(e) => setMinimo(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
              Motivo (opcional)
              <input
                type="text"
                maxLength={200}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Alta de producto en sucursal"
                className={inputClass}
              />
            </label>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || loading || !productId}
            className="h-10 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </form>
    </div>
  );
}