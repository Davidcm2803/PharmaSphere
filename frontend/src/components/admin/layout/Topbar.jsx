import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bell, LogOut, Menu, Search } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "../../../lib/utils";
import { useAuth } from "../../../context/AuthContext";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
};

const initials = (user) =>
  (user?.nombre || user?.correo || "?")
    .split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");

const iconBtn =
  "flex h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-card text-brand-muted-foreground transition-colors hover:text-brand-foreground";

export default function Topbar({ onMenu, onLogout }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const firstName = (user?.nombre || user?.correo || "").split(/[\s@]/)[0];
  const date = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

  // Si el filtro se limpia desde la página, vacía también el input
  const urlQ = params.get("q") ?? "";
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setQuery(urlQ);
  }

  // Lleva la busqueda a la lista de productos
  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/admin/productos?q=${encodeURIComponent(q)}` : "/admin/productos");
  };

  return (
    <header className="sticky top-0 z-20 flex h-[92px] items-center justify-between gap-4 border-b border-brand-border bg-brand-card px-5 sm:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onMenu} aria-label="Abrir menú" className="text-brand-muted-foreground lg:hidden">
          <Menu size={22} />
        </button>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-base font-bold text-brand-foreground">{greeting()}, {firstName}</p>
          <p className="hidden truncate text-sm capitalize sm:block text-brand-muted-foreground">{date}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <form
          role="search"
          onSubmit={onSearch}
          className="relative hidden w-[280px] md:block"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en el panel..."
            aria-label="Buscar en el panel"
            className={cn(
              "h-10 w-full rounded-lg border border-brand-border bg-brand-card pl-10 pr-4 text-sm",
              "text-brand-foreground placeholder:text-brand-muted-foreground",
              "transition-colors hover:border-brand-primary focus:border-brand-primary focus:outline-none",
            )}
          />
        </form>

        <button className={`${iconBtn} relative`} aria-label="Notificaciones">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-danger" />
        </button>

        <span
          title={user?.nombre || user?.correo}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-success-soft text-sm font-bold text-brand-accent-foreground"
        >
          {initials(user)}
        </span>

        <button onClick={onLogout} className={iconBtn} aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}