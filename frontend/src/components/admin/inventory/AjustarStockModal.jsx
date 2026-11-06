import { useState } from "react";
import Alert from "../../ui/Alert";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Modal from "../../ui/Modal";
import { ENDPOINTS, apiFetch } from "../../../config/api";

// Se monta solo cuando hay un producto seleccionado (asi el formulario
// siempre empieza vacio). `item` = { id_producto, nombre, cantidad, stock_minimo }
export default function AjustarStockModal({
  item,
  branchId,
  branchName,
  onClose,
  onDone,
}) {
  const minActual = item.stock_minimo ?? 0;

  const [cantidad, setCantidad] = useState("");
  const [minimo, setMinimo] = useState(String(minActual));
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Cantidad vacía = sin cambio de stock (solo se quiere tocar el mínimo)
  const delta = cantidad === "" ? 0 : Number(cantidad);
  const nuevoStock = Number.isInteger(delta) ? item.cantidad + delta : null;

  const minNuevo = Number(minimo);
  const minValido = minimo !== "" && Number.isInteger(minNuevo) && minNuevo >= 0;
  const minCambio = minValido && minNuevo !== minActual;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (cantidad !== "" && !Number.isInteger(delta)) {
      setError("La cantidad debe ser un número entero (ej. 10 o -5).");
      return;
    }
    if (!minValido) {
      setError("El stock mínimo debe ser un número entero igual o mayor a 0.");
      return;
    }
    if (delta === 0 && !minCambio) {
      setError("Ingresa una cantidad a sumar o restar, o cambia el stock mínimo.");
      return;
    }
    if (nuevoStock < 0) {
      setError(
        `No puedes dejar el stock en negativo (stock actual: ${item.cantidad}).`,
      );
      return;
    }
    if (delta !== 0 && !motivo.trim()) {
      setError("El motivo es obligatorio cuando ajustas la cantidad.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(ENDPOINTS.INVENTORY_ADJUST, {
        method: "POST",
        body: {
          id_producto: item.id_producto,
          id_sucursal: Number(branchId),
          cantidad: delta,
          motivo: motivo.trim() || undefined,
          stock_minimo: minCambio ? minNuevo : undefined,
        },
      });

      const partes = [];
      if (delta !== 0) partes.push(`stock ${delta > 0 ? "+" : ""}${delta}`);
      if (minCambio) partes.push(`mínimo ${minNuevo}`);
      onDone(`"${item.nombre}" actualizado (${partes.join(", ")}).`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Ajustar stock">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-brand-muted-foreground">
          <strong className="text-brand-foreground">{item.nombre}</strong> ·{" "}
          {branchName} · Stock actual: <strong>{item.cantidad}</strong> ·
          Mínimo: <strong>{minActual}</strong>
        </p>

        {error && <Alert type="error">{error}</Alert>}

        <Input
          id="ajuste-cantidad"
          label="Cantidad a sumar o restar (opcional)"
          type="number"
          step="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="Ej. 10 para sumar, -5 para restar"
        />
        {nuevoStock !== null && cantidad !== "" && delta !== 0 && (
          <p className="text-sm text-brand-muted-foreground">
            Stock resultante: <strong>{nuevoStock}</strong>
          </p>
        )}

        <Input
          id="ajuste-minimo"
          label="Stock mínimo"
          type="number"
          step="1"
          min="0"
          value={minimo}
          onChange={(e) => setMinimo(e.target.value)}
          placeholder="Ej. 15"
        />

        <Input
          id="ajuste-motivo"
          label={delta !== 0 ? "Motivo" : "Motivo (solo si ajustas la cantidad)"}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. Conteo físico, producto dañado"
          required={delta !== 0}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}