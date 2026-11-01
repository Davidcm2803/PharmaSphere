import { useState } from "react";
import { Pencil, PowerOff, Search, Truck } from "lucide-react";
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

const EMPTY_FORM = {
  nombre: "",
  contacto: "",
  telefono: "",
  correo: "",
  activo: "true",
};

const toList = (data) => (Array.isArray(data) ? data : (data?.items ?? []));

const iconAction =
  "flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted-foreground transition-colors hover:bg-brand-muted hover:text-brand-foreground";

const selectClass =
  "h-10 w-full rounded-lg border border-brand-border bg-brand-card px-3 text-sm text-brand-foreground focus:border-brand-primary focus:outline-none sm:w-auto sm:min-w-[160px]";

const columns = [
  { key: "nombre", label: "Nombre" },
  { key: "contacto", label: "Contacto", render: (r) => r.contacto || "—" },
  { key: "telefono", label: "Teléfono", render: (r) => r.telefono || "—" },
  { key: "correo", label: "Correo", render: (r) => r.correo || "—" },
  {
    key: "activo",
    label: "Estado",
    render: (r) => (
      <Badge variant={r.activo ? "success" : "neutral"}>
        {r.activo ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
];

export default function Proveedores() {
  const { data, error, loading, refetch } = useFetch(ENDPOINTS.SUPPLIERS);
  const suppliers = toList(data);

  // Filtros y paginación (en el cliente)
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [page, setPage] = useState(1);

  const activeCount = suppliers.filter((s) => s.activo).length;

  const term = search.trim().toLowerCase();
  const rows = suppliers
    .filter(
      (s) => status === "todos" || (status === "activos") === Boolean(s.activo),
    )
    .filter(
      (s) =>
        !term ||
        [s.nombre, s.contacto, s.correo, s.telefono].some((v) =>
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

  const openEdit = (supplier) => {
    setEditing(supplier);
    setForm({
      nombre: supplier.nombre ?? "",
      contacto: supplier.contacto ?? "",
      telefono: supplier.telefono ?? "",
      correo: supplier.correo ?? "",
      activo: String(supplier.activo),
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
      contacto: form.contacto.trim() || null,
      telefono: form.telefono.trim() || null,
      correo: form.correo.trim() || null,
    };
    if (editing) body.activo = form.activo === "true";

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`${ENDPOINTS.SUPPLIERS}/${editing.id_proveedor}`, {
          method: "PUT",
          body,
        });
        setNotice({ type: "success", text: "Proveedor actualizado correctamente." });
      } else {
        await apiFetch(ENDPOINTS.SUPPLIERS, { method: "POST", body });
        setNotice({ type: "success", text: "Proveedor creado correctamente." });
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
      await apiFetch(`${ENDPOINTS.SUPPLIERS}/${toDeactivate.id_proveedor}`, {
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
        eyebrow="Operaciones de farmacia"
        title="Proveedores"
        subtitle="Administra los proveedores que te surten mercadería."
        actions={
          <div className="flex w-full sm:w-auto">
            <ActionButton variant="primary" onClick={openCreate}>
              + Nuevo proveedor
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
        icon={Truck}
        title="Espacio de proveedores"
        subtitle="Resumen operativo de tus proveedores."
      >
        <div className="mb-6 grid gap-3 sm:gap-4 md:grid-cols-3">
          <StatCard
            label="Proveedores"
            value={loading ? "—" : `${suppliers.length} registrados`}
          />
          <StatCard
            label="Activos"
            value={loading ? "—" : `${activeCount} activos`}
          />
          <StatCard
            label="Inactivos"
            value={loading ? "—" : `${suppliers.length - activeCount} inactivos`}
          />
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-background p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-brand-muted-foreground sm:min-w-[220px]">
            Buscar proveedor
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Nombre, contacto o correo..."
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
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </label>
        </div>

        {error ? (
          <Notice type="error">
            No se pudieron cargar los proveedores: {error}
            <button onClick={refetch} className="ml-2 font-semibold underline">
              Reintentar
            </button>
          </Notice>
        ) : loading ? (
          <p className="py-10 text-center text-brand-muted-foreground">
            Cargando proveedores…
          </p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={pageRows}
              rowKey="id_proveedor"
              renderActions={renderActions}
              empty={
                hasFilters
                  ? "No hay proveedores que coincidan con los filtros."
                  : "Aún no hay proveedores. Usa “+ Nuevo proveedor” para crear el primero."
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
        title={editing ? "Editar proveedor" : "Nuevo proveedor"}
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
            id="contacto"
            label="Persona de contacto"
            value={form.contacto}
            onChange={setField("contacto")}
          />
          <Input
            id="telefono"
            label="Teléfono"
            value={form.telefono}
            onChange={setField("telefono")}
          />
          <Input
            id="correo"
            label="Correo"
            type="email"
            value={form.correo}
            onChange={setField("correo")}
          />
          {editing && (
            <Select
              id="activo"
              label="Estado"
              value={form.activo}
              onChange={setField("activo")}
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
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
          title="¿Desactivar proveedor?"
          message={`“${toDeactivate.nombre}” quedará inactivo. Podrás reactivarlo editándolo.`}
          confirmLabel="Desactivar"
          loading={deactivating}
          onConfirm={handleDeactivate}
          onCancel={() => setToDeactivate(null)}
        />
      )}
    </>
  );
}