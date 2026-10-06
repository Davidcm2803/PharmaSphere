import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { cn } from "../../../lib/utils";
import useFetch from "../../../hooks/useFetch";
import { ENDPOINTS, apiFetch } from "../../../config/api";
import ActionButton from "../ui/ActionButton";
import Dropdown from "../ui/Dropdown";
import Field from "../ui/Field";
import Notice from "../ui/Notice";
import Panel from "../ui/Panel";

const FIELDS = ["nombre", "descripcion", "categoria", "precio", "costo", "requiere_receta", "imagen_url", "id_proveedor"];

const inputClass = (error, extra) =>
  cn(
    "w-full rounded-lg border bg-brand-card px-3.5 text-base text-brand-foreground placeholder:text-brand-muted-foreground transition-colors focus:outline-none sm:text-sm",
    error ? "border-brand-danger" : "border-brand-border hover:border-brand-primary focus:border-brand-primary",
    extra ?? "h-11",
  );

// Producto del backend, valores iniciales del formulario
const toDefaults = (p) => ({
  nombre: p?.nombre ?? "",
  descripcion: p?.descripcion ?? "",
  categoria: p?.categoria ?? "",
  precio: p ? String(p.precio) : "",
  costo: p ? String(p.costo ?? 0) : "",
  requiere_receta: p?.requiere_receta ?? false,
  imagen_url: p?.imagen_url ?? "",
  id_proveedor: p?.id_proveedor ?? null,
});

// body que espera el backend (ProductCreate / ProductUpdate)
const toPayload = (v) => ({
  nombre: v.nombre.trim(),
  descripcion: v.descripcion.trim() || null,
  categoria: (v.categoria ?? "").trim() || null,
  precio: Number(v.precio),
  costo: Number(v.costo || 0),
  requiere_receta: Boolean(v.requiere_receta),
  imagen_url: v.imagen_url.trim() || null,
  id_proveedor: v.id_proveedor ?? null,
});

const asList = (d) => (Array.isArray(d) ? d : (d?.items ?? []));
const maxPrice = 99999999.99;

