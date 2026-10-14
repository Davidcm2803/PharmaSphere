import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Ellipsis, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useAuth } from "../../../context/AuthContext";
import { visibleItems } from "./navItems";

// Navegación para cel
export default function BottomNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Al cambiar de ruta, cierra el menú (sin dejar estado viejo)
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }

  const items = visibleItems(user?.rol);
  const quick = items.filter((i) => i.quick);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const barItem =
    "flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium transition-all duration-200 active:scale-95";

  return (
    <div className="lg:hidden">
      {/* Fondo que se desenfoca al abrir */}
      <div
        onClick={close}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-label="Menú de navegación"
        aria-hidden={!open}
        style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom))" }}
        className={cn(
          "fixed inset-x-3 z-50 max-h-[65vh] overflow-y-auto rounded-[28px] bg-brand-card p-3 shadow-2xl transition-all duration-300 ease-out",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-6 scale-95 opacity-0",
        )}
      >
        <div className="grid grid-cols-3 gap-2.5">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={`/admin/${item.path}`}
                onClick={close}
                tabIndex={open ? 0 : -1}
                style={{ transitionDelay: open ? `${i * 25}ms` : "0ms" }}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center text-xs font-medium transition-all duration-300 active:scale-95",
                    open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                    isActive
                      ? "bg-brand-primary-dark text-brand-primary-foreground"
                      : "bg-brand-background text-brand-foreground",
                  )
                }
              >
                <Icon size={22} />
                <span className="leading-tight">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
      <nav
        aria-label="Navegación principal"
        style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        className="fixed inset-x-3 z-50 flex items-center gap-1 rounded-[28px] bg-brand-card p-2 shadow-2xl"
      >
        {quick.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={`/admin/${item.path}`}
              onClick={close}
              className={({ isActive }) =>
                cn(
                  barItem,
                  isActive
                    ? "bg-brand-success-soft text-brand-accent-foreground"
                    : "text-brand-muted-foreground",
                )
              }
            >
              <Icon size={20} />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          className={cn(
            barItem,
            open
              ? "bg-brand-primary-dark text-brand-primary-foreground"
              : "text-brand-muted-foreground",
          )}
        >
          {open ? <X size={20} /> : <Ellipsis size={20} />}
          <span>{open ? "Cerrar" : "Menú"}</span>
        </button>
      </nav>
    </div>
  );
}