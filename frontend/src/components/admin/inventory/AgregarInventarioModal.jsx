import { useState } from "react";
import { X } from "lucide-react";
import useFetch from "../../../hooks/useFetch";
import { ENDPOINTS, apiFetch } from "../../../config/api";
import { tomorrow } from "../../../lib/expiry";
import Notice from "../ui/Notice";

const inputClass =
  "h-10 w-full rounded-lg border border-brand-border bg-brand-card px-3 text-sm text-brand-foreground focus:border-brand-primary focus:outline-none";

const labelClass =
  "flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground";

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
  const [minimo, setMinimo] = useState("0");
  const [cantidad, setCantidad] = useState("");
  const [numeroLote, setNumeroLote] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const qty = Number(cantidad) || 0;
  const hasLote = qty > 0 || numeroLote.trim() !== "" || vencimiento !== "";

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!productId) return setFormError("Selecciona un producto");
    if (!Number.isInteger(qty) || qty < 0)
      return setFormError("Las unidades deben ser un entero igual o mayor a 0");
    if (hasLote) {
      if (qty <= 0) return setFormError("Indica las unidades del lote");
      if (!numeroLote.trim()) return setFormError("Indica el número de lote");
      if (!vencimiento)
        return setFormError("Indica la fecha de vencimiento del lote");
      if (vencimiento < tomorrow())
        return setFormError("La fecha de vencimiento debe ser posterior a hoy");
    }

    setSaving(true);
    try {
      const item = await apiFetch(ENDPOINTS.INVENTORY_ADD, {
        method: "POST",
        body: {
          id_producto: Number(productId),
          id_sucursal: Number(branchId),
          cantidad: qty,
          stock_minimo: Number(minimo) || 0,
          motivo: hasLote ? "Alta de producto en sucursal" : undefined,
          numero_lote: hasLote ? numeroLote.trim() : undefined,
          fecha_vencimiento: hasLote ? vencimiento : undefined,
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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-brand-border bg-brand-card p-6 shadow-xl"
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
            <label className={labelClass}>
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

            <label className={labelClass}>
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

            <div className="rounded-xl border border-brand-border bg-brand-background p-3">
              <h3 className="mb-3 text-sm font-bold text-brand-foreground">
                Primer lote (opcional)
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className={labelClass}>
                  Unidades
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Número de lote
                  <input
                    type="text"
                    maxLength={100}
                    value={numeroLote}
                    onChange={(e) => setNumeroLote(e.target.value)}
                    placeholder="Ej. PAR-001"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Vencimiento
                  <input
                    type="date"
                    min={tomorrow()}
                    value={vencimiento}
                    onChange={(e) => setVencimiento(e.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
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