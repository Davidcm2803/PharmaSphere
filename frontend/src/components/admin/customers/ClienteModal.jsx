import { useState } from "react";
import { useForm } from "react-hook-form";
import Alert from "../../ui/Alert";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Modal from "../../ui/Modal";
import { useCreateCustomer, useUpdateCustomer } from "../../../hooks/useCustomersAdmin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toDefaults = (c) => ({
  nombre: c?.nombre ?? "",
  cedula: c?.cedula ?? "",
  telefono: c?.telefono ?? "",
  correo: c?.correo ?? "",
  direccion: c?.direccion ?? "",
});

// Vacío -> null para que el backend limpie el campo
const toPayload = (v) => ({
  nombre: v.nombre.trim(),
  cedula: v.cedula.trim() || null,
  telefono: v.telefono.trim() || null,
  correo: v.correo.trim() || null,
  direccion: v.direccion.trim() || null,
});

// Sin `customer` crea; con `customer` edita. Se monta solo cuando está abierto.
// `defaultCedula` precarga la cédula al registrar desde el POS.
export default function ClienteModal({ customer, defaultCedula = "", onClose, onSaved }) {
  const isEdit = Boolean(customer);
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const mutation = isEdit ? update : create;

  // Si el backend rechaza el correo de un cliente con cuenta, se bloquea el campo
  const [lockEmail, setLockEmail] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: { ...toDefaults(customer), cedula: customer?.cedula ?? defaultCedula },
  });

  const onSubmit = async (values) => {
    const body = toPayload(values);
    const saved = isEdit
      ? await update.run({ id: customer.id_cliente, body })
      : await create.run(body);
    if (saved) {
      onSaved(saved, isEdit);
      return;
    }
  };

  // Detecta el 409 por correo en cliente con cuenta
  const apiError = mutation.error;
  const emailBlocked =
    isEdit && lockEmail ? true : false;
  if (
    isEdit &&
    apiError?.status === 409 &&
    /correo/i.test(apiError.message) &&
    /cuenta/i.test(apiError.message) &&
    !lockEmail
  ) {
    setLockEmail(true);
    setValue("correo", customer.correo ?? "");
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? "Editar cliente" : "Registrar cliente"}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {apiError && <Alert type="error">{apiError.message}</Alert>}

        <Input
          id="cli-nombre"
          label="Nombre *"
          placeholder="Nombre completo"
          error={errors.nombre?.message}
          {...register("nombre", {
            required: "El nombre es obligatorio",
            validate: (v) => {
              const n = v.trim().length;
              return (n >= 2 && n <= 150) || "Debe tener entre 2 y 150 caracteres";
            },
          })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="cli-cedula"
            label="Cédula"
            placeholder="1-1111-1111"
            autoComplete="off"
            error={errors.cedula?.message}
            {...register("cedula", { maxLength: { value: 50, message: "Máximo 50 caracteres" } })}
          />
          <Input
            id="cli-telefono"
            label="Teléfono"
            type="tel"
            placeholder="8888-8888"
            error={errors.telefono?.message}
            {...register("telefono", { maxLength: { value: 50, message: "Máximo 50 caracteres" } })}
          />
        </div>

        <Input
          id="cli-correo"
          label="Correo"
          type="email"
          placeholder="cliente@correo.com"
          disabled={emailBlocked}
          error={
            errors.correo?.message ??
            (emailBlocked ? "Este cliente tiene una cuenta: su correo no se puede cambiar." : undefined)
          }
          {...register("correo", {
            validate: (v) => !v.trim() || EMAIL_RE.test(v.trim()) || "Ingresa un correo válido",
          })}
        />

        <Input
          id="cli-direccion"
          label="Dirección"
          placeholder="Provincia, cantón, señas"
          error={errors.direccion?.message}
          {...register("direccion", { maxLength: { value: 255, message: "Máximo 255 caracteres" } })}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.submitting}>
            {isEdit ? "Guardar cambios" : "Registrar cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}