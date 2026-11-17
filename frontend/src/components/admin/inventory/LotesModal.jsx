import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import useFetch from "../../../hooks/useFetch";
import { ENDPOINTS, apiFetch } from "../../../config/api";
import Notice from "../ui/Notice";
import Badge from "../../ui/Badge";
import {
  daysUntil,
  expiryStatus,
  fmtDate,
  plural,
  tomorrow,
} from "../../../lib/expiry";

const inputClass =
  "h-10 w-full rounded-lg border border-brand-border bg-brand-card px-3 text-sm text-brand-foreground focus:border-brand-primary focus:outline-none";

const iconBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg text-brand-muted-foreground transition-colors hover:bg-brand-muted hover:text-brand-foreground";

const emptyForm = {
  numero_lote: "",
  fecha: "",
  cantidad: "",
  motivo: "",
};

// Gestión de los lotes de un producto en una sucursal:
// agregar lote, corregir número/vencimiento y dar de baja unidades.
// `item` = { id_producto, nombre }
// `startAdding` abre directamente el formulario de lote nuevo.
export default function LotesModal({
  item,
  branchId,
  branchName,
  startAdding = false,
  onClose,
  onChanged,
}) {
  const { data, loading, error, refetch } = useFetch(
    `${ENDPOINTS.INVENTORY}/lots?id_producto=${item.id_producto}&id_sucursal=${branchId}`,
  );
  const lotes = Array.isArray(data) ? data : (data?.items ?? []);
  const totalUnits = lotes.reduce((s, l) => s + (l.cantidad ?? 0), 0);

  const [mode, setMode] = useState(startAdding ? { type: "add" } : null); // { type: "add" | "edit" | "baja", lote? }
  const [form, setForm] = useState(
    startAdding ? { ...emptyForm, motivo: "Ingreso de lote" } : emptyForm,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [msg, setMsg] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const startAdd = () => {
    setMsg(null);
    setFormError(null);
    setForm({ ...emptyForm, motivo: "Ingreso de lote" });
    setMode({ type: "add" });
  };

  const startEdit = (lote) => {
    setMsg(null);
    setFormError(null);
    setForm({
      ...emptyForm,
      numero_lote: lote.numero_lote,
      fecha: String(lote.fecha_vencimiento).slice(0, 10),
    });
    setMode({ type: "edit", lote });
  };

  const startBaja = (lote) => {
    setMsg(null);
    setFormError(null);
    setForm({
      ...emptyForm,
      cantidad: String(lote.cantidad),
      motivo: daysUntil(lote.fecha_vencimiento) < 0 ? "Producto vencido" : "",
    });
    setMode({ type: "baja", lote });
  };

  const cancel = () => {
    setMode(null);
    setFormError(null);
  };

  const finish = (text) => {
    setMode(null);
    setMsg(text);
    refetch();
    onChanged?.();
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    // El motivo del ingreso de lote es fijo: no se le pide al usuario
    const motivo = mode.type === "add" ? "Ingreso de lote" : form.motivo.trim();
    const qty = Number(form.cantidad);

    try {
      if (mode.type === "add") {
        if (!form.numero_lote.trim()) return setFormError("Indica el número de lote");
        if (!form.fecha) return setFormError("Indica la fecha de vencimiento");
        if (form.fecha < tomorrow())
          return setFormError("La fecha de vencimiento debe ser posterior a hoy");
        if (!Number.isInteger(qty) || qty <= 0)
          return setFormError("La cantidad debe ser un entero mayor a 0");

        setSaving(true);
        await apiFetch(ENDPOINTS.INVENTORY_ADJUST, {
          method: "POST",
          body: {
            id_producto: item.id_producto,
            id_sucursal: Number(branchId),
            cantidad: qty,
            motivo,
            numero_lote: form.numero_lote.trim(),
            fecha_vencimiento: form.fecha,
          },
        });
        return finish(`Lote ${form.numero_lote.trim()} agregado (+${qty}).`);
      }

      if (mode.type === "edit") {
        const { lote } = mode;
        const nuevoNumero = form.numero_lote.trim();
        const body = { motivo };
        if (nuevoNumero && nuevoNumero !== lote.numero_lote)
          body.numero_lote = nuevoNumero;
        if (form.fecha && form.fecha !== String(lote.fecha_vencimiento).slice(0, 10))
          body.fecha_vencimiento = form.fecha;
        if (!body.numero_lote && !body.fecha_vencimiento)
          return setFormError("Cambia el número de lote o la fecha de vencimiento");
        if (motivo.length < 3)
          return setFormError("El motivo de la corrección es obligatorio");

        setSaving(true);
        await apiFetch(`${ENDPOINTS.INVENTORY}/lots/${lote.id_lote}`, {
          method: "PATCH",
          body,
        });
        return finish(`Lote ${lote.numero_lote} corregido.`);
      }

      if (mode.type === "baja") {
        const { lote } = mode;
        if (!Number.isInteger(qty) || qty < 1 || qty > lote.cantidad)
          return setFormError(`La cantidad debe estar entre 1 y ${lote.cantidad}`);
        if (motivo.length < 3)
          return setFormError("El motivo de la baja es obligatorio");

        setSaving(true);
        await apiFetch(`${ENDPOINTS.INVENTORY}/lots/${lote.id_lote}/write-off`, {
          method: "POST",
          body: { cantidad: qty, motivo },
        });
        return finish(
          `Baja de ${plural(qty, "unidad", "unidades")} del lote ${lote.numero_lote}.`,
        );
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const label = "flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-brand-border bg-brand-card p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-brand-foreground">
              Lotes de {item.nombre}
            </h2>
            <p className="text-sm text-brand-muted-foreground">
              Sucursal: {branchName}
              {!loading && !error && ` · ${plural(totalUnits, "unidad", "unidades")} en ${plural(lotes.length, "lote", "lotes")}`}
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

        {msg && (
          <Notice type="success" onClose={() => setMsg(null)} className="mb-4">
            {msg}
          </Notice>
        )}

        {error ? (
          <Notice type="error">
            No se pudieron cargar los lotes: {error}
            <button onClick={refetch} className="ml-2 font-semibold underline">
              Reintentar
            </button>
          </Notice>
        ) : loading ? (
          <p className="py-8 text-center text-brand-muted-foreground">Cargando lotes…</p>
        ) : lotes.length === 0 ? (
          <p className="rounded-xl border border-brand-border px-4 py-8 text-center text-sm text-brand-muted-foreground">
            Este producto no tiene lotes con stock en esta sucursal.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-brand-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-muted text-xs uppercase tracking-wide text-brand-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Lote</th>
                  <th className="px-3 py-2.5 font-bold">Vence</th>
                  <th className="px-3 py-2.5 font-bold">Unidades</th>
                  <th className="px-3 py-2.5 font-bold">Estado</th>
                  <th className="px-3 py-2.5 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {lotes.map((l) => {
                  const days = daysUntil(l.fecha_vencimiento);
                  const st = expiryStatus(days);
                  return (
                    <tr key={l.id_lote}>
                      <td className="px-3 py-3 font-semibold text-brand-foreground">
                        {l.numero_lote}
                      </td>
                      <td className="px-3 py-3 text-brand-muted-foreground">
                        {fmtDate(l.fecha_vencimiento)}
                      </td>
                      <td className="px-3 py-3 text-brand-foreground">{l.cantidad}</td>
                      <td className="px-3 py-3">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(l)}
                            className={iconBtn}
                            title="Corregir número o vencimiento"
                            aria-label={`Corregir lote ${l.numero_lote}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startBaja(l)}
                            className={`${iconBtn} hover:!text-brand-danger`}
                            title="Dar de baja unidades"
                            aria-label={`Dar de baja lote ${l.numero_lote}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {mode && (
          <form
            onSubmit={submit}
            className="mt-5 flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-background p-4"
          >
            <h3 className="text-sm font-bold text-brand-foreground">
              {mode.type === "add" && "Agregar lote"}
              {mode.type === "edit" && `Corregir lote ${mode.lote.numero_lote}`}
              {mode.type === "baja" &&
                `Dar de baja unidades del lote ${mode.lote.numero_lote}`}
            </h3>

            {formError && <Notice type="error">{formError}</Notice>}

            {(mode.type === "add" || mode.type === "edit") && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={label}>
                  Número de lote
                  <input
                    type="text"
                    maxLength={100}
                    value={form.numero_lote}
                    onChange={set("numero_lote")}
                    placeholder="Ej. PAR-004"
                    className={inputClass}
                  />
                </label>
                <label className={label}>
                  Vencimiento
                  <input
                    type="date"
                    min={mode.type === "add" ? tomorrow() : undefined}
                    value={form.fecha}
                    onChange={set("fecha")}
                    className={inputClass}
                  />
                </label>
              </div>
            )}

            {(mode.type === "add" || mode.type === "baja") && (
              <label className={label}>
                {mode.type === "add"
                  ? "Unidades que ingresan"
                  : `Unidades a dar de baja (máx. ${mode.lote.cantidad})`}
                <input
                  type="number"
                  min="1"
                  max={mode.type === "baja" ? mode.lote.cantidad : undefined}
                  step="1"
                  value={form.cantidad}
                  onChange={set("cantidad")}
                  className={inputClass}
                />
              </label>
            )}

            {mode.type !== "add" && (
              <label className={label}>
                {mode.type === "edit" ? "Motivo de la corrección" : "Motivo"}
                <input
                  type="text"
                  maxLength={200}
                  value={form.motivo}
                  onChange={set("motivo")}
                  placeholder={
                    mode.type === "edit"
                      ? "Ej. Error de digitación en la fecha"
                      : "Ej. Vencido, dañado, retiro del proveedor"
                  }
                  className={inputClass}
                />
              </label>
            )}

            {mode.type === "edit" && (
              <p className="text-xs text-brand-muted-foreground">
                Solo para corregir errores de digitación. Las unidades del lote
                no cambian.
              </p>
            )}
            {mode.type === "baja" && (
              <p className="text-xs text-brand-muted-foreground">
                Las unidades salen del inventario y queda registrado en el
                historial de movimientos.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancel}
                className="h-10 rounded-lg px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`h-10 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50 ${
                  mode.type === "baja" ? "bg-brand-danger" : "bg-brand-primary"
                }`}
              >
                {saving
                  ? "Guardando…"
                  : mode.type === "add"
                    ? "Agregar lote"
                    : mode.type === "edit"
                      ? "Guardar corrección"
                      : "Dar de baja"}
              </button>
            </div>
          </form>
        )}

        {!mode && !loading && !error && (
          <div className="mt-5 flex justify-between gap-2">
            <button
              type="button"
              onClick={startAdd}
              className="flex h-10 items-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> Agregar lote
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-muted"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}