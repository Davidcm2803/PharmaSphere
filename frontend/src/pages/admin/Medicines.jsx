import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Pencil, Settings, Trash2 } from "lucide-react";
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
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState(location.state?.notice ? { type: "success", text: location.state.notice } : null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (location.state?.notice) window.history.replaceState({}, "");
  }, [location.state]);

  const list = useFetch(`${ENDPOINTS.PRODUCTS}?page=${page}&page_size=${PAGE_SIZE}`);
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
          <StatCard label="Catálogo" value={stat(list.data?.total, "productos activos")} />
          <StatCard label="Cobertura" value={stat(withRx.data?.total, "con receta")} />
          <StatCard label="Categorías" value={stat(categories.data?.length, "en total")} />
        </div>

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
              empty="Aún no hay productos. Usa “+ Agregar producto” para crear el primero."
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