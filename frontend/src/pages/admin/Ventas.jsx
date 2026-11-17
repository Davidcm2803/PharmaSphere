import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChartColumn, Eye, X } from "lucide-react";
import { useSalesList } from "../../hooks/useAdminSales";
import { useBranchOptions } from "../../hooks/useBranches";
import { formatPrice } from "../../lib/format";
import { formatDateTime } from "../../lib/query";
import PageHeader from "../../components/admin/ui/PageHeader";
import ActionButton from "../../components/admin/ui/ActionButton";
import Panel from "../../components/admin/ui/Panel";
import StatCard from "../../components/admin/ui/StatCard";
import DataTable from "../../components/admin/ui/DataTable";
import Pagination from "../../components/admin/ui/Pagination";
import Notice from "../../components/admin/ui/Notice";
import Badge from "../../components/ui/Badge";

const PAGE_SIZE = 10;

const iconAction =
  "flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted-foreground transition-colors hover:bg-brand-muted hover:text-brand-foreground";

const fieldClass =
  "h-10 w-full rounded-lg border border-brand-border bg-brand-card px-3 text-sm text-brand-foreground focus:border-brand-primary focus:outline-none sm:w-auto sm:min-w-[150px]";

const ESTADO_BADGE = {
  pendiente: ["warning", "Pendiente"],
  pagada: ["success", "Pagada"],
  retirada: ["neutral", "Retirada"],
  cancelada: ["danger", "Cancelada"],
};

const TIPO_BADGE = {
  online: ["neutral", "Online"],
  mostrador: ["success", "Mostrador"],
};

const columns = [
  { key: "fecha", label: "Fecha", render: (v) => formatDateTime(v.fecha) },
  {
    key: "id_venta",
    label: "# Venta",
    render: (v) => (
      <Link to={`/admin/ventas/${v.id_venta}`} className="font-semibold text-brand-primary hover:underline">
        #{v.id_venta}
      </Link>
    ),
  },
  {
    key: "tipo",
    label: "Tipo",
    render: (v) => {
      const [variant, label] = TIPO_BADGE[v.tipo] ?? ["neutral", v.tipo];
      return <Badge variant={variant}>{label}</Badge>;
    },
  },
  { key: "cliente", label: "Cliente", render: (v) => v.cliente_nombre ?? "Mostrador" },
  { key: "sucursal_nombre", label: "Sucursal" },
  {
    key: "estado",
    label: "Estado",
    render: (v) => {
      const [variant, label] = ESTADO_BADGE[v.estado] ?? ["neutral", v.estado];
      return <Badge variant={variant}>{label}</Badge>;
    },
  },
  { key: "total", label: "Total", render: (v) => <span className="font-semibold">{formatPrice(v.total)}</span> },
];

export default function Ventas() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState(null);

  // Filtros: viven en la URL (?desde&hasta&id_sucursal&tipo&estado)
  const desde = params.get("desde") ?? "";
  const hasta = params.get("hasta") ?? "";
  const idSucursal = params.get("id_sucursal") ?? "";
  const tipo = params.get("tipo") ?? "";
  const estado = params.get("estado") ?? "";
  const activeFilters = [desde, hasta, idSucursal, tipo, estado].filter(Boolean).length;
  const invalidRange = Boolean(desde && hasta && desde > hasta);

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

  const branches = useBranchOptions();
  const list = useSalesList({
    page,
    page_size: PAGE_SIZE,
    desde,
    hasta,
    id_sucursal: idSucursal,
    tipo,
    estado,
  });

  const items = list.data?.items ?? [];
  const pageTotal = items.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
  const online = items.filter((v) => v.tipo === "online").length;
  const counter = items.filter((v) => v.tipo === "mostrador").length;
  const ready = !list.loading && !list.error;

  return (
    <>
      <PageHeader
        eyebrow="Operaciones de farmacia"
        title="Ventas"
        subtitle="Consulta las ventas online y de mostrador."
        actions={
          <ActionButton to="/admin/punto-de-venta" variant="primary">
            + Nueva venta
          </ActionButton>
        }
      />

      {notice && (
        <Notice type={notice.type} onClose={() => setNotice(null)} className="mt-6">
          {notice.text}
        </Notice>
      )}

      <Panel icon={ChartColumn} title="Espacio de ventas" subtitle="Resumen de la página que estás viendo.">
        <div className="mb-6 grid gap-3 sm:gap-4 md:grid-cols-3">
          <StatCard label="Ventas de la página" value={ready ? `${items.length} ventas` : "—"} />
          <StatCard label="Total de la página" value={ready ? formatPrice(pageTotal) : "—"} />
          <StatCard label="Online / Mostrador" value={ready ? `${online} / ${counter}` : "—"} />
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-background p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
            Desde
            <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setFilter("desde", e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
            Hasta
            <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setFilter("hasta", e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
            Sucursal
            <select value={idSucursal} onChange={(e) => setFilter("id_sucursal", e.target.value)} className={fieldClass}>
              <option value="">Todas</option>
              {(branches.data ?? []).map((b) => (
                <option key={b.id_sucursal} value={b.id_sucursal}>
                  {b.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
            Tipo
            <select value={tipo} onChange={(e) => setFilter("tipo", e.target.value)} className={fieldClass}>
              <option value="">Todos</option>
              <option value="mostrador">Mostrador</option>
              <option value="online">Online</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
            Estado
            <select value={estado} onChange={(e) => setFilter("estado", e.target.value)} className={fieldClass}>
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagada">Pagada</option>
              <option value="retirada">Retirada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </label>
          {activeFilters > 0 && (
            <button onClick={clearFilters} className="flex h-10 items-center justify-center gap-1 text-sm font-semibold text-brand-primary hover:underline sm:justify-start">
              <X className="h-4 w-4" /> Limpiar
            </button>
          )}
        </div>

        {invalidRange && (
          <Notice type="error" className="mb-4">
            La fecha “Desde” no puede ser posterior a “Hasta”.
          </Notice>
        )}

        {list.error ? (
          <Notice type="error">
            No se pudieron cargar las ventas: {list.error}
            <button onClick={list.refetch} className="ml-2 font-semibold underline">Reintentar</button>
          </Notice>
        ) : list.loading ? (
          <p className="py-10 text-center text-brand-muted-foreground">Cargando ventas…</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={items}
              rowKey="id_venta"
              onRowClick={(v) => navigate(`/admin/ventas/${v.id_venta}`)}
              renderActions={(v) => (
                <Link to={`/admin/ventas/${v.id_venta}`} className={iconAction} aria-label={`Ver venta ${v.id_venta}`} title="Ver detalle">
                  <Eye className="h-4 w-4" />
                </Link>
              )}
              empty={
                activeFilters > 0
                  ? "No hay ventas que coincidan con los filtros."
                  : "Aún no hay ventas registradas."
              }
            />
            <Pagination page={page} pages={list.data.pages} total={list.data.total} onChange={setPage} />
          </>
        )}
      </Panel>
    </>
  );
}