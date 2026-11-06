import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Search, Users } from "lucide-react";
import { useCustomers } from "../../hooks/useCustomersAdmin";
import { formatDate } from "../../lib/query";
import PageHeader from "../../components/admin/ui/PageHeader";
import ActionButton from "../../components/admin/ui/ActionButton";
import Panel from "../../components/admin/ui/Panel";
import StatCard from "../../components/admin/ui/StatCard";
import DataTable from "../../components/admin/ui/DataTable";
import Pagination from "../../components/admin/ui/Pagination";
import Notice from "../../components/admin/ui/Notice";
import ClienteModal from "../../components/admin/customers/ClienteModal";

const PAGE_SIZE = 10;

const iconAction =
  "flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted-foreground transition-colors hover:bg-brand-muted hover:text-brand-foreground";

const columns = [
  { key: "nombre", label: "Nombre" },
  { key: "cedula", label: "Cédula", render: (c) => c.cedula ?? "—" },
  { key: "telefono", label: "Teléfono", render: (c) => c.telefono ?? "—" },
  { key: "correo", label: "Correo", render: (c) => c.correo ?? "—" },
  { key: "created_at", label: "Registro", render: (c) => formatDate(c.created_at) },
];

export default function Clientes() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState(null);
  // `null` = cerrado, `{}` = crear, cliente = editar
  const [editing, setEditing] = useState(null);

  // El buscador vive en la URL (?q=...); el input se aplica al enviar
  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);

  const applySearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (draft.trim()) next.set("q", draft.trim());
    else next.delete("q");
    setParams(next, { replace: true });
    setPage(1);
  };

  const list = useCustomers({ page, page_size: PAGE_SIZE, q });
  const ready = !list.loading && !list.error;
  const items = list.data?.items ?? [];

  const handleSaved = (customer, isEdit) => {
    setEditing(null);
    setNotice({
      type: "success",
      text: isEdit ? `Se actualizó a “${customer.nombre}”` : `Se registró a “${customer.nombre}”`,
    });
    list.refetch();
  };

  return (
    <>
      <PageHeader
        eyebrow="Operaciones de farmacia"
        title="Clientes"
        subtitle="Consulta y administra los clientes de la farmacia."
        actions={
          <ActionButton variant="primary" onClick={() => setEditing({})}>
            + Registrar cliente
          </ActionButton>
        }
      />

      {notice && (
        <Notice type={notice.type} onClose={() => setNotice(null)} className="mt-6">
          {notice.text}
        </Notice>
      )}

      <Panel icon={Users} title="Espacio de clientes" subtitle="Busca por nombre, cédula o correo.">
        <div className="mb-6 grid gap-3 sm:gap-4 md:grid-cols-3">
          <StatCard label="Resultados" value={ready ? `${list.data.total} clientes` : "—"} />
          <StatCard label="Con cédula (página)" value={ready ? `${items.filter((c) => c.cedula).length} de ${items.length}` : "—"} />
          <StatCard label="Con correo (página)" value={ready ? `${items.filter((c) => c.correo).length} de ${items.length}` : "—"} />
        </div>

        <form
          onSubmit={applySearch}
          className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-background p-4 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
            Buscar cliente
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted-foreground" />
              <input
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Nombre, cédula o correo..."
                className="h-10 w-full rounded-lg border border-brand-border bg-brand-card pl-9 pr-3 text-sm text-brand-foreground placeholder:text-brand-muted-foreground focus:border-brand-primary focus:outline-none"
              />
            </span>
          </label>
          <ActionButton type="submit" variant="primary" className="sm:flex-none">
            Buscar
          </ActionButton>
        </form>

        {q && <p className="mb-4 text-sm text-brand-muted-foreground">Resultados para “{q}”</p>}

        {list.error ? (
          <Notice type="error">
            No se pudieron cargar los clientes: {list.error}
            <button onClick={list.refetch} className="ml-2 font-semibold underline">Reintentar</button>
          </Notice>
        ) : list.loading ? (
          <p className="py-10 text-center text-brand-muted-foreground">Cargando clientes…</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={items}
              rowKey="id_cliente"
              renderActions={(c) => (
                <button onClick={() => setEditing(c)} className={iconAction} aria-label={`Editar ${c.nombre}`} title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              empty={q ? "No hay clientes que coincidan con la búsqueda." : "Aún no hay clientes. Usa “+ Registrar cliente” para crear el primero."}
            />
            <Pagination page={page} pages={list.data.pages} total={list.data.total} onChange={setPage} />
          </>
        )}
      </Panel>

      {editing && (
        <ClienteModal
          customer={editing.id_cliente ? editing : undefined}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}