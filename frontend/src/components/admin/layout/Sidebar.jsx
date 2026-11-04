import { Link } from "react-router-dom";
import { Pill } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import BranchSelector from "./BranchSelector";
import SidebarItem from "./SidebarItem";
import { visibleItems } from "./navItems";

export default function Sidebar() {
  const { user } = useAuth();
  const items = visibleItems(user?.rol);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col gap-3 overflow-hidden border-r border-brand-border bg-brand-card px-3 py-4 lg:flex">
      <div className="flex shrink-0 items-center px-2">
        <Link to="/admin" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary-dark text-brand-primary-foreground">
            <Pill className="h-4 w-4 -rotate-45" />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold text-brand-foreground">
              Pharma<span className="text-brand-primary">IQ</span>
            </span>
            <span className="block text-[9px] font-semibold tracking-[0.2em] text-brand-muted-foreground">
              PHARMACY INTELLIGENCE
            </span>
          </span>
        </Link>
      </div>

      <div className="shrink-0">
        <BranchSelector />
      </div>

      <nav
        className="-mr-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1 [scrollbar-width:thin] [&_a]:py-2"
        aria-label="Administración"
      >
        {items.map((item) => (
          <SidebarItem
            key={item.path}
            path={item.path}
            label={item.label}
            icon={item.icon}
            badge={item.badge}
          />
        ))}
      </nav>
    </aside>
  );
}