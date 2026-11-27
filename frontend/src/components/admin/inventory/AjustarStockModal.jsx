import { useState } from "react";
import Alert from "../../ui/Alert";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Modal from "../../ui/Modal";
import { ENDPOINTS, apiFetch } from "../../../config/api";

// Solo cambia el stock mínimo. Para ingresar o retirar unidades se usan los lotes.
// `item` = { id_producto, nombre, cantidad, stock_minimo }
export default function AjustarStockModal({
  item,
  branchId,
  branchName,
  onClose,
  onDone,
}) {
  const minActual = item.stock_minimo ?? 0;

  const [minimo, setMinimo] = useState(String(minActual));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const nuevo = Number(minimo);
    if (minimo === "" || !Number.isInteger(nuevo) || nuevo < 0) {
      setError("Ingresa un número entero igual o mayor a 0.");
      return;
    }
    if (nuevo === minActual) {
      setError("El stock mínimo es el mismo que ya tiene.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(ENDPOINTS.INVENTORY_ADJUST, {
        method: "POST",
        body: {
          id_producto: item.id_producto,
          id_sucursal: Number(branchId),
          cantidad: 0,
          stock_minimo: nuevo,
        },
      });
      onDone(`Stock mínimo de "${item.nombre}" actualizado a ${nuevo}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Stock mínimo">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-brand-muted-foreground">
          <strong className="text-brand-foreground">{item.nombre}</strong> ·{" "}
          {branchName} · Stock actual: <strong>{item.cantidad}</strong>
        </p>

        {error && <Alert type="error">{error}</Alert>}

        <Input
          id="minimo-valor"
          label="Stock mínimo (alerta de stock bajo)"
          type="number"
          step="1"
          min="0"
          value={minimo}
          onChange={(e) => setMinimo(e.target.value)}
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