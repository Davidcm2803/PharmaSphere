import { useState } from "react";
import { ArrowLeftRight, Boxes, Search, SlidersHorizontal } from "lucide-react";
import useFetch from "../../hooks/useFetch";
import { ENDPOINTS } from "../../config/api";
import PageHeader from "../../components/admin/ui/PageHeader";
import ActionButton from "../../components/admin/ui/ActionButton";
import Panel from "../../components/admin/ui/Panel";
import StatCard from "../../components/admin/ui/StatCard";
import DataTable from "../../components/admin/ui/DataTable";
import Pagination from "../../components/admin/ui/Pagination";
import Notice from "../../components/admin/ui/Notice";
import Badge from "../../components/ui/Badge";
import AjustarStockModal from "../../components/admin/inventory/AjustarStockModal";
import TransferirStockModal from "../../components/admin/inventory/TransferirStockModal";

const PAGE_SIZE = 10;

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

const iconAction =
  "flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted-foreground transition-colors hover:bg-brand-muted hover:text-brand-foreground";

const selectClass =
  "h-10 w-full rounded-lg border border-brand-border bg-brand-card px-3 text-sm text-brand-foreground focus:border-brand-primary focus:outline-none sm:min-w-[200px] sm:w-auto";

const columns = [
  { key: "nombre", label: "Producto" },
  { key: "categoria", label: "Categoría", render: (r) => r.categoria || "—" },
  {
    key: "cantidad",
    label: "Stock",
    render: (r) => (
      <span className={r.stock_bajo ? "font-bold text-brand-danger" : ""}>
        {r.cantidad}
      </span>
    ),
  },
  { key: "stock_minimo", label: "Mínimo" },
  {
    key: "estado",
    label: "Estado",
    render: (r) =>
      r.stock_bajo ? (
        <Badge variant="danger">Stock bajo</Badge>
      ) : (
        <Badge variant="success">OK</Badge>
      ),
  },
];

export default function Inventario() {
  const { data: branchesData, error: branchesError } = useFetch(
    ENDPOINTS.BRANCHES,
  );
  const activeBranches = toList(branchesData).filter((b) => b.activo);

  const [selectedBranch, setSelectedBranch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Si el admin aun no eligió, usamos la primera sucursal activa
  const branchId =
    selectedBranch || String(activeBranches[0]?.id_sucursal ?? "");
  const branch = activeBranches.find((b) => String(b.id_sucursal) === branchId);

  const query = branchId
    ? `${ENDPOINTS.INVENTORY}?id_sucursal=${branchId}${onlyLow ? "&low_stock=true" : ""}`
    : null;
  const { data, error, loading, refetch } = useFetch(query);

  const allRows = toList(data).map(normalize);
  const lowCount = allRows.filter((r) => r.stock_bajo).length;
  const totalUnits = allRows.reduce((sum, r) => sum + (r.cantidad ?? 0), 0);

  // Filtros en el cliente (por si el backend ignora low_stock) + búsqueda por nombre
  const term = search.trim().toLowerCase();
  const rows = allRows
    .filter((r) => !onlyLow || r.stock_bajo)
    .filter((r) => !term || r.nombre.toLowerCase().includes(term));

  // Paginación en el cliente
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const [adjusting, setAdjusting] = useState(null);
  const [transferring, setTransferring] = useState(null);
  const [notice, setNotice] = useState(null);

  const handleDone = (text) => {
    setAdjusting(null);
    setTransferring(null);
    setNotice({ type: "success", text });
    refetch();
  };

  const renderActions = (r) => (
    <>
      <button
        onClick={() => setAdjusting(r)}
        className={iconAction}
        aria-label={`Ajustar stock de ${r.nombre}`}
        title="Ajustar stock"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTransferring(r)}
        className={iconAction}
        aria-label={`Transferir stock de ${r.nombre}`}
        title="Transferir a otra sucursal"
      >
        <ArrowLeftRight className="h-4 w-4" />
      </button>
    </>
  );

  const fetchError = branchesError || error;

  return (
    <>
      <PageHeader
        eyebrow="Operaciones de farmacia"
        title="Inventario"
        subtitle="Controla el stock de cada sucursal, ajústalo o transfiérelo."
        actions={
          <ActionButton to="/admin/vencimientos">Ver vencimientos</ActionButton>
        }
      />

      {notice && (
        <Notice
          type={notice.type}
          onClose={() => setNotice(null)}
          className="mt-6"
        >
          {notice.text}
        </Notice>
      )}

      <Panel
        icon={Boxes}
        title="Espacio de inventario"
        subtitle={
          branch
            ? `Stock disponible en ${branch.nombre}.`
            : "Selecciona una sucursal para ver su stock."
        }
      >
        <div className="mb-6 grid gap-3 sm:gap-4 md:grid-cols-3">
          <StatCard
            label="Productos"
            value={loading ? "—" : `${allRows.length} en inventario`}
          />
          <StatCard
            label="Unidades"
            value={loading ? "—" : `${totalUnits} en stock`}
          />
          <StatCard
            label="Alertas"
            value={loading ? "—" : `${lowCount} con stock bajo`}
          />
        </div>

        {/* Filtros: siempre visibles, se apilan en celular */}
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-background p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
            Sucursal
            <select
              value={branchId}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              {activeBranches.length === 0 && (
                <option value="">Sin sucursales</option>
              )}
              {activeBranches.map((b) => (
                <option key={b.id_sucursal} value={b.id_sucursal}>
                  {b.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-brand-muted-foreground sm:min-w-[220px]">
            Buscar producto
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Nombre del producto..."
                className="h-10 w-full rounded-lg border border-brand-border bg-brand-card pl-9 pr-3 text-sm text-brand-foreground placeholder:text-brand-muted-foreground focus:border-brand-primary focus:outline-none"
              />
            </span>
          </label>

          <label className="flex h-10 items-center gap-2 text-sm font-medium text-brand-foreground">
            <input
              type="checkbox"
              checked={onlyLow}
              onChange={(e) => {
                setOnlyLow(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 accent-brand-primary"
            />
            Solo stock bajo
          </label>
        </div>

        {fetchError ? (
          <Notice type="error">
            No se pudo cargar el inventario: {fetchError}
            {error && (
              <button
                onClick={refetch}
                className="ml-2 font-semibold underline"
              >
                Reintentar
              </button>
            )}
          </Notice>
        ) : loading ? (
          <p className="py-10 text-center text-brand-muted-foreground">
            Cargando inventario…
          </p>
        ) : (
          <>
            {lowCount > 0 && !onlyLow && (
              <Notice type="warning" className="mb-4">
                {lowCount}{" "}
                {lowCount === 1 ? "producto está" : "productos están"} por
                debajo del stock mínimo en esta sucursal.
              </Notice>
            )}

            <DataTable
              columns={columns}
              rows={pageRows}
              rowKey="id_producto"
              renderActions={renderActions}
              empty={
                onlyLow || term
                  ? "No hay productos que coincidan con los filtros."
                  : "No hay productos en el inventario de esta sucursal."
              }
            />
            <Pagination
              page={currentPage}
              pages={pages}
              total={rows.length}
              onChange={setPage}
            />
          </>
        )}
      </Panel>

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
    </>
  );
}