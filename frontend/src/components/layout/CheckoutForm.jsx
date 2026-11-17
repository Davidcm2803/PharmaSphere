import { useForm } from "react-hook-form";
import Input from "../ui/Input";
import Select from "../ui/Select";

// El botón de enviar vive en el resumen (fuera del form) y se enlaza con este id
export const CHECKOUT_FORM_ID = "checkout-form";

const PHONE_RULE = {
  required: "Ingresa un teléfono de contacto",
  pattern: {
    value: /^[0-9+\-\s()]{7,20}$/,
    message: "Ingresa un teléfono válido",
  },
};

const section = "rounded-3xl border border-brand-border bg-brand-card p-6";

// Formulario del checkout: sucursal de retiro y datos del cliente. No hace fetch; avisa por onSubmit
export default function CheckoutForm({ user, branches, onSubmit }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { id_sucursal: "", telefono: "", cedula: "" } });

  return (
    <form
      id={CHECKOUT_FORM_ID}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-6"
    >
      <section className={section}>
        <h2 className="text-lg font-bold text-brand-foreground">
          Sucursal de retiro
        </h2>
        <p className="mb-4 mt-1 text-sm text-brand-muted-foreground">
          Retiras tu pedido en la sucursal y pagas ahí mismo.
        </p>
        <Select
          id="id_sucursal"
          label="Sucursal"
          error={errors.id_sucursal?.message}
          {...register("id_sucursal", {
            required: "Elige dónde retirar tu pedido",
          })}
        >
          <option value="">Elige una sucursal</option>
          {branches.map((b) => (
            <option key={b.id_sucursal} value={b.id_sucursal}>
              {b.nombre}
              {b.direccion ? ` · ${b.direccion}` : ""}
            </option>
          ))}
        </Select>
      </section>

      <section className={section}>
        <h2 className="text-lg font-bold text-brand-foreground">Tus datos</h2>
        <dl className="mb-4 mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-brand-muted-foreground">Nombre</dt>
            <dd className="font-semibold text-brand-foreground">
              {user.nombre}
            </dd>
          </div>
          <div>
            <dt className="text-brand-muted-foreground">Correo</dt>
            <dd className="break-all font-semibold text-brand-foreground">
              {user.correo}
            </dd>
          </div>
        </dl>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="telefono"
            label="Teléfono"
            type="tel"
            autoComplete="tel"
            placeholder="8888-8888"
            error={errors.telefono?.message}
            {...register("telefono", PHONE_RULE)}
          />
          <Input
            id="cedula"
            label="Cédula (opcional)"
            autoComplete="off"
            placeholder="1-1111-1111"
            error={errors.cedula?.message}
            {...register("cedula", {
              maxLength: { value: 50, message: "Máximo 50 caracteres" },
            })}
          />
        </div>
      </section>
    </form>
  );
}
