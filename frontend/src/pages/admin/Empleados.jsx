import { useState } from "react";
import { Pencil, PowerOff, Search, UserCog } from "lucide-react";
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

const EMPTY_FORM = { nombre: "", puesto: "", id_sucursal: "", activo: "true" };

const toList = (data) => (Array.isArray(data) ? data : (data?.items ?? []));

const iconAction =
  "flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted-foreground transition-colors hover:bg-brand-muted hover:text-brand-foreground";

const selectClass =
  "h-10 w-full rounded-lg border border-brand-border bg-brand-card px-3 text-sm text-brand-foreground focus:border-brand-primary focus:outline-none sm:w-auto sm:min-w-[160px]";

export default function Empleados() {
  const { data, error, loading, refetch } = useFetch(ENDPOINTS.EMPLOYEES);
  const { data: branchesData } = useFetch(ENDPOINTS.BRANCHES);

  const employees = toList(data);
  const branches = toList(branchesData);

  // id_sucursal -> nombre, para mostrarlo en la tabla
  const branchNames = Object.fromEntries(
    branches.map((b) => [b.id_sucursal, b.nombre]),
  );
  const branchLabel = (emp) =>
    emp.sucursal_nombre ?? branchNames[emp.id_sucursal] ?? "—";

  // Filtros y paginación (en el cliente)
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [branchFilter, setBranchFilter] = useState("");
  const [page, setPage] = useState(1);

  const activeCount = employees.filter((e) => e.activo).length;

  const term = search.trim().toLowerCase();
  const rows = employees
    .filter(
      (e) => status === "todos" || (status === "activos") === Boolean(e.activo),
    )
    .filter(
      (e) => !branchFilter || String(e.id_sucursal) === branchFilter,
    )
    .filter(
      (e) =>
        !term ||
        [e.nombre, e.puesto].some((v) => v?.toLowerCase().includes(term)),
    );

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const hasFilters = Boolean(term) || status !== "todos" || Boolean(branchFilter);

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

  const openEdit = (emp) => {
    setEditing(emp);
    setForm({
      nombre: emp.nombre ?? "",
      puesto: emp.puesto ?? "",
      id_sucursal: emp.id_sucursal ? String(emp.id_sucursal) : "",
      activo: String(emp.activo),
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
    if (!form.id_sucursal) {
      setFormError("Selecciona la sucursal del empleado.");
      return;
    }

    const body = {
      nombre: form.nombre.trim(),
      puesto: form.puesto.trim() || null,
      id_sucursal: Number(form.id_sucursal),
    };
    if (editing) body.activo = form.activo === "true";

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`${ENDPOINTS.EMPLOYEES}/${editing.id_empleado}`, {
          method: "PUT",
          body,
        });
        setNotice({ type: "success", text: "Empleado actualizado correctamente." });
      } else {
        await apiFetch(ENDPOINTS.EMPLOYEES, { method: "POST", body });
        setNotice({ type: "success", text: "Empleado creado correctamente." });
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
      await apiFetch(`${ENDPOINTS.EMPLOYEES}/${toDeactivate.id_empleado}`, {
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

  const columns = [
    { key: "nombre", label: "Nombre" },
    { key: "puesto", label: "Puesto", render: (r) => r.puesto || "—" },
    { key: "sucursal", label: "Sucursal", render: (r) => branchLabel(r) },
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
        title="Empleados"
        subtitle="Gestiona el equipo de trabajo de cada sucursal."
        actions={
          <div className="flex w-full sm:w-auto">
            <ActionButton variant="primary" onClick={openCreate}>
              + Nuevo empleado
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
        icon={UserCog}
        title="Espacio de empleados"
        subtitle="Resumen operativo de tu equipo."
      >
        <div className="mb-6 grid gap-3 sm:gap-4 md:grid-cols-3">
          <StatCard
            label="Empleados"
            value={loading ? "—" : `${employees.length} registrados`}
          />
          <StatCard
            label="Activos"
            value={loading ? "—" : `${activeCount} activos`}
          />
          <StatCard
            label="Inactivos"
            value={loading ? "—" : `${employees.length - activeCount} inactivos`}
          />
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-background p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-brand-muted-foreground sm:min-w-[220px]">
            Buscar empleado
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Nombre o puesto..."
                className="h-10 w-full rounded-lg border border-brand-border bg-brand-card pl-9 pr-3 text-sm text-brand-foreground placeholder:text-brand-muted-foreground focus:border-brand-primary focus:outline-none"
              />
            </span>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
            Sucursal
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="">Todas</option>
              {branches.map((b) => (
                <option key={b.id_sucursal} value={b.id_sucursal}>
                  {b.nombre}
                </option>
              ))}
            </select>
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
            No se pudieron cargar los empleados: {error}
            <button onClick={refetch} className="ml-2 font-semibold underline">
              Reintentar
            </button>
          </Notice>
        ) : loading ? (
          <p className="py-10 text-center text-brand-muted-foreground">
            Cargando empleados…
          </p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={pageRows}
              rowKey="id_empleado"
              renderActions={renderActions}
              empty={
                hasFilters
                  ? "No hay empleados que coincidan con los filtros."
                  : "Aún no hay empleados. Usa “+ Nuevo empleado” para crear el primero."
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
        title={editing ? "Editar empleado" : "Nuevo empleado"}
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
            id="puesto"
            label="Puesto"
            value={form.puesto}
            onChange={setField("puesto")}
            placeholder="Ej. Farmacéutico, Cajero"
          />
          <Select
            id="id_sucursal"
            label="Sucursal"
            value={form.id_sucursal}
            onChange={setField("id_sucursal")}
            required
          >
            <option value="">Selecciona una sucursal</option>
            {branches.map((b) => (
              <option key={b.id_sucursal} value={b.id_sucursal}>
                {b.nombre}
                {b.activo ? "" : " (inactiva)"}
              </option>
            ))}
          </Select>
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
          title="¿Desactivar empleado?"
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