import { NavLink, Outlet } from "react-router-dom";
import { adminNav } from "../../config/adminNav";

export default function AdminLayout() {
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
        <header className="flex h-14 items-center justify-end border-b border-brand-border bg-brand-card px-6 text-sm text-brand-muted-foreground">
          Usuario
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}