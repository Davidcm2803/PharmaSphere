import { useState } from "react";
import { Pencil, PowerOff, Search, Store } from "lucide-react";
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
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";

const PAGE_SIZE = 10;

const EMPTY_FORM = { nombre: "", direccion: "", telefono: "", activo: "true" };

const toList = (data) => (Array.isArray(data) ? data : (data?.items ?? []));

const iconAction =
  "flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted-foreground transition-colors hover:bg-brand-muted hover:text-brand-foreground";

const selectClass =
  "h-10 w-full rounded-lg border border-brand-border bg-brand-card px-3 text-sm text-brand-foreground focus:border-brand-primary focus:outline-none sm:w-auto sm:min-w-[160px]";

const columns = [
  { key: "nombre", label: "Nombre" },
  { key: "direccion", label: "Dirección", render: (r) => r.direccion || "—" },
  { key: "telefono", label: "Teléfono", render: (r) => r.telefono || "—" },
  {
    key: "activo",
    label: "Estado",
    render: (r) => (
      <Badge variant={r.activo ? "success" : "neutral"}>
        {r.activo ? "Activa" : "Inactiva"}
      </Badge>
    ),
  },
];

export default function Sucursales() {
  const { data, error, loading, refetch } = useFetch(ENDPOINTS.BRANCHES);
  const branches = toList(data);

  // Filtros y paginación (en el cliente)
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [page, setPage] = useState(1);

  const activeCount = branches.filter((b) => b.activo).length;

  const term = search.trim().toLowerCase();
  const rows = branches
    .filter(
      (b) => status === "todos" || (status === "activas") === Boolean(b.activo),
    )
    .filter(
      (b) =>
        !term ||
        [b.nombre, b.direccion, b.telefono].some((v) =>
          v?.toLowerCase().includes(term),
        ),
    );

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const hasFilters = Boolean(term) || status !== "todos";

  // Formulario crear / editar
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = creando
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Desactivar
  const [toDeactivate, setToDeactivate] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const [notice, setNotice] = useState(null);

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (branch) => {
    setEditing(branch);
    setForm({
      nombre: branch.nombre ?? "",
      direccion: branch.direccion ?? "",
      telefono: branch.telefono ?? "",
      activo: String(branch.activo),
    });
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => setFormOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.nombre.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    const body = {
      nombre: form.nombre.trim(),
      direccion: form.direccion.trim() || null,
      telefono: form.telefono.trim() || null,
    };
    if (editing) body.activo = form.activo === "true";

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`${ENDPOINTS.BRANCHES}/${editing.id_sucursal}`, {
          method: "PUT",
          body,
        });
        setNotice({ type: "success", text: "Sucursal actualizada correctamente." });
      } else {
        await apiFetch(ENDPOINTS.BRANCHES, { method: "POST", body });
        setNotice({ type: "success", text: "Sucursal creada correctamente." });
      }
      setFormOpen(false);
      refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await apiFetch(`${ENDPOINTS.BRANCHES}/${toDeactivate.id_sucursal}`, {
        method: "DELETE",
      });
      setNotice({ type: "success", text: `"${toDeactivate.nombre}" se desactivó.` });
      refetch();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    } finally {
      setDeactivating(false);
      setToDeactivate(null);
    }
  };

  const renderActions = (r) => (
    <>
      <button
        onClick={() => openEdit(r)}
        className={iconAction}
        aria-label={`Editar ${r.nombre}`}
        title="Editar"
      >
        <Pencil className="h-4 w-4" />
      </button>
      {r.activo && (
        <button
          onClick={() => setToDeactivate(r)}
          className={`${iconAction} hover:!text-brand-danger`}
          aria-label={`Desactivar ${r.nombre}`}
          title="Desactivar"
        >
          <PowerOff className="h-4 w-4" />
        </button>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Sucursales"
        subtitle="Gestiona las sucursales de tu farmacia."
        actions={
          <div className="flex w-full sm:w-auto">
            <ActionButton variant="primary" onClick={openCreate}>
              + Nueva sucursal
            </ActionButton>
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
        icon={Store}
        title="Espacio de sucursales"
        subtitle="Resumen operativo de tus sucursales."
      >
        <div className="mb-6 grid gap-3 sm:gap-4 md:grid-cols-3">
          <StatCard
            label="Sucursales"
            value={loading ? "—" : `${branches.length} registradas`}
          />
          <StatCard
            label="Activas"
            value={loading ? "—" : `${activeCount} activas`}
          />
          <StatCard
            label="Inactivas"
            value={loading ? "—" : `${branches.length - activeCount} inactivas`}
          />
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-background p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-brand-muted-foreground sm:min-w-[220px]">
            Buscar sucursal
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Nombre, dirección o teléfono..."
                className="h-10 w-full rounded-lg border border-brand-border bg-brand-card pl-9 pr-3 text-sm text-brand-foreground placeholder:text-brand-muted-foreground focus:border-brand-primary focus:outline-none"
              />
            </span>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
            Estado
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="todos">Todas</option>
              <option value="activas">Activas</option>
              <option value="inactivas">Inactivas</option>
            </select>
          </label>
        </div>

        {error ? (
          <Notice type="error">
            No se pudieron cargar las sucursales: {error}
            <button onClick={refetch} className="ml-2 font-semibold underline">
              Reintentar
            </button>
          </Notice>
        ) : loading ? (
          <p className="py-10 text-center text-brand-muted-foreground">
            Cargando sucursales…
          </p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={pageRows}
              rowKey="id_sucursal"
              renderActions={renderActions}
              empty={
                hasFilters
                  ? "No hay sucursales que coincidan con los filtros."
                  : "Aún no hay sucursales. Usa “+ Nueva sucursal” para crear la primera."
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

      {/* Crear / editar */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Editar sucursal" : "Nueva sucursal"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && <Alert type="error">{formError}</Alert>}

          <Input
            id="nombre"
            label="Nombre"
            value={form.nombre}
            onChange={setField("nombre")}
            required
          />
          <Input
            id="direccion"
            label="Dirección"
            value={form.direccion}
            onChange={setField("direccion")}
          />
          <Input
            id="telefono"
            label="Teléfono"
            value={form.telefono}
            onChange={setField("telefono")}
          />
          {editing && (
            <Select
              id="activo"
              label="Estado"
              value={form.activo}
              onChange={setField("activo")}
            >
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </Select>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeForm}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      {toDeactivate && (
        <ConfirmDialog
          title="¿Desactivar sucursal?"
          message={`“${toDeactivate.nombre}” quedará inactiva. Podrás reactivarla editándola.`}
          confirmLabel="Desactivar"
          loading={deactivating}
          onConfirm={handleDeactivate}
          onCancel={() => setToDeactivate(null)}
        />
      )}
    </>
  );
}