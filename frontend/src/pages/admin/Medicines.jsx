import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Pencil, Settings, SlidersHorizontal, Trash2, X } from "lucide-react";
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

const PAGE_SIZE = 10;
const money = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 });

const iconAction =
  "flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted-foreground transition-colors hover:bg-brand-muted hover:text-brand-foreground";

const selectClass =
  "h-10 min-w-[160px] rounded-lg border border-brand-border bg-brand-card px-3 text-sm text-brand-foreground focus:border-brand-primary focus:outline-none";

// Valores de ProductSort del backend
const SORT_OPTIONS = [
  { value: "", label: "Nombre (A-Z)" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
  { value: "recientes", label: "Más recientes" },
];

const columns = [
  { key: "nombre", label: "Producto" },
  { key: "categoria", label: "Categoría", render: (p) => p.categoria ?? "—" },
  { key: "precio", label: "Precio", render: (p) => money.format(p.precio) },
  {
    key: "stock_total",
    label: "Stock",
    render: (p) =>
      p.stock_total === 0 ? <span className="font-semibold text-brand-danger">Agotado</span> : p.stock_total,
  },
  {
    key: "requiere_receta",
    label: "Receta",
    render: (p) =>
      p.requiere_receta ? (
        <span className="rounded-full bg-brand-warning-soft px-2.5 py-0.5 text-xs font-semibold text-brand-warning">
          Requiere receta
        </span>
      ) : (
        "No"
      ),
  },
];

export default function Medicines() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice ? { type: "success", text: location.state.notice } : null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (location.state?.notice) window.history.replaceState({}, "");
  }, [location.state]);

  // Filtros: viven en la URL (?q=...&categoria=...&receta=...&orden=...)
  const q = params.get("q") ?? "";
  const categoria = params.get("categoria") ?? "";
  const receta = params.get("receta") ?? "";
  const orden = params.get("orden") ?? "";
  const activeFilters = [q, categoria, receta, orden].filter(Boolean).length;

  // Si la búsqueda cambia desde el Topbar, vuelve a la primera página
  useEffect(() => {
    setPage(1);
  }, [q]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setPage(1);
  };

  const clearFilters = () => {
    setParams({}, { replace: true });
    setPage(1);
  };

  const listQuery = new URLSearchParams({ page, page_size: PAGE_SIZE });
  if (q) listQuery.set("q", q);
  if (categoria) listQuery.set("categoria", categoria);
  if (receta) listQuery.set("requiere_receta", receta);
  if (orden) listQuery.set("orden", orden);

  const list = useFetch(`${ENDPOINTS.PRODUCTS}?${listQuery}`);
  const all = useFetch(`${ENDPOINTS.PRODUCTS}?page_size=1`); // total sin filtros para la tarjeta
  const withRx = useFetch(`${ENDPOINTS.PRODUCTS}?requiere_receta=true&page_size=1`);
  const categories = useFetch(ENDPOINTS.CATEGORIES);

  const stat = (value, unit) => (value == null ? "—" : `${value} ${unit}`);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`${ENDPOINTS.PRODUCTS}/${toDelete.id_producto}`, { method: "DELETE" });
      setNotice({ type: "success", text: `"${toDelete.nombre}" se eliminó del catálogo` });
      if (list.data.items.length === 1 && page > 1) setPage(page - 1);
      else list.refetch();
      all.refetch();
      withRx.refetch();
      categories.refetch();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const renderActions = (p) => (
    <>
      <Link to={`/admin/productos/${p.id_producto}/editar`} className={iconAction} aria-label={`Editar ${p.nombre}`} title="Editar">
        <Pencil className="h-4 w-4" />
      </Link>
      <button onClick={() => setToDelete(p)} className={`${iconAction} hover:!text-brand-danger`} aria-label={`Eliminar ${p.nombre}`} title="Eliminar">
        <Trash2 className="h-4 w-4" />
      </button>
    </>
  );

  return (
    <>
      <PageHeader
        eyebrow="Operaciones de farmacia"
        title="Medicamentos"
        subtitle="Revisa y administra tu catálogo de medicamentos."
        actions={
          <>
            <ActionButton onClick={() => setShowFilters((s) => !s)}>
              <SlidersHorizontal className="mr-2 inline h-4 w-4" />
              Filtros{activeFilters > 0 && ` (${activeFilters})`}
            </ActionButton>
            <ActionButton>Ver reportes</ActionButton>
            <ActionButton to="/admin/productos/nuevo" variant="primary">+ Agregar producto</ActionButton>
          </>
        }
      />

      {notice && (
        <Notice type={notice.type} onClose={() => setNotice(null)} className="mt-6">
          {notice.text}
        </Notice>
      )}

      <Panel icon={Settings} title="Espacio de medicamentos" subtitle="Resumen operativo de tu catálogo.">
        <div className="mb-6 grid gap-3 sm:gap-4 md:grid-cols-3">
          <StatCard label="Catálogo" value={stat(all.data?.total, "productos activos")} />
          <StatCard label="Cobertura" value={stat(withRx.data?.total, "con receta")} />
          <StatCard label="Categorías" value={stat(categories.data?.length, "en total")} />
        </div>

        {showFilters && (
          <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-brand-border bg-brand-background p-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
              Categoría
              <select value={categoria} onChange={(e) => setFilter("categoria", e.target.value)} className={selectClass}>
                <option value="">Todas</option>
                {categories.data?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
              Receta
              <select value={receta} onChange={(e) => setFilter("receta", e.target.value)} className={selectClass}>
                <option value="">Todas</option>
                <option value="true">Requiere receta</option>
                <option value="false">Sin receta</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
              Ordenar por
              <select value={orden} onChange={(e) => setFilter("orden", e.target.value)} className={selectClass}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            {activeFilters > 0 && (
              <button onClick={clearFilters} className="flex h-10 items-center gap-1 text-sm font-semibold text-brand-primary hover:underline">
                <X className="h-4 w-4" /> Limpiar
              </button>
            )}
          </div>
        )}

        {q && (
          <p className="mb-4 text-sm text-brand-muted-foreground">
            Resultados para “{q}”
          </p>
        )}

        {list.error ? (
          <Notice type="error">
            No se pudieron cargar los productos: {list.error}
            <button onClick={list.refetch} className="ml-2 font-semibold underline">Reintentar</button>
          </Notice>
        ) : list.loading ? (
          <p className="py-10 text-center text-brand-muted-foreground">Cargando productos…</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={list.data.items}
              rowKey="id_producto"
              renderActions={renderActions}
              empty={
                activeFilters > 0
                  ? "No hay productos que coincidan con los filtros."
                  : "Aún no hay productos. Usa “+ Agregar producto” para crear el primero."
              }
            />
            <Pagination page={page} pages={list.data.pages} total={list.data.total} onChange={setPage} />
          </>
        )}
      </Panel>

      {toDelete && (
        <ConfirmDialog
          title="¿Eliminar producto?"
          message={`“${toDelete.nombre}” dejará de mostrarse en la tienda. El historial de ventas y compras se conserva.`}
          confirmLabel="Eliminar"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}