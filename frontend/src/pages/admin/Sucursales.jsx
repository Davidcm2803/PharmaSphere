import { useState } from "react";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import { ENDPOINTS, apiFetch } from "../../config/api";
import useFetch from "../../hooks/useFetch";

const EMPTY_FORM = { nombre: "", direccion: "", telefono: "", activo: "true" };

export default function Sucursales() {
  const { data, error, loading, refetch } = useFetch(ENDPOINTS.BRANCHES);
  const branches = Array.isArray(data) ? data : (data?.items ?? []);

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
        setMessage("Sucursal actualizada correctamente.");
      } else {
        await apiFetch(ENDPOINTS.BRANCHES, { method: "POST", body });
        setMessage("Sucursal creada correctamente.");
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
      await apiFetch(`${ENDPOINTS.BRANCHES}/${toDeactivate.id_sucursal}`, {
        method: "DELETE",
      });
      setMessage("Sucursal desactivada.");
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
    {
      key: "direccion",
      header: "Dirección",
      render: (r) => r.direccion || "—",
    },
    { key: "telefono", header: "Teléfono", render: (r) => r.telefono || "—" },
    {
      key: "activo",
      header: "Estado",
      render: (r) => (
        <Badge variant={r.activo ? "success" : "neutral"}>
          {r.activo ? "Activa" : "Inactiva"}
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
        <h1 className="text-2xl font-bold">Sucursales</h1>
        <Button onClick={openCreate}>Nueva sucursal</Button>
      </div>

      {message && <Alert type="success">{message}</Alert>}
      {(error || actionError) && (
        <Alert type="error">{error || actionError}</Alert>
      )}

      <Table
        columns={columns}
        rows={branches}
        rowKey="id_sucursal"
        loading={loading}
        emptyMessage="No hay sucursales registradas"
      />

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

      {/* Confirmar desactivación */}
      <Modal
        open={Boolean(toDeactivate)}
        onClose={() => setToDeactivate(null)}
        title="Desactivar sucursal"
      >
        <p className="mb-4 text-sm text-brand-foreground">
          ¿Seguro que quieres desactivar <strong>{toDeactivate?.nombre}</strong>
          ? Podrás reactivarla editándola.
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