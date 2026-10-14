import { useState } from "react";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import { ENDPOINTS, apiFetch } from "../../config/api";

// `item` = { id_producto, nombre, cantidad }; `branches` = sucursales activas
export default function TransferirStockModal({
  item,
  branchId,
  branchName,
  branches,
  onClose,
  onDone,
}) {
  const destinos = branches.filter((b) => b.id_sucursal !== Number(branchId));

  const [destino, setDestino] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const qty = Number(cantidad);

    if (!destino) {
      setError("Selecciona la sucursal de destino.");
      return;
    }
    if (cantidad === "" || !Number.isInteger(qty) || qty <= 0) {
      setError("Ingresa una cantidad entera mayor a 0.");
      return;
    }
    if (qty > item.cantidad) {
      setError(
        `Solo hay ${item.cantidad} unidades disponibles en ${branchName}.`,
      );
      return;
    }

    setSaving(true);
    try {
      await apiFetch(ENDPOINTS.INVENTORY_TRANSFER, {
        method: "POST",
        body: {
          id_producto: item.id_producto,
          id_origen: Number(branchId),
          id_destino: Number(destino),
          cantidad: qty,
        },
      });
      const destName = destinos.find(
        (b) => b.id_sucursal === Number(destino),
      )?.nombre;
      onDone(
        `Se transfirieron ${qty} unidades de "${item.nombre}" a ${destName}.`,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Transferir stock">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-brand-muted-foreground">
          <strong className="text-brand-foreground">{item.nombre}</strong> ·
          Origen: {branchName} · Disponible: <strong>{item.cantidad}</strong>
        </p>

        {error && <Alert type="error">{error}</Alert>}

        <Select
          id="transfer-destino"
          label="Sucursal de destino"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          required
        >
          <option value="">Selecciona una sucursal</option>
          {destinos.map((b) => (
            <option key={b.id_sucursal} value={b.id_sucursal}>
              {b.nombre}
            </option>
          ))}
        </Select>
        <Input
          id="transfer-cantidad"
          label="Cantidad a transferir"
          type="number"
          min="1"
          step="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          required
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Transferir
          </Button>
        </div>
      </form>
    </Modal>
  );
}
