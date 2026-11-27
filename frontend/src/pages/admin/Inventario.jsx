import { useEffect, useState } from "react";
import { Boxes, Search, Trash2 } from "lucide-react";
import useFetch from "../../hooks/useFetch";
import { ENDPOINTS, apiFetch } from "../../config/api";
import PageHeader from "../../components/admin/ui/PageHeader";
import ActionButton from "../../components/admin/ui/ActionButton";
import Panel from "../../components/admin/ui/Panel";
import StatCard from "../../components/admin/ui/StatCard";
import DataTable from "../../components/admin/ui/DataTable";
import Pagination from "../../components/admin/ui/Pagination";
import Notice from "../../components/admin/ui/Notice";
import ConfirmDialog from "../../components/admin/ui/ConfirmDialog";
import Badge from "../../components/ui/Badge";
import AjustarStockModal from "../../components/admin/inventory/AjustarStockModal";
import TransferirStockModal from "../../components/admin/inventory/TransferirStockModal";
import AgregarInventarioModal from "../../components/admin/inventory/AgregarInventarioModal";
import LotesModal from "../../components/admin/inventory/LotesModal";
import { daysUntil, expiryStatus, fmtDate } from "../../lib/expiry";

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
  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-brand-border bg-brand-card text-brand-muted-foreground transition-colors hover:border-brand-danger hover:bg-brand-muted hover:text-brand-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary";

const textAction =
  "h-8 cursor-pointer rounded-lg border border-brand-border bg-brand-card px-3 text-xs font-semibold text-brand-foreground transition-colors hover:border-brand-primary hover:bg-brand-muted hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary";

const primaryAction =
  "h-8 cursor-pointer rounded-lg bg-brand-primary px-3 text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2";

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
  {
    key: "lotes_con_stock",
    label: "Lotes",
    render: (r) => r.lotes_con_stock ?? 0,
  },
  { key: "stock_minimo", label: "Mínimo" },
  {
    key: "proximo_vencimiento",
    label: "Próx. vencimiento",
    render: (r) => {
      if (!r.proximo_vencimiento) return "—";
      const { variant, label } = expiryStatus(daysUntil(r.proximo_vencimiento));
      return (
        <span className="flex flex-wrap items-center gap-2">
          <span>{fmtDate(r.proximo_vencimiento)}</span>
          <Badge variant={variant}>{label}</Badge>
        </span>
      );
    },
  },
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
  const [adding, setAdding] = useState(false);
  const [lotes, setLotes] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (notice) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [notice]);

  const handleDone = (text) => {
    setAdjusting(null);
    setTransferring(null);
    setAdding(false);
    setNotice({ type: "success", text });
    refetch();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`${ENDPOINTS.INVENTORY}/${toDelete.id_inventario}`, {
        method: "DELETE",
      });
      setNotice({
        type: "success",
        text: `"${toDelete.nombre}" se quitó del inventario de ${branch?.nombre}`,
      });
      refetch();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const requestDelete = (r) => {
    if (r.cantidad > 0) {
      setNotice({
        type: "warning",
        text: `"${r.nombre}" tiene ${r.cantidad} ${r.cantidad === 1 ? "unidad" : "unidades"} en stock. Primero se debe vender, transferir o dar de baja para quitarlo del inventario.`,
      });
      return;
    }
    setToDelete(r);
  };

  const renderActions = (r) => (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <button
        onClick={() => setLotes({ item: r, startAdding: true })}
        className={primaryAction}
      >
        Ingresar stock
      </button>
      <button
        onClick={() => setLotes({ item: r, startAdding: false })}
        className={textAction}
      >
        Lotes
      </button>
      <button onClick={() => setAdjusting(r)} className={textAction}>
        Mínimo
      </button>
      <button onClick={() => setTransferring(r)} className={textAction}>
        Transferir
      </button>
      <button
        onClick={() => requestDelete(r)}
        className={iconAction}
        aria-label={`Quitar ${r.nombre} del inventario`}
        title="Quitar del inventario"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  const fetchError = branchesError || error;

  return (
    <>
      <PageHeader
        eyebrow="Operaciones de farmacia"
        title="Inventario"
        subtitle="Stock por sucursal. Cada ingreso se registra como un lote con su fecha de vencimiento."
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3">
            <ActionButton to="/admin/vencimientos">
              Ver vencimientos
            </ActionButton>
            {branchId && (
              <ActionButton variant="primary" onClick={() => setAdding(true)}>
                + Agregar al inventario
              </ActionButton>
            )}
          </div>
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
                  : "No hay productos en el inventario de esta sucursal. Usa “+ Agregar al inventario”."
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

      {toDelete && (
        <ConfirmDialog
          title="¿Quitar del inventario?"
          message={`“${toDelete.nombre}” dejará de aparecer en el inventario de ${branch?.nombre}. Solo es posible si su stock es 0. El historial de movimientos se conserva.`}
          confirmLabel="Quitar"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}

      {lotes && (
        <LotesModal
          item={lotes.item}
          startAdding={lotes.startAdding}
          branchId={branchId}
          branchName={branch?.nombre}
          onClose={() => setLotes(null)}
          onChanged={refetch}
        />
      )}

      {adding && (
        <AgregarInventarioModal
          branchId={branchId}
          branchName={branch?.nombre}
          onClose={() => setAdding(false)}
          onDone={handleDone}
        />
      )}

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