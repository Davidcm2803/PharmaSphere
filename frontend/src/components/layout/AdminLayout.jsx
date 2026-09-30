import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Store } from "lucide-react";
import { adminNav } from "../../config/adminNav";
import { useAuth } from "../../context/AuthContext";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-brand-background text-brand-foreground">
      <aside className="fixed inset-y-0 left-0 w-56 overflow-y-auto border-r border-brand-border bg-brand-card p-4">
        <span className="mb-6 block text-xl font-bold text-brand-primary">
          PharmaSphere
        </span>
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

      <div className="ml-56">
        <header className="flex h-14 items-center justify-end gap-4 border-b border-brand-border bg-brand-card px-6 text-sm text-brand-muted-foreground">
          <Link
            to="/"
            className="flex items-center gap-1.5 transition-colors hover:text-brand-foreground"
          >
            <Store size={16} />
            Ver tienda
          </Link>

          <span className="font-medium text-brand-foreground">
            {user?.nombre || user?.correo}
          </span>
          <span className="rounded-full bg-brand-accent px-2 py-0.5 text-xs font-medium capitalize text-brand-accent-foreground">
            {user?.rol}
          </span>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 transition-colors hover:text-brand-foreground"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}