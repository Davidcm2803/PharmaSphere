import { useEffect, useState } from "react";
import { CalendarClock, Layers, Search, Trash2 } from "lucide-react";
import useFetch from "../../hooks/useFetch";
import { ENDPOINTS, apiFetch } from "../../config/api";
import PageHeader from "../../components/admin/ui/PageHeader";
import ActionButton from "../../components/admin/ui/ActionButton";
import Panel from "../../components/admin/ui/Panel";
import StatCard from "../../components/admin/ui/StatCard";
import DataTable from "../../components/admin/ui/DataTable";
import Pagination from "../../components/admin/ui/Pagination";
import Notice from "../../components/admin/ui/Notice";
import ConfirmDialog from "../../components/admin/ui/ConfirmDialog";
import Badge from "../../components/ui/Badge";
import LotesModal from "../../components/admin/inventory/LotesModal";
import { daysUntil, expiryStatus, fmtDate, plural } from "../../lib/expiry";

const PAGE_SIZE = 10;
// 3650 = "todos los lotes" (10 años)
const WINDOWS = [
  { value: 30, label: "Próximos 30 días" },
  { value: 60, label: "Próximos 60 días" },
  { value: 90, label: "Próximos 90 días" },
  { value: 180, label: "Próximos 180 días" },
  { value: 365, label: "Próximo año" },
  { value: 3650, label: "Todos los lotes" },
];

const selectClass =
  "h-10 w-full rounded-lg border border-brand-border bg-brand-card px-3 text-sm text-brand-foreground focus:border-brand-primary focus:outline-none sm:min-w-[200px] sm:w-auto";

const iconAction =
  "flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted-foreground transition-colors hover:bg-brand-muted hover:text-brand-foreground";

const toList = (data) => (Array.isArray(data) ? data : (data?.items ?? []));

const paginate = (rows, page) => {
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  return {
    pages,
    current,
    slice: rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
  };
};

const tabClass = (active) =>
  `h-10 rounded-lg px-4 text-sm font-semibold transition-colors ${
    active
      ? "bg-brand-primary text-white"
      : "bg-brand-muted text-brand-foreground hover:bg-brand-accent"
  }`;

// Estado de una fila de inventario según sus lotes
function ProductoEstado({ r }) {
  const lotes = r.lotes_cantidad ?? 0;
  if (r.cantidad === 0 && lotes === 0) return <Badge variant="neutral">Sin stock</Badge>;
  if (r.cantidad > 0 && lotes === 0) return <Badge variant="danger">Sin lote registrado</Badge>;
  if (r.cantidad !== lotes) return <Badge variant="warning">Descuadre</Badge>;
  const st = expiryStatus(daysUntil(r.proximo_vencimiento));
  return <Badge variant={st.variant}>{st.label}</Badge>;
}

