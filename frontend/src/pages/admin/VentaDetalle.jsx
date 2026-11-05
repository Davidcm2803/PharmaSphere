import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Receipt } from "lucide-react";
import { useSale } from "../../hooks/useAdminSales";
import { formatPrice } from "../../lib/format";
import { formatDateTime } from "../../lib/query";
import PageHeader from "../../components/admin/ui/PageHeader";
import ActionButton from "../../components/admin/ui/ActionButton";
import Panel from "../../components/admin/ui/Panel";
import Notice from "../../components/admin/ui/Notice";
import DataTable from "../../components/admin/ui/DataTable";
import Badge from "../../components/ui/Badge";

const ESTADO_BADGE = {
  pendiente: ["warning", "Pendiente"],
  pagada: ["success", "Pagada"],
  retirada: ["neutral", "Retirada"],
  cancelada: ["danger", "Cancelada"],
};

const PAGO = { efectivo: "Efectivo", tarjeta: "Tarjeta", pago_en_sucursal: "Pago en sucursal" };

const itemColumns = [
  { key: "nombre", label: "Producto" },
  { key: "cantidad", label: "Cantidad" },
  { key: "precio_unitario", label: "Precio", render: (i) => formatPrice(i.precio_unitario) },
  { key: "subtotal", label: "Subtotal", render: (i) => <span className="font-semibold">{formatPrice(i.subtotal)}</span> },
];

function Info({ label, children }) {
  return (
    <div className="min-w-0 rounded-2xl bg-brand-foreground/[0.04] px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-brand-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-[15px] font-semibold text-brand-foreground">{children}</dd>
    </div>
  );
}

export default function VentaDetalle() {
  const { id } = useParams();
  const { data: venta, error, loading, refetch } = useSale(id);

  const back = (
    <ActionButton to="/admin/ventas">
      <ArrowLeft className="h-4 w-4" /> Volver
    </ActionButton>
  );

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Operaciones de farmacia" title="Detalle de venta" actions={back} />
        <p className="py-16 text-center text-brand-muted-foreground">Cargando venta…</p>
      </>
    );
  }

  if (error || !venta) {
    return (
      <>
        <PageHeader eyebrow="Operaciones de farmacia" title="Detalle de venta" actions={back} />
        <Notice type="error" className="mt-6">
          {error ?? "No se encontró la venta."}
          <button onClick={refetch} className="ml-2 font-semibold underline">Reintentar</button>
          <Link to="/admin/ventas" className="ml-3 font-semibold underline">Ir a ventas</Link>
        </Notice>
      </>
    );
  }

  const [variant, label] = ESTADO_BADGE[venta.estado] ?? ["neutral", venta.estado];

  return (
    <>
      <PageHeader
        eyebrow="Operaciones de farmacia"
        title={`Venta #${venta.id_venta}`}
        subtitle={formatDateTime(venta.fecha)}
        actions={back}
      />

      <Panel icon={Receipt} title="Datos de la venta" subtitle="Información general del pedido.">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Estado"><Badge variant={variant}>{label}</Badge></Info>
          <Info label="Tipo">{venta.tipo === "online" ? "Online" : "Mostrador"}</Info>
          <Info label="Sucursal">{venta.sucursal_nombre}</Info>
          <Info label="Cliente">
            {venta.cliente_nombre ?? "Mostrador"}
            {venta.cliente_cedula && (
              <span className="block text-xs font-normal text-brand-muted-foreground">{venta.cliente_cedula}</span>
            )}
          </Info>
          <Info label="Empleado">{venta.id_empleado ? `Empleado #${venta.id_empleado}` : "—"}</Info>
          <Info label="Método de pago">
            {PAGO[venta.metodo_pago] ?? venta.metodo_pago ?? "—"}
            {venta.tarjeta_ultimos_4 && (
              <span className="block text-xs font-normal text-brand-muted-foreground">
                Tarjeta terminada en {venta.tarjeta_ultimos_4}
              </span>
            )}
          </Info>
        </dl>
      </Panel>

      <Panel title="Productos" subtitle={`${venta.items.length} ${venta.items.length === 1 ? "producto" : "productos"} en la venta.`}>
        <DataTable columns={itemColumns} rows={venta.items} rowKey="id_producto" />
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-brand-accent px-5 py-4 text-brand-accent-foreground">
          <span className="font-semibold">Total</span>
          <span className="text-2xl font-extrabold">{formatPrice(venta.total)}</span>
        </div>
      </Panel>
    </>
  );
}