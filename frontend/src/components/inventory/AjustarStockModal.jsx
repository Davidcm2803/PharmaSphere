import { useState } from "react";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import { ENDPOINTS, apiFetch } from "../../config/api";

// Se monta solo cuando hay un producto seleccionado (así el formulario
// siempre empieza vacío). `item` = { id_producto, nombre, cantidad }
export default function AjustarStockModal({
  item,
  branchId,
  branchName,
  onClose,
  onDone,
}) {
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const delta = Number(cantidad);
  const nuevoStock = Number.isInteger(delta) ? item.cantidad + delta : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (cantidad === "" || !Number.isInteger(delta) || delta === 0) {
      setError("Ingresa un número entero distinto de 0 (ej. 10 o -5).");
      return;
    }
    if (nuevoStock < 0) {
      setError(
        `No puedes dejar el stock en negativo (stock actual: ${item.cantidad}).`,
      );
      return;
    }
    if (!motivo.trim()) {
      setError("El motivo es obligatorio.");
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
          motivo: motivo.trim(),
        },
      });
      onDone(
        `Stock de "${item.nombre}" ajustado (${delta > 0 ? "+" : ""}${delta}).`,
      );
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
          {branchName} · Stock actual: <strong>{item.cantidad}</strong>
        </p>

        {error && <Alert type="error">{error}</Alert>}

        <Input
          id="ajuste-cantidad"
          label="Cantidad a sumar o restar"
          type="number"
          step="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="Ej. 10 para sumar, -5 para restar"
          required
        />
        {nuevoStock !== null && cantidad !== "" && delta !== 0 && (
          <p className="text-sm text-brand-muted-foreground">
            Stock resultante: <strong>{nuevoStock}</strong>
          </p>
        )}
        <Input
          id="ajuste-motivo"
          label="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. Conteo físico, producto dañado"
          required
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Guardar ajuste
          </Button>
        </div>
      </form>
    </Modal>
  );
}