export default function Vencimientos() {
  const { data: branchesData } = useFetch(ENDPOINTS.BRANCHES);
  const branches = toList(branchesData).filter((b) => b.activo);
  const branchName = Object.fromEntries(
    toList(branchesData).map((b) => [b.id_sucursal, b.nombre]),
  );

  const [view, setView] = useState("lotes"); // "lotes" | "productos"
  const [branchId, setBranchId] = useState(""); // "" = todas
  const [days, setDays] = useState(90);
  const [search, setSearch] = useState("");
  const [pageSoon, setPageSoon] = useState(1);
  const [pageExp, setPageExp] = useState(1);
  const [pageProd, setPageProd] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [writingOff, setWritingOff] = useState(false);
  const [managing, setManaging] = useState(null); // { id_producto, nombre, id_sucursal }
  const [notice, setNotice] = useState(null);

  const branchParam = branchId ? `&id_sucursal=${branchId}` : "";
  const soon = useFetch(
    `${ENDPOINTS.INVENTORY_EXPIRING}?days=${days}${branchParam}`,
  );
  const expired = useFetch(
    `${ENDPOINTS.INVENTORY_EXPIRED}${branchId ? `?id_sucursal=${branchId}` : ""}`,
  );
  // Todos los productos registrados en inventario (con o sin lotes)
  const products = useFetch(
    view === "productos"
      ? `${ENDPOINTS.INVENTORY}${branchId ? `?id_sucursal=${branchId}` : ""}`
      : null,
  );

  useEffect(() => {
    if (notice) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [notice]);

  const term = search.trim().toLowerCase();
  const byName = (name) => !term || String(name ?? "").toLowerCase().includes(term);

  const soonAll = toList(soon.data);
  const expiredAll = toList(expired.data);
  const soonRows = soonAll.filter((r) => byName(r.nombre_producto));
  const expiredRows = expiredAll.filter((r) => byName(r.nombre_producto));
  const productRows = toList(products.data).filter((r) => byName(r.producto_nombre));

  const units = (rows) => rows.reduce((s, r) => s + (r.cantidad ?? 0), 0);
  const urgent = soonAll.filter((r) => r.dias_para_vencer <= 30);

  const soonPage = paginate(soonRows, pageSoon);
  const expPage = paginate(expiredRows, pageExp);
  const prodPage = paginate(productRows, pageProd);

  const refetchAll = () => {
    soon.refetch();
    expired.refetch();
    if (view === "productos") products.refetch();
  };

  const resetPages = () => {
    setPageSoon(1);
    setPageExp(1);
    setPageProd(1);
  };

  const confirmWriteOff = async () => {
    setWritingOff(true);
    try {
      const res = await apiFetch(
        `${ENDPOINTS.INVENTORY_EXPIRED}/write-off${branchId ? `?id_sucursal=${branchId}` : ""}`,
        { method: "POST" },
      );
      setNotice({
        type: "success",
        text: `${plural(res.lotes_dados_de_baja, "lote dado", "lotes dados")} de baja. El stock vencido salió del inventario.`,
      });
      refetchAll();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    } finally {
      setWritingOff(false);
      setConfirming(false);
    }
  };

  const baseColumns = [
    { key: "nombre_producto", label: "Producto" },
    {
      key: "id_sucursal",
      label: "Sucursal",
      render: (r) => branchName[r.id_sucursal] ?? `#${r.id_sucursal}`,
    },
    { key: "numero_lote", label: "Lote" },
    {
      key: "fecha_vencimiento",
      label: "Vence",
      render: (r) => fmtDate(r.fecha_vencimiento),
    },
    { key: "cantidad", label: "Unidades" },
  ];

  const estado = {
    key: "estado",
    label: "Estado",
    render: (r) => {
      const st = expiryStatus(r.dias_para_vencer);
      return <Badge variant={st.variant}>{st.label}</Badge>;
    },
  };

  const soonColumns = [
    ...baseColumns,
    {
      key: "dias_para_vencer",
      label: "Faltan",
      render: (r) =>
        r.dias_para_vencer === 0
          ? "Hoy"
          : plural(r.dias_para_vencer, "día", "días"),
    },
    estado,
  ];

  const expiredColumns = [
    ...baseColumns,
    {
      key: "dias_para_vencer",
      label: "Venció hace",
      render: (r) => plural(Math.abs(r.dias_para_vencer), "día", "días"),
    },
    estado,
  ];

  const productColumns = [
    { key: "producto_nombre", label: "Producto" },
    {
      key: "id_sucursal",
      label: "Sucursal",
      render: (r) => branchName[r.id_sucursal] ?? r.sucursal_nombre ?? `#${r.id_sucursal}`,
    },
    { key: "cantidad", label: "Stock" },
    {
      key: "lotes_con_stock",
      label: "Lotes",
      render: (r) => r.lotes_con_stock ?? 0,
    },
    {
      key: "proximo_vencimiento",
      label: "Próx. vencimiento",
      render: (r) => (r.proximo_vencimiento ? fmtDate(r.proximo_vencimiento) : "—"),
    },
    {
      key: "estado",
      label: "Estado",
      render: (r) => <ProductoEstado r={r} />,
    },
  ];

  const manageButton = (item) => (
    <button
      onClick={() => setManaging(item)}
      className={iconAction}
      title="Gestionar lotes de este producto"
      aria-label={`Gestionar lotes de ${item.nombre}`}
    >
      <Layers className="h-4 w-4" />
    </button>
  );

  const renderLotActions = (r) =>
    manageButton({
      id_producto: r.id_producto,
      nombre: r.nombre_producto,
      id_sucursal: r.id_sucursal,
    });

  const renderProductActions = (r) =>
    manageButton({
      id_producto: r.id_producto,
      nombre: r.producto_nombre,
      id_sucursal: r.id_sucursal,
    });

  const stat = (loading, text) => (loading ? "—" : text);
  const fetchError =
    view === "productos" ? products.error || expired.error : soon.error || expired.error;

  return (
    <>
      <PageHeader
        eyebrow="Operaciones de farmacia"
        title="Vencimientos"
        subtitle="Controla los lotes por vencer y retira los que ya vencieron."
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3">
            <ActionButton to="/admin/inventario">Ir al inventario</ActionButton>
            {expiredAll.length > 0 && (
              <ActionButton variant="primary" onClick={() => setConfirming(true)}>
                Dar de baja vencidos
              </ActionButton>
            )}
          </div>
        }
      />

      {notice && (
        <Notice
          type={notice.type}
          onClose={() => setNotice(null)}
          className="mt-6"
        >
          {notice.text}
        </Notice>
      )}

      <Panel
        icon={CalendarClock}
        title="Espacio de vencimientos"
        subtitle={
          branchId
            ? `Lotes con stock en ${branchName[branchId] ?? "la sucursal"}.`
            : "Lotes con stock en todas las sucursales."
        }
      >
        <div className="mb-6 grid gap-3 sm:gap-4 md:grid-cols-3">
          <StatCard
            label="Vencidos con stock"
            value={stat(
              expired.loading,
              `${plural(expiredAll.length, "lote", "lotes")} · ${plural(units(expiredAll), "unidad", "unidades")}`,
            )}
          />
          <StatCard
            label="Vencen en 30 días o menos"
            value={stat(
              soon.loading,
              `${plural(urgent.length, "lote", "lotes")} · ${plural(units(urgent), "unidad", "unidades")}`,
            )}
          />
          <StatCard
            label={
              days === 3650
                ? "Lotes con stock (todos)"
                : `Vencen en ${days} días o menos`
            }
            value={stat(
              soon.loading,
              `${plural(soonAll.length, "lote", "lotes")} · ${plural(units(soonAll), "unidad", "unidades")}`,
            )}
          />
        </div>

        <div className="mb-4 flex gap-2">
          <button className={tabClass(view === "lotes")} onClick={() => setView("lotes")}>
            Lotes
          </button>
          <button
            className={tabClass(view === "productos")}
            onClick={() => {
              setView("productos");
              setPageProd(1);
            }}
          >
            Todos los productos
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-background p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
            Sucursal
            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                resetPages();
              }}
              className={selectClass}
            >
              <option value="">Todas las sucursales</option>
              {branches.map((b) => (
                <option key={b.id_sucursal} value={b.id_sucursal}>
                  {b.nombre}
                </option>
              ))}
            </select>
          </label>

          {view === "lotes" && (
            <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
              Mostrar lotes que vencen en
              <select
                value={days}
                onChange={(e) => {
                  setDays(Number(e.target.value));
                  setPageSoon(1);
                }}
                className={selectClass}
              >
                {WINDOWS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-brand-muted-foreground sm:min-w-[220px]">
            Buscar producto
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPages();
                }}
                placeholder="Nombre del producto..."
                className="h-10 w-full rounded-lg border border-brand-border bg-brand-card pl-9 pr-3 text-sm text-brand-foreground placeholder:text-brand-muted-foreground focus:border-brand-primary focus:outline-none"
              />
            </span>
          </label>
        </div>

        {fetchError ? (
          <Notice type="error">
            No se pudieron cargar los datos: {fetchError}
            <button onClick={refetchAll} className="ml-2 font-semibold underline">
              Reintentar
            </button>
          </Notice>
        ) : view === "productos" ? (
          products.loading ? (
            <p className="py-8 text-center text-brand-muted-foreground">Cargando…</p>
          ) : (
            <>
              <DataTable
                columns={productColumns}
                rows={prodPage.slice}
                rowKey="id_inventario"
                renderActions={renderProductActions}
                empty={
                  term
                    ? "No hay productos que coincidan con la búsqueda."
                    : "No hay productos en el inventario."
                }
              />
              <Pagination
                page={prodPage.current}
                pages={prodPage.pages}
                total={productRows.length}
                onChange={setPageProd}
              />
            </>
          )
        ) : (
          <div className="flex flex-col gap-8">
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-brand-foreground">
                <Trash2 className="h-4 w-4 text-brand-danger" />
                Vencidos con stock
              </h3>
              {expired.loading ? (
                <p className="py-8 text-center text-brand-muted-foreground">Cargando…</p>
              ) : (
                <>
                  <DataTable
                    columns={expiredColumns}
                    rows={expPage.slice}
                    rowKey="id_lote"
                    renderActions={renderLotActions}
                    empty={
                      term
                        ? "No hay lotes vencidos que coincidan con la búsqueda."
                        : "No hay lotes vencidos con stock."
                    }
                  />
                  <Pagination
                    page={expPage.current}
                    pages={expPage.pages}
                    total={expiredRows.length}
                    onChange={setPageExp}
                  />
                </>
              )}
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-brand-foreground">
                <CalendarClock className="h-4 w-4 text-brand-warning" />
                {days === 3650
                  ? "Todos los lotes con stock"
                  : `Por vencer (próximos ${days} días)`}
              </h3>
              {soon.loading ? (
                <p className="py-8 text-center text-brand-muted-foreground">Cargando…</p>
              ) : (
                <>
                  <DataTable
                    columns={soonColumns}
                    rows={soonPage.slice}
                    rowKey="id_lote"
                    renderActions={renderLotActions}
                    empty={
                      term
                        ? "No hay lotes que coincidan con la búsqueda."
                        : "No hay lotes en este rango. Prueba “Todos los lotes” o la pestaña “Todos los productos”."
                    }
                  />
                  <Pagination
                    page={soonPage.current}
                    pages={soonPage.pages}
                    total={soonRows.length}
                    onChange={setPageSoon}
                  />
                </>
              )}
            </section>
          </div>
        )}
      </Panel>

      {confirming && (
        <ConfirmDialog
          title="¿Dar de baja los lotes vencidos?"
          message={`Se retirarán ${plural(units(expiredAll), "unidad", "unidades")} de ${plural(expiredAll.length, "lote vencido", "lotes vencidos")}${branchId ? ` en ${branchName[branchId] ?? "la sucursal"}` : " en todas las sucursales"}. El stock bajará y quedará registrado en el historial de movimientos como "vencimiento".`}
          confirmLabel="Dar de baja"
          loading={writingOff}
          onConfirm={confirmWriteOff}
          onCancel={() => setConfirming(false)}
        />
      )}

      {managing && (
        <LotesModal
          item={{ id_producto: managing.id_producto, nombre: managing.nombre }}
          branchId={managing.id_sucursal}
          branchName={branchName[managing.id_sucursal]}
          onClose={() => setManaging(null)}
          onChanged={refetchAll}
        />
      )}
    </>
  );
}
