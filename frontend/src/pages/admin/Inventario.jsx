import { useState } from "react";
import AjustarStockModal from "../../components/inventory/AjustarStockModal";
import TransferirStockModal from "../../components/inventory/TransferirStockModal";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import { ENDPOINTS } from "../../config/api";
import useApi from "../../hooks/useApi";

const toList = (data) => (Array.isArray(data) ? data : (data?.items ?? []));

// Normaliza una fila del backend (acepta producto_nombre, producto.nombre o nombre)
const normalize = (r) => ({
  ...r,
  nombre:
    r.producto_nombre ??
    r.producto?.nombre ??
    r.nombre ??
    `Producto #${r.id_producto}`,
  stock_bajo: r.stock_bajo ?? r.cantidad < r.stock_minimo,
});

export default function Inventario() {
  const { data: branchesData, error: branchesError } = useApi(
    ENDPOINTS.BRANCHES,
  );
  const activeBranches = toList(branchesData).filter((b) => b.activo);

  const [selectedBranch, setSelectedBranch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);

  // Si el admin aún no eligió, usamos la primera sucursal activa
  const branchId =
    selectedBranch || String(activeBranches[0]?.id_sucursal ?? "");
  const branch = activeBranches.find((b) => String(b.id_sucursal) === branchId);

  const query = branchId
    ? `${ENDPOINTS.INVENTORY}?id_sucursal=${branchId}${onlyLow ? "&low_stock=true" : ""}`
    : null;
  const { data, error, loading, refetch } = useApi(query);

  const allRows = toList(data).map(normalize);
  const lowCount = allRows.filter((r) => r.stock_bajo).length;
  // Se filtra también aquí, por si el backend ignora low_stock
  const rows = onlyLow ? allRows.filter((r) => r.stock_bajo) : allRows;

  const [adjusting, setAdjusting] = useState(null);
  const [transferring, setTransferring] = useState(null);
  const [message, setMessage] = useState("");

  const handleDone = (text) => {
    setAdjusting(null);
    setTransferring(null);
    setMessage(text);
    refetch();
  };

  const columns = [
    { key: "nombre", header: "Producto" },
    {
      key: "categoria",
      header: "Categoría",
      render: (r) => r.categoria || "—",
    },
    {
      key: "cantidad",
      header: "Stock",
      render: (r) => (
        <span className={r.stock_bajo ? "font-bold text-brand-danger" : ""}>
          {r.cantidad}
        </span>
      ),
    },
    { key: "stock_minimo", header: "Mínimo" },
    {
      key: "estado",
      header: "Estado",
      render: (r) =>
        r.stock_bajo ? (
          <Badge variant="danger">Stock bajo</Badge>
        ) : (
          <Badge variant="success">OK</Badge>
        ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (r) => (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAdjusting(r)}>
            Ajustar
          </Button>
          <Button variant="outline" onClick={() => setTransferring(r)}>
            Transferir
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Inventario</h1>

      <div className="flex flex-wrap items-end gap-4">
        <div className="w-64">
          <Select
            id="sucursal"
            label="Sucursal"
            value={branchId}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            {activeBranches.length === 0 && (
              <option value="">Sin sucursales</option>
            )}
            {activeBranches.map((b) => (
              <option key={b.id_sucursal} value={b.id_sucursal}>
                {b.nombre}
              </option>
            ))}
          </Select>
        </div>

        <label className="flex items-center gap-2 pb-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={onlyLow}
            onChange={(e) => setOnlyLow(e.target.checked)}
            className="h-4 w-4 accent-brand-primary"
          />
          Solo stock bajo
        </label>
      </div>

      {message && <Alert type="success">{message}</Alert>}
      {(branchesError || error) && (
        <Alert type="error">{branchesError || error}</Alert>
      )}
      {!loading && lowCount > 0 && (
        <Alert type="warning">
          {lowCount} {lowCount === 1 ? "producto está" : "productos están"} por
          debajo del stock mínimo en esta sucursal.
        </Alert>
      )}

      <Table
        columns={columns}
        rows={rows}
        rowKey="id_producto"
        loading={loading}
        emptyMessage={
          onlyLow
            ? "No hay productos con stock bajo en esta sucursal"
            : "No hay productos en el inventario de esta sucursal"
        }
      />

      {adjusting && (
        <AjustarStockModal
          item={adjusting}
          branchId={branchId}
          branchName={branch?.nombre}
          onClose={() => setAdjusting(null)}
          onDone={handleDone}
        />
      )}

      {transferring && (
        <TransferirStockModal
          item={transferring}
          branchId={branchId}
          branchName={branch?.nombre}
          branches={activeBranches}
          onClose={() => setTransferring(null)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
