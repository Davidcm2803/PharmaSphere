import WidgetCard from "./WidgetCard";
import BarRow from "./BarRow";

export default function BranchRanking({ query }) {
  const rows = query.data;
  const max = Math.max(1, ...rows.map((r) => Number(r.pct)));
  return (
    <WidgetCard title="Ventas por sucursal" subtitle="% del total vendido" query={query} isEmpty={!rows.length} emptyText="Sin ventas por sucursal en este período.">
      <ul className="space-y-4">
        {rows.map((r) => (
          <BarRow key={r.id_sucursal} label={r.nombre} valueText={`${Number(r.pct).toLocaleString("es-CR", { maximumFractionDigits: 1 })}%`} percent={(Number(r.pct) / max) * 100} />
        ))}
      </ul>
    </WidgetCard>
  );
}