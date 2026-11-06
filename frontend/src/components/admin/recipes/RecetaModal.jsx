import { useState } from "react";
import { useForm } from "react-hook-form";
import Alert from "../../ui/Alert";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Modal from "../../ui/Modal";
import { useCustomerByCedula } from "../../../hooks/useCustomersAdmin";
import {
  useCreateRecipe,
  useRxProducts,
  useUpdateRecipe,
} from "../../../hooks/useRecipes";
import { todayISO } from "../../../lib/query";

const URL_RE = /^(https?:\/\/|\/static\/)/;

// Crear: `recipe` vacío. Editar: pasar `recipe`.
// Desde el POS se pasan `customer` y `product` ya fijos (no se pueden cambiar).
export default function RecetaModal({
  recipe,
  customer: fixedCustomer,
  product: fixedProduct,
  defaultQuantity = 1,
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(recipe);
  const create = useCreateRecipe();
  const update = useUpdateRecipe();
  const mutation = isEdit ? update : create;

  // Solo productos con receta; no hace falta si el producto viene fijo
  const rxProducts = useRxProducts();
  const products = rxProducts.data?.items ?? [];

  // Búsqueda de cliente por cédula (solo al crear desde Recetas)
  const needsLookup = !isEdit && !fixedCustomer;
  const [cedulaInput, setCedulaInput] = useState("");
  const [cedulaQuery, setCedulaQuery] = useState("");
  const lookup = useCustomerByCedula(needsLookup ? cedulaQuery : "");
  const found = lookup.data?.items?.[0] ?? null;
  const customer = fixedCustomer ?? found;

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {
      id_producto: recipe?.id_producto ?? fixedProduct?.id_producto ?? "",
      cantidad: recipe?.cantidad ?? defaultQuantity,
      medico: recipe?.medico ?? "",
      fecha: recipe?.fecha ?? todayISO(),
      vigencia_hasta: recipe?.vigencia_hasta ?? "",
      archivo_url: recipe?.archivo_url ?? "",
      estado: recipe?.estado === "vencida" ? "vencida" : "vigente",
    },
  });

  const onSubmit = async (v) => {
    const common = {
      cantidad: Number(v.cantidad),
      medico: v.medico.trim() || null,
      fecha: v.fecha || null,
      vigencia_hasta: v.vigencia_hasta || null,
      archivo_url: v.archivo_url.trim() || null,
    };
    const saved = isEdit
      ? await update.run({ id: recipe.id_receta, body: { ...common, estado: v.estado } })
      : await create.run({
          ...common,
          fecha: v.fecha || undefined,
          id_cliente: customer.id_cliente,
          id_producto: Number(v.id_producto),
        });
    if (saved) onSaved(saved, isEdit);
  };

  const productName = recipe?.producto_nombre ?? fixedProduct?.nombre;
  const noCustomer = needsLookup && !customer;

  return (
    <Modal open onClose={onClose} title={isEdit ? "Editar receta" : "Registrar receta"}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {mutation.error && <Alert type="error">{mutation.error.message}</Alert>}

        {/* Cliente */}
        {needsLookup ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  id="rec-cedula"
                  label="Cédula del cliente *"
                  placeholder="1-1111-1111"
                  autoComplete="off"
                  value={cedulaInput}
                  onChange={(e) => setCedulaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setCedulaQuery(cedulaInput.trim());
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCedulaQuery(cedulaInput.trim())}
                disabled={!cedulaInput.trim()}
              >
                Buscar
              </Button>
            </div>
            {cedulaQuery && lookup.loading && (
              <p className="text-sm text-brand-muted-foreground">Buscando cliente…</p>
            )}
            {cedulaQuery && lookup.error && <Alert type="error">{lookup.error}</Alert>}
            {cedulaQuery && !lookup.loading && !lookup.error && !found && (
              <Alert type="warning">No hay un cliente con esa cédula. Regístralo primero en Clientes.</Alert>
            )}
            {found && (
              <p className="text-sm text-brand-foreground">
                Cliente: <strong>{found.nombre}</strong>
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-brand-muted-foreground">
            Cliente:{" "}
            <strong className="text-brand-foreground">
              {recipe?.cliente_nombre ?? customer?.nombre}
            </strong>
            {(recipe?.cliente_cedula ?? customer?.cedula) &&
              ` · ${recipe?.cliente_cedula ?? customer?.cedula}`}
          </p>
        )}

        {/* Producto */}
        {isEdit || fixedProduct ? (
          <p className="text-sm text-brand-muted-foreground">
            Producto: <strong className="text-brand-foreground">{productName}</strong>
          </p>
        ) : (
          <Select
            id="rec-producto"
            label="Producto (requiere receta) *"
            error={errors.id_producto?.message}
            disabled={rxProducts.loading}
            {...register("id_producto", { required: "Elige un producto" })}
          >
            <option value="">{rxProducts.loading ? "Cargando…" : "Elige un producto"}</option>
            {products.map((p) => (
              <option key={p.id_producto} value={p.id_producto}>
                {p.nombre}
              </option>
            ))}
          </Select>
        )}
        {!isEdit && !fixedProduct && rxProducts.error && (
          <Alert type="error">No se pudieron cargar los productos: {rxProducts.error}</Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="rec-cantidad"
            label="Cantidad autorizada *"
            type="number"
            min="1"
            max="1000"
            step="1"
            error={errors.cantidad?.message}
            {...register("cantidad", {
              required: "Ingresa la cantidad",
              validate: (v) => {
                const n = Number(v);
                return (Number.isInteger(n) && n >= 1 && n <= 1000) || "Debe ser un entero entre 1 y 1000";
              },
            })}
          />
          <Input
            id="rec-medico"
            label="Médico"
            placeholder="Dr. Nombre Apellido"
            error={errors.medico?.message}
            {...register("medico", { maxLength: { value: 150, message: "Máximo 150 caracteres" } })}
          />
          <Input
            id="rec-fecha"
            label="Fecha de emisión"
            type="date"
            error={errors.fecha?.message}
            {...register("fecha")}
          />
          <Input
            id="rec-vigencia"
            label="Vigente hasta"
            type="date"
            error={errors.vigencia_hasta?.message}
            {...register("vigencia_hasta", {
              validate: (v) => {
                const fecha = getValues("fecha");
                return !v || !fecha || v >= fecha || "No puede ser anterior a la fecha de emisión";
              },
            })}
          />
        </div>

        <Input
          id="rec-archivo"
          label="Archivo (URL)"
          placeholder="https://… o /static/…"
          error={errors.archivo_url?.message}
          {...register("archivo_url", {
            maxLength: { value: 500, message: "Máximo 500 caracteres" },
            validate: (v) => !v.trim() || URL_RE.test(v.trim()) || "Usa una URL http(s) o una ruta /static/",
          })}
        />

        {isEdit && (
          <Select id="rec-estado" label="Estado" {...register("estado")}>
            <option value="vigente">Vigente</option>
            <option value="vencida">Vencida</option>
          </Select>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.submitting} disabled={noCustomer}>
            {isEdit ? "Guardar cambios" : "Registrar receta"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}