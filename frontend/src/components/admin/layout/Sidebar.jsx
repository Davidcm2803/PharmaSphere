import { Link } from "react-router-dom";
import {
  Pill, X, LayoutGrid, Package, ChartColumn, ShoppingBag, Truck,
  Clock, FileText, Users, ClipboardList,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import BranchSelector from "./BranchSelector";
import SidebarItem from "./SidebarItem";

// badge son opcionales, se pueden implementar luego con datos reales del back
const NAV_ITEMS = [
  { path: "dashboard", label: "Resumen", icon: LayoutGrid },
  { path: "inventario", label: "Inventario", icon: Package },
  { path: "productos", label: "Medicamentos", icon: Pill },
  { path: "ventas", label: "Ventas", icon: ChartColumn },
  { path: "compras", label: "Compras", icon: ShoppingBag },
  { path: "proveedores", label: "Proveedores", icon: Truck },
  { path: "clientes", label: "Clientes", icon: Users },
  { path: "recetas", label: "Recetas", icon: ClipboardList },
  { path: "vencimientos", label: "Vencimientos", icon: Clock },
  { path: "reportes", label: "Reportes", icon: FileText },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col gap-6 overflow-y-auto border-r border-brand-border bg-brand-card px-4 py-6 transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2">
          <Link to="/admin" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary-dark text-brand-primary-foreground">
              <Pill className="h-5 w-5 -rotate-45" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold text-brand-foreground">
                Pharma<span className="text-brand-primary">IQ</span>
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.2em] text-brand-muted-foreground">
                PHARMACY INTELLIGENCE
              </span>
            </span>
          </Link>
          <button onClick={onClose} aria-label="Cerrar menú" className="text-brand-muted-foreground lg:hidden">
            <X size={20} />
          </button>
        </div>

        <BranchSelector />

        <nav className="flex flex-1 flex-col gap-1" aria-label="Administración">
          {NAV_ITEMS.map((item) => (
            <SidebarItem key={item.path} {...item} />
          ))}
        </nav>
      </aside>
    </>
  );
}