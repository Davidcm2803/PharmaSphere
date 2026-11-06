import WidgetCard from "./WidgetCard";
import BarRow from "./BarRow";

export default function TopProducts({ query }) {
  const rows = query.data;
  const max = Math.max(1, ...rows.map((r) => Number(r.unidades)));
  return (
    <WidgetCard title="Productos más vendidos" subtitle="Por unidades vendidas" query={query} isEmpty={!rows.length} emptyText="Todavía no hay ventas en este período.">
      <ul className="space-y-4">
        {rows.map((r) => (
          <BarRow key={r.id_producto} label={r.nombre} valueText={`${Number(r.unidades).toLocaleString("es-CR")} u`} percent={(Number(r.unidades) / max) * 100} />
        ))}
      </ul>
    </WidgetCard>
  );
}