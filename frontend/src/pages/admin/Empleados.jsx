import { useState } from "react";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import { ENDPOINTS, apiFetch } from "../../config/api";
import useApi from "../../hooks/useApi";

const EMPTY_FORM = { nombre: "", puesto: "", id_sucursal: "", activo: "true" };

const toList = (data) => (Array.isArray(data) ? data : (data?.items ?? []));

export default function Empleados() {
  const { data, error, loading, refetch } = useApi(ENDPOINTS.EMPLOYEES);
  const { data: branchesData } = useApi(ENDPOINTS.BRANCHES);

  const employees = toList(data);
  const branches = toList(branchesData);

  // id_sucursal -> nombre, para mostrarlo en la tabla
  const branchNames = Object.fromEntries(
    branches.map((b) => [b.id_sucursal, b.nombre]),
  );
  const branchLabel = (emp) =>
    emp.sucursal_nombre ?? branchNames[emp.id_sucursal] ?? "—";

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = creando
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [toDeactivate, setToDeactivate] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");

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
        setMessage("Empleado actualizado correctamente.");
      } else {
        await apiFetch(ENDPOINTS.EMPLOYEES, { method: "POST", body });
        setMessage("Empleado creado correctamente.");
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
    setActionError("");
    try {
      await apiFetch(`${ENDPOINTS.EMPLOYEES}/${toDeactivate.id_empleado}`, {
        method: "DELETE",
      });
      setMessage("Empleado desactivado.");
      setToDeactivate(null);
      refetch();
    } catch (err) {
      setMessage("");
      setToDeactivate(null);
      setActionError(err.message);
    } finally {
      setDeactivating(false);
    }
  };

  const columns = [
    { key: "nombre", header: "Nombre" },
    { key: "puesto", header: "Puesto", render: (r) => r.puesto || "—" },
    { key: "sucursal", header: "Sucursal", render: (r) => branchLabel(r) },
    {
      key: "activo",
      header: "Estado",
      render: (r) => (
        <Badge variant={r.activo ? "success" : "neutral"}>
          {r.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (r) => (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openEdit(r)}>
            Editar
          </Button>
          {r.activo && (
            <Button variant="danger" onClick={() => setToDeactivate(r)}>
              Desactivar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Empleados</h1>
        <Button onClick={openCreate}>Nuevo empleado</Button>
      </div>

      {message && <Alert type="success">{message}</Alert>}
      {(error || actionError) && (
        <Alert type="error">{error || actionError}</Alert>
      )}

      <Table
        columns={columns}
        rows={employees}
        rowKey="id_empleado"
        loading={loading}
        emptyMessage="No hay empleados registrados"
      />

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

      {/* Confirmar desactivación */}
      <Modal
        open={Boolean(toDeactivate)}
        onClose={() => setToDeactivate(null)}
        title="Desactivar empleado"
      >
        <p className="mb-4 text-sm text-brand-foreground">
          ¿Seguro que quieres desactivar a{" "}
          <strong>{toDeactivate?.nombre}</strong>? Podrás reactivarlo
          editándolo.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setToDeactivate(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={deactivating}
            onClick={handleDeactivate}
          >
            Desactivar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
