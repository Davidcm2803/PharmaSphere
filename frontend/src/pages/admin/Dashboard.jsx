import { useState } from "react";
import { PackagePlus, Pill, ShoppingBag, TrendingUp } from "lucide-react";
import PageHeader from "../../components/admin/ui/PageHeader";
import ActionButton from "../../components/admin/ui/ActionButton";
import Notice from "../../components/admin/ui/Notice";
import Reveal from "../../components/admin/Dashboard/Reveal";
import HeroKpiCard from "../../components/admin/Dashboard/HeroKpiCard";
import KpiCard from "../../components/admin/Dashboard/KpiCard";
import SalesChart from "../../components/admin/Dashboard/SalesChart";
import ProductCarousel from "../../components/admin/Dashboard/ProductCarousel";
import TopProducts from "../../components/admin/Dashboard/TopProducts";
import BranchRanking from "../../components/admin/Dashboard/BranchRanking";
import StockGauge from "../../components/admin/Dashboard/StockGauge";
import AlertsList from "../../components/admin/Dashboard/AlertsList";
import RecentMovements from "../../components/admin/Dashboard/RecentMovements";
import ProfileCard from "../../components/admin/Dashboard/ProfileCard";
import { useAuth } from "../../context/AuthContext";
import { format } from "date-fns";
import { Download } from "lucide-react";
import useMutation from "../../hooks/useMutation";
import { ENDPOINTS, apiDownload } from "../../config/api";
import { useAlerts, useBranchRanking, useMostViewed, useMovements, useSalesByDay, useSummary, useTopProducts } from "../../hooks/useReports";

export default function Dashboard() {
  const { user } = useAuth();
  const [dias, setDias] = useState(30);
  const summary = useSummary();
  const sales = useSalesByDay(dias);
  const top = useTopProducts(5);
  const branches = useBranchRanking();
  const viewed = useMostViewed(6);
  const alerts = useAlerts();
  const movements = useMovements(6);
  const s = summary.data;

  const exportar = useMutation(() =>
    apiDownload(
      `${ENDPOINTS.REPORTS_EXPORT}?dias=${dias}`,
      `reporte_pharmasphere_${dias}d_${format(new Date(), "yyyy-MM-dd")}.csv`,
    ),
  );

  return (
    <>
      <PageHeader
        eyebrow="Operaciones de farmacia"
        title="Resumen"
        subtitle="El estado de tu negocio de un vistazo."
        actions={
          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
            <ActionButton variant="primary" to="/admin/reportes" className="col-span-2"><TrendingUp className="h-4 w-4" />Ver reportes</ActionButton>
            <ActionButton to="/admin/inventario"><PackagePlus className="h-4 w-4" />Agregar al inventario</ActionButton>
            <ActionButton to="/admin/vencimientos">Ver vencimientos</ActionButton>
            <ActionButton variant="primary" onClick={() => exportar.run()} disabled={exportar.submitting}>
              <Download className="h-4 w-4" />
              {exportar.submitting ? "Generando..." : "Exportar CSV"}
            </ActionButton>
          </div>
        }
      />

      {summary.error && (
        <Notice type="error" className="mt-6">
          {summary.error}{" "}
          <button onClick={summary.refetch} className="font-bold underline">Reintentar</button>
        </Notice>
      )}

      {exportar.error && (
        <Notice type="error" className="mt-6">{exportar.error.message}</Notice>
      )}


      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12 lg:gap-6">
        <Reveal index={0} className="md:col-span-3 lg:col-span-3"><HeroKpiCard label="Ventas de hoy" value={s?.ventas_hoy} loading={summary.loading} /></Reveal>
        <Reveal index={1} className="md:col-span-3 lg:col-span-3"><KpiCard icon={TrendingUp} label="Ventas del mes" value={s?.ventas_mes} variation={s?.var_ventas_mes} loading={summary.loading} /></Reveal>
        <Reveal index={2} className="md:col-span-3 lg:col-span-3"><KpiCard icon={Pill} label="Ganancia estimada del mes" value={s?.ganancia_mes} variation={s?.var_ganancia_mes} loading={summary.loading} /></Reveal>
        <Reveal index={3} className="md:col-span-3 lg:col-span-3"><KpiCard icon={ShoppingBag} label="Compras del mes" value={s?.compras_mes} variation={s?.var_compras_mes} loading={summary.loading} /></Reveal>

        <Reveal index={4} className="md:col-span-6 lg:col-span-8"><SalesChart query={sales} dias={dias} onDiasChange={setDias} /></Reveal>
        <Reveal index={5} className="md:col-span-6 lg:col-span-4"><ProductCarousel query={viewed} /></Reveal>

        <Reveal index={6} className="md:col-span-3 lg:col-span-4"><TopProducts query={top} /></Reveal>
        <Reveal index={7} className="md:col-span-3 lg:col-span-4"><BranchRanking query={branches} /></Reveal>
        <Reveal index={8} className="md:col-span-6 lg:col-span-4"><StockGauge query={summary} /></Reveal>

        <Reveal index={9} className="md:col-span-3 lg:col-span-5"><AlertsList query={alerts} /></Reveal>
        <Reveal index={10} className="md:col-span-3 lg:col-span-4"><RecentMovements query={movements} /></Reveal>
        <Reveal index={11} className="md:col-span-6 lg:col-span-3">
          <ProfileCard nombre={user?.nombre} email={user?.email} productos={s?.productos_activos} clientes={s?.clientes_activos} empleados={s?.empleados_activos} />
        </Reveal>
      </div>
    </>
  );
}