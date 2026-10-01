import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { LogOut, Menu, Store, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const adminNav = [
  { path: "dashboard", label: "Dashboard" },
  { path: "productos", label: "Productos" },
  { path: "inventario", label: "Inventario" },
  { path: "ventas", label: "Ventas" },
  { path: "compras", label: "Compras" },
  { path: "proveedores", label: "Proveedores" },
  { path: "clientes", label: "Clientes" },
  { path: "recetas", label: "Recetas" },
  { path: "reportes", label: "Reportes" },
  { path: "copilot", label: "Copilot" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Cierra el menú al cambiar de ruta
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Cierra con la tecla Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-brand-background text-brand-foreground">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 transform overflow-y-auto border-r border-brand-border bg-brand-card p-4 transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="text-xl font-bold text-brand-primary">
            PharmaSphere
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-brand-muted-foreground transition-colors hover:text-brand-foreground lg:hidden"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {adminNav.map(({ path, label }) => (
            <NavLink
              key={path}
              to={`/admin/${path}`}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-accent text-brand-accent-foreground"
                    : "text-brand-muted-foreground hover:bg-brand-muted"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 lg:ml-56">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-brand-border bg-brand-card px-4 text-sm text-brand-muted-foreground sm:px-6 lg:justify-end">
          <button
            onClick={() => setSidebarOpen(true)}
            className="transition-colors hover:text-brand-foreground lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>

          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 transition-colors hover:text-brand-foreground"
              aria-label="Ver tienda"
            >
              <Store size={16} />
              <span className="hidden sm:inline">Ver tienda</span>
            </Link>

            <span className="hidden max-w-[10rem] truncate font-medium text-brand-foreground md:inline">
              {user?.nombre || user?.correo}
            </span>
            <span className="rounded-full bg-brand-accent px-2 py-0.5 text-xs font-medium capitalize text-brand-accent-foreground">
              {user?.rol}
            </span>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 transition-colors hover:text-brand-foreground"
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}