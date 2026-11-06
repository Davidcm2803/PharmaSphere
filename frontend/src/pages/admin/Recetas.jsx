import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardList, Lock, Pencil, Search, X } from "lucide-react";
import { useRecipes, useRxProducts } from "../../hooks/useRecipes";
import { formatDate } from "../../lib/query";
import PageHeader from "../../components/admin/ui/PageHeader";
import ActionButton from "../../components/admin/ui/ActionButton";
import Panel from "../../components/admin/ui/Panel";
import StatCard from "../../components/admin/ui/StatCard";
import DataTable from "../../components/admin/ui/DataTable";
import Pagination from "../../components/admin/ui/Pagination";
import Notice from "../../components/admin/ui/Notice";
import Badge from "../../components/ui/Badge";
import RecetaModal from "../../components/admin/recipes/RecetaModal";

const PAGE_SIZE = 10;

const iconAction =
  "flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted-foreground transition-colors hover:bg-brand-muted hover:text-brand-foreground disabled:pointer-events-none disabled:opacity-40";

const fieldClass =
  "h-10 w-full rounded-lg border border-brand-border bg-brand-card px-3 text-sm text-brand-foreground focus:border-brand-primary focus:outline-none sm:w-auto sm:min-w-[170px]";

const ESTADO_BADGE = {
  vigente: ["success", "Vigente"],
  vencida: ["danger", "Vencida"],
  usada: ["neutral", "Usada"],
};

export default function Recetas() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState(null);
  // `null` = cerrado, `{}` = crear, receta = editar
  const [editing, setEditing] = useState(null);

  // Filtros en la URL (?cedula&estado&id_producto)
  const cedula = params.get("cedula") ?? "";
  const estado = params.get("estado") ?? "";
  const idProducto = params.get("id_producto") ?? "";
  const activeFilters = [cedula, estado, idProducto].filter(Boolean).length;
  const [draftCedula, setDraftCedula] = useState(cedula);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setPage(1);
  };

  const clearFilters = () => {
    setParams({}, { replace: true });
    setDraftCedula("");
    setPage(1);
  };

  const list = useRecipes({ page, page_size: PAGE_SIZE, cedula, estado, id_producto: idProducto });
  const rxProducts = useRxProducts();
  const items = list.data?.items ?? [];
  const ready = !list.loading && !list.error;

  const columns = [
    { key: "cliente_nombre", label: "Cliente", render: (r) => r.cliente_nombre },
    { key: "cliente_cedula", label: "Cédula", render: (r) => r.cliente_cedula ?? "—" },
    { key: "producto_nombre", label: "Producto" },
    { key: "cantidad", label: "Cant." },
    { key: "medico", label: "Médico", render: (r) => r.medico ?? "—" },
    { key: "vigencia_hasta", label: "Vigencia", render: (r) => formatDate(r.vigencia_hasta) },
    {
      key: "estado",
      label: "Estado",
      render: (r) => {
        const [variant, label] = ESTADO_BADGE[r.estado] ?? ["neutral", r.estado];
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      key: "id_venta",
      label: "Venta",
      render: (r) =>
        r.id_venta ? (
          <Link to={`/admin/ventas/${r.id_venta}`} className="font-semibold text-brand-primary hover:underline">
            #{r.id_venta}
          </Link>
        ) : (
          "—"
        ),
    },
  ];

  const handleSaved = (_recipe, isEdit) => {
    setEditing(null);
    setNotice({ type: "success", text: isEdit ? "Receta actualizada correctamente" : "Receta registrada correctamente" });
    list.refetch();
  };

  return (
    <>
      <PageHeader
        eyebrow="Operaciones de farmacia"
        title="Recetas"
        subtitle="Registra y consulta las recetas médicas de los clientes."
        actions={
          <ActionButton variant="primary" onClick={() => setEditing({})}>
            + Registrar receta
          </ActionButton>
        }
      />

      {notice && (
        <Notice type={notice.type} onClose={() => setNotice(null)} className="mt-6">
          {notice.text}
        </Notice>
      )}

      <Panel icon={ClipboardList} title="Espacio de recetas" subtitle="Valida qué recetas están vigentes antes de vender.">
        <div className="mb-6 grid gap-3 sm:gap-4 md:grid-cols-3">
          <StatCard label="Resultados" value={ready ? `${list.data.total} recetas` : "—"} />
          <StatCard label="Vigentes (página)" value={ready ? `${items.filter((r) => r.estado === "vigente").length} de ${items.length}` : "—"} />
          <StatCard label="Usadas (página)" value={ready ? `${items.filter((r) => r.estado === "usada").length} de ${items.length}` : "—"} />
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-background p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <form
            className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground"
            onSubmit={(e) => {
              e.preventDefault();
              setFilter("cedula", draftCedula.trim());
            }}
          >
            <label htmlFor="rec-filtro-cedula">Cédula del cliente</label>
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted-foreground" />
              <input
                id="rec-filtro-cedula"
                type="search"
                value={draftCedula}
                onChange={(e) => setDraftCedula(e.target.value)}
                onBlur={() => draftCedula.trim() !== cedula && setFilter("cedula", draftCedula.trim())}
                placeholder="1-1111-1111"
                className="h-10 w-full rounded-lg border border-brand-border bg-brand-card pl-9 pr-3 text-sm text-brand-foreground placeholder:text-brand-muted-foreground focus:border-brand-primary focus:outline-none sm:w-56"
              />
            </span>
          </form>

          <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
            Estado
            <select value={estado} onChange={(e) => setFilter("estado", e.target.value)} className={fieldClass}>
              <option value="">Todos</option>
              <option value="vigente">Vigente</option>
              <option value="vencida">Vencida</option>
              <option value="usada">Usada</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
            Producto
            <select value={idProducto} onChange={(e) => setFilter("id_producto", e.target.value)} className={fieldClass}>
              <option value="">Todos</option>
              {(rxProducts.data?.items ?? []).map((p) => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>

          {activeFilters > 0 && (
            <button onClick={clearFilters} className="flex h-10 items-center justify-center gap-1 text-sm font-semibold text-brand-primary hover:underline sm:justify-start">
              <X className="h-4 w-4" /> Limpiar
            </button>
          )}
        </div>

        {list.error ? (
          <Notice type="error">
            No se pudieron cargar las recetas: {list.error}
            <button onClick={list.refetch} className="ml-2 font-semibold underline">Reintentar</button>
          </Notice>
        ) : list.loading ? (
          <p className="py-10 text-center text-brand-muted-foreground">Cargando recetas…</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={items}
              rowKey="id_receta"
              renderActions={(r) =>
                r.estado === "usada" ? (
                  <span className={iconAction} title="Una receta usada no se puede editar" aria-label="Receta usada: no editable">
                    <Lock className="h-4 w-4" />
                  </span>
                ) : (
                  <button onClick={() => setEditing(r)} className={iconAction} aria-label={`Editar receta ${r.id_receta}`} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </button>
                )
              }
              empty={activeFilters > 0 ? "No hay recetas que coincidan con los filtros." : "Aún no hay recetas registradas."}
            />
            <Pagination page={page} pages={list.data.pages} total={list.data.total} onChange={setPage} />
          </>
        )}
      </Panel>

      {editing && (
        <RecetaModal
          recipe={editing.id_receta ? editing : undefined}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}