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

const EMPTY_FORM = {
  nombre: "",
  contacto: "",
  telefono: "",
  correo: "",
  activo: "true",
};

export default function Proveedores() {
  const { data, error, loading, refetch } = useApi(ENDPOINTS.SUPPLIERS);
  const suppliers = Array.isArray(data) ? data : (data?.items ?? []);

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
        setMessage("Proveedor actualizado correctamente.");
      } else {
        await apiFetch(ENDPOINTS.SUPPLIERS, { method: "POST", body });
        setMessage("Proveedor creado correctamente.");
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
      await apiFetch(`${ENDPOINTS.SUPPLIERS}/${toDeactivate.id_proveedor}`, {
        method: "DELETE",
      });
      setMessage("Proveedor desactivado.");
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
    { key: "contacto", header: "Contacto", render: (r) => r.contacto || "—" },
    { key: "telefono", header: "Teléfono", render: (r) => r.telefono || "—" },
    { key: "correo", header: "Correo", render: (r) => r.correo || "—" },
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
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <Button onClick={openCreate}>Nuevo proveedor</Button>
      </div>

      {message && <Alert type="success">{message}</Alert>}
      {(error || actionError) && (
        <Alert type="error">{error || actionError}</Alert>
      )}

      <Table
        columns={columns}
        rows={suppliers}
        rowKey="id_proveedor"
        loading={loading}
        emptyMessage="No hay proveedores registrados"
      />

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

      {/* Confirmar desactivación */}
      <Modal
        open={Boolean(toDeactivate)}
        onClose={() => setToDeactivate(null)}
        title="Desactivar proveedor"
      >
        <p className="mb-4 text-sm text-brand-foreground">
          ¿Seguro que quieres desactivar <strong>{toDeactivate?.nombre}</strong>
          ? Podrás reactivarlo editándolo.
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