// Sin `product` crea (POST). Con `product` edita (PUT /products/{id}).
export default function ProductForm({ product }) {
  const navigate = useNavigate();
  const isEdit = Boolean(product);
  const [formError, setFormError] = useState(null);

  const {
    register, handleSubmit, setError, watch, control,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: toDefaults(product) });

  const categories = useFetch(ENDPOINTS.CATEGORIES);
  const suppliers = useFetch(
    isEdit && product.id_proveedor
      ? `${ENDPOINTS.SUPPLIER_OPTIONS}?include_id=${product.id_proveedor}`
      : ENDPOINTS.SUPPLIER_OPTIONS,
  );

  const supplierOptions = asList(suppliers.data).map((s) => ({
    value: s.id_proveedor,
    label: s.nombre,
  }));
  const categoryOptions = (categories.data ?? []).map((c) => ({ value: c, label: c }));
  const imageUrl = watch("imagen_url")?.trim();

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      await apiFetch(isEdit ? `${ENDPOINTS.PRODUCTS}/${product.id_producto}` : ENDPOINTS.PRODUCTS, {
        method: isEdit ? "PUT" : "POST",
        body: toPayload(values),
      });
      navigate("/admin/productos", {
        state: { notice: isEdit ? "Producto actualizado correctamente" : "Producto creado correctamente" },
      });
    } catch (err) {
      // El backend responde { message, details: [{ field, message }] } en errores 422
      const fieldErrors = Array.isArray(err.details) ? err.details.filter((d) => FIELDS.includes(d.field)) : [];
      fieldErrors.forEach((d) => setError(d.field, { message: d.message }));
      setFormError(fieldErrors.length ? "Revisa los campos marcados en rojo." : err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {formError && <Notice type="error" className="mt-6">{formError}</Notice>}

      <Panel title="Información del producto" subtitle="Lo que verán los clientes en la tienda.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nombre" required error={errors.nombre?.message} className="md:col-span-2">
            <input
              className={inputClass(errors.nombre)}
              placeholder="Ej. Paracetamol 500mg"
              {...register("nombre", {
                required: "El nombre es obligatorio",
                minLength: { value: 2, message: "Mínimo 2 caracteres" },
                maxLength: { value: 150, message: "Máximo 150 caracteres" },
                validate: (v) => v.trim().length >= 2 || "Mínimo 2 caracteres",
              })}
            />
          </Field>

          <Field label="Descripción" error={errors.descripcion?.message} hint="Máximo 500 caracteres." className="md:col-span-2">
            <textarea
              rows={3}
              className={inputClass(errors.descripcion, "min-h-24 py-2.5")}
              placeholder="Para qué sirve, presentación, indicaciones…"
              {...register("descripcion", { maxLength: { value: 500, message: "Máximo 500 caracteres" } })}
            />
          </Field>

          <Field label="Categoría" error={errors.categoria?.message} hint="Elige una existente o escribe una nueva.">
            <Controller
              name="categoria"
              control={control}
              rules={{ maxLength: { value: 100, message: "Máximo 100 caracteres" } }}
              render={({ field }) => (
                <Dropdown
                  creatable
                  options={categoryOptions}
                  value={field.value}
                  onChange={field.onChange}
                  isLoading={categories.loading}
                  error={errors.categoria}
                  placeholder="Ej. Analgésicos"
                />
              )}
            />
          </Field>

          <Field
            label="Proveedor"
            error={errors.id_proveedor?.message}
            hint={suppliers.error ? "No se pudo cargar la lista de proveedores. Puedes dejarlo vacío y asignarlo después." : undefined}
          >
            <Controller
              name="id_proveedor"
              control={control}
              render={({ field }) => (
                <Dropdown
                  options={supplierOptions}
                  value={field.value}
                  onChange={field.onChange}
                  isLoading={suppliers.loading}
                  error={errors.id_proveedor}
                  placeholder="Sin proveedor"
                />
              )}
            />
          </Field>

          <Field label="Precio de venta (₡)" required error={errors.precio?.message}>
            <input
              type="number" step="0.01" inputMode="decimal"
              className={inputClass(errors.precio)}
              placeholder="0.00"
              {...register("precio", {
                required: "El precio es obligatorio",
                validate: (v) =>
                  Number(v) > 0 ? Number(v) <= maxPrice || "El precio es demasiado alto" : "Debe ser mayor que 0",
              })}
            />
          </Field>

          <Field label="Costo de compra (₡)" error={errors.costo?.message} hint="Solo lo ve el administrador. Se usa para calcular ganancias.">
            <input
              type="number" step="0.01" inputMode="decimal"
              className={inputClass(errors.costo)}
              placeholder="0.00"
              {...register("costo", {
                validate: (v) => v === "" || (Number(v) >= 0 && Number(v) <= maxPrice) || "Debe ser un monto entre 0 y 99,999,999.99",
              })}
            />
          </Field>

          <Field label="Imagen (URL)" error={errors.imagen_url?.message} className="md:col-span-2">
            <input
              type="url"
              className={inputClass(errors.imagen_url)}
              placeholder="https://…"
              {...register("imagen_url", { maxLength: { value: 500, message: "Máximo 500 caracteres" } })}
            />
          </Field>
          {imageUrl && (
            <img
              key={imageUrl}
              src={imageUrl}
              alt="Vista previa del producto"
              onError={(e) => (e.currentTarget.style.display = "none")}
              className="h-32 w-32 rounded-2xl border border-brand-border object-cover md:col-span-2"
            />
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-brand-border p-4 md:col-span-2">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-primary" {...register("requiere_receta")} />
            <span>
              <span className="block text-sm font-semibold text-brand-foreground">Requiere receta médica</span>
              <span className="block text-sm text-brand-muted-foreground">
                No se podrá vender sin una receta vigente. La tienda mostrará un aviso.
              </span>
            </span>
          </label>
        </div>
      </Panel>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <ActionButton to="/admin/productos">Cancelar</ActionButton>
        <ActionButton type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear producto"}
        </ActionButton>
      </div>
    </form>
  );
}