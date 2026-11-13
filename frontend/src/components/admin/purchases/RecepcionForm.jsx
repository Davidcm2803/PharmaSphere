import { useState } from "react";
import ActionButton from "../ui/ActionButton";
import Alert from "../../ui/Alert";
import Button from "../../Ui/Button";
import LoteRow from "./LoteRow";

const pad = (n) => String(n).padStart(2, "0");

// Mañana en AAAA-MM-DD: el backend rechaza lotes que vencen hoy o antes
const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const emptyLote = (cantidad = "") => ({
  numero_lote: "",
  fecha_vencimiento: "",
  cantidad,
});

// Revisa los lotes de cada producto. Devuelve { errores: { [id_producto]: { resumen, lotes: [..] } }, valido }
const validar = (compra, lotesPor, minDate) => {
  let valido = true;
  const errores = {};
  compra.detalles.forEach((d) => {
    const lotes = lotesPor[d.id_producto];
    const e = { resumen: "", lotes: lotes.map(() => ({})) };
    const vistos = new Set();
    let suma = 0;
    lotes.forEach((l, i) => {
      const numero = l.numero_lote.trim();
      if (!numero) e.lotes[i].numero_lote = "Obligatorio";
      else if (vistos.has(numero)) e.lotes[i].numero_lote = "Repetido";
      vistos.add(numero);
      if (!l.fecha_vencimiento) e.lotes[i].fecha_vencimiento = "Obligatorio";
      else if (l.fecha_vencimiento < minDate)
        e.lotes[i].fecha_vencimiento = "Debe ser futura";
      const cant = Number(l.cantidad);
      if (l.cantidad === "" || !Number.isInteger(cant) || cant < 1)
        e.lotes[i].cantidad = "Entero > 0";
      else suma += cant;
    });
    if (suma !== d.cantidad)
      e.resumen = `La suma de lotes (${suma}) debe ser igual a lo pedido (${d.cantidad}).`;
    if (e.resumen || e.lotes.some((x) => Object.keys(x).length)) valido = false;
    errores[d.id_producto] = e;
  });
  return { errores, valido };
};

// Recibe la compra pendiente y llama onSubmit(lineas). El padre maneja el envío y los errores del servidor
export default function RecepcionForm({
  compra,
  onSubmit,
  submitting,
  error,
  cancelTo,
}) {
  const minDate = tomorrowISO();
  const [lotesPor, setLotesPor] = useState(() =>
    Object.fromEntries(
      compra.detalles.map((d) => [
        d.id_producto,
        [emptyLote(String(d.cantidad))],
      ]),
    ),
  );
  const [errores, setErrores] = useState({});

  const cambiar = (idProducto, index, cambios) =>
    setLotesPor((cur) => ({
      ...cur,
      [idProducto]: cur[idProducto].map((l, i) =>
        i === index ? { ...l, ...cambios } : l,
      ),
    }));
  const agregar = (idProducto) =>
    setLotesPor((cur) => ({
      ...cur,
      [idProducto]: [...cur[idProducto], emptyLote()],
    }));
  const quitar = (idProducto, index) =>
    setLotesPor((cur) => ({
      ...cur,
      [idProducto]: cur[idProducto].filter((_, i) => i !== index),
    }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const { errores: nuevos, valido } = validar(compra, lotesPor, minDate);
    setErrores(nuevos);
    if (!valido) return;
    onSubmit(
      compra.detalles.map((d) => ({
        id_producto: d.id_producto,
        lotes: lotesPor[d.id_producto].map((l) => ({
          numero_lote: l.numero_lote.trim(),
          fecha_vencimiento: l.fecha_vencimiento,
          cantidad: Number(l.cantidad),
        })),
      })),
    );
  };

  const hayErrores = Object.values(errores).some(
    (e) => e.resumen || e.lotes.some((x) => Object.keys(x).length),
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {compra.detalles.map((d) => {
        const lotes = lotesPor[d.id_producto];
        const asignado = lotes.reduce(
          (s, l) => s + (Number(l.cantidad) || 0),
          0,
        );
        const cuadra = asignado === d.cantidad;
        const e = errores[d.id_producto];
        return (
          <section
            key={d.id_producto}
            className="rounded-2xl border border-brand-border p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-brand-foreground">
                {d.nombre_producto}
              </h3>
              <p
                className={`text-sm font-semibold ${cuadra ? "text-brand-success" : "text-brand-warning"}`}
              >
                Asignado {asignado} de {d.cantidad}
              </p>
            </div>
            <ul className="mt-4 space-y-4">
              {lotes.map((l, i) => (
                <LoteRow
                  key={i}
                  id={`lote-${d.id_producto}-${i}`}
                  lote={l}
                  minDate={minDate}
                  errors={e?.lotes[i]}
                  canRemove={lotes.length > 1}
                  onChange={(cambios) => cambiar(d.id_producto, i, cambios)}
                  onRemove={() => quitar(d.id_producto, i)}
                />
              ))}
            </ul>
            {e?.resumen && (
              <p role="alert" className="mt-3 text-sm text-brand-danger">
                {e.resumen}
              </p>
            )}
            <button
              type="button"
              onClick={() => agregar(d.id_producto)}
              className="mt-4 text-sm font-semibold text-brand-primary hover:underline"
            >
              + Agregar otro lote
            </button>
          </section>
        );
      })}

      {(error || hayErrores) && (
        <Alert type="error">
          {error ?? "Revisa los campos marcados antes de recibir."}
        </Alert>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <ActionButton to={cancelTo}>Cancelar</ActionButton>
        <Button type="submit" loading={submitting} className="h-10">
          Confirmar recepción
        </Button>
      </div>
    </form>
  );
}
