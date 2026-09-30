import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Pill,
  Search,
  ShoppingCart,
  LogIn,
  LogOut,
  LayoutDashboard,
  Home,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { AuthModal } from "./AuthModal";
import { useAuth } from "../../context/AuthContext";

const NAV_LINKS = [
  { to: "/shop", label: "Shop" },
  { to: "/categories", label: "Categories" },
  { to: "/wellness", label: "Wellness hub" },
  { to: "/about", label: "About us" },
];

// Roles del backend que pueden entrar al panel. "cliente" nunca lo ve.
const STAFF_ROLES = ["admin", "empleado"];
const THEME_KEY = "theme";

const getInitials = (user) =>
  (user?.nombre || user?.correo || "?")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const getInitialDark = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === "dark";
  } catch {
    // localStorage no disponible
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const linkClass = ({ isActive }) =>
  cn(
    "text-[15px] font-semibold transition-colors",
    isActive
      ? "text-brand-primary"
      : "text-brand-muted-foreground hover:text-brand-foreground",
  );

// Estilo compartido por el botón de login, logout y tema
const outlineBtn = cn(
  "flex items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors",
  "border-brand-border bg-brand-card text-brand-muted-foreground",
  "hover:bg-brand-muted hover:text-brand-foreground",
);

// Items de la barra inferior (mobile)
const bottomItem = (active = false) =>
  cn(
    "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
    active
      ? "text-brand-primary"
      : "text-brand-muted-foreground hover:text-brand-foreground",
  );

export default function Navbar({ cartCount = 0 }) {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(getInitialDark);

  const isStaff = STAFF_ROLES.includes(user?.rol);

  // El modo oscuro vive solo mientras el Navbar está montado.
  // Como el Navbar solo está en las páginas públicas, el admin nunca lo recibe.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {
      // ignorar
    }
    return () => document.documentElement.classList.remove("dark");
  }, [dark]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  };

  // Siempre se entra como cliente. Admin y empleado pasan directo al panel.
  const handleAuthSuccess = (loggedUser) => {
    if (STAFF_ROLES.includes(loggedUser?.rol)) navigate("/admin");
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Sin borde fuerte: gris fino, y verde con hover o al escribir
  const searchForm = (
    <form onSubmit={handleSearch} role="search" className="relative w-full">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search medicines, vitamins, wellness..."
        aria-label="Buscar productos"
        className={cn(
          "h-10 w-full rounded-lg border border-brand-border bg-brand-card pl-10 pr-4 text-sm",
          "text-brand-foreground placeholder:text-brand-muted-foreground",
          "transition-colors hover:border-brand-primary focus:border-brand-primary focus:outline-none",
        )}
      />
    </form>
  );

  return (
    <>
      {/* ───────── Barra superior ───────── */}
      <header className="sticky top-0 z-50 border-b border-brand-border bg-brand-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8 xl:h-[88px]">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary text-brand-primary-foreground xl:h-11 xl:w-11">
              <Pill className="h-5 w-5 -rotate-45" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold text-brand-foreground">
                Pharma<span className="text-brand-primary">IQ</span>
              </span>
              <span className="hidden text-[10px] font-semibold tracking-[0.2em] text-brand-muted-foreground sm:block">
                PHARMACY INTELLIGENCE
              </span>
            </span>
          </Link>

          {/* Links (solo desktop) */}
          <nav className="hidden items-center gap-7 xl:flex" aria-label="Principal">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className={linkClass}>
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Buscador (solo desktop) */}
          <div className="ml-auto hidden max-w-[480px] flex-1 xl:block">
            {searchForm}
          </div>

          {/* Acciones: en mobile solo queda el toggle */}
          <div className="ml-auto flex items-center gap-2.5 xl:ml-0">
            {/* Sesión (solo desktop) */}
            <div className="hidden items-center gap-2.5 xl:flex">
              {loading ? (
                <div className="h-10 w-36 animate-pulse rounded-lg bg-brand-muted" />
              ) : user ? (
                <>
                  <span
                    title={user.nombre || user.correo}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent text-sm font-bold text-brand-accent-foreground"
                  >
                    {getInitials(user)}
                  </span>

                  {isStaff && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-1.5 px-1 text-sm font-semibold text-brand-muted-foreground transition-colors hover:text-brand-foreground"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Admin
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    title="Cerrar sesión"
                    aria-label="Cerrar sesión"
                    className={cn(outlineBtn, "h-10 w-10")}
                  >
                    <LogOut className="h-[18px] w-[18px]" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowModal(true)}
                  className={cn(outlineBtn, "h-10 px-4")}
                >
                  <LogIn className="h-4 w-4" />
                  Iniciar sesión
                </button>
              )}
            </div>

            {/* Modo claro / oscuro (siempre visible) */}
            <button
              onClick={() => setDark((d) => !d)}
              title={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              className={cn(outlineBtn, "h-10 w-10 shrink-0")}
            >
              {dark ? (
                <Sun className="h-[18px] w-[18px]" />
              ) : (
                <Moon className="h-[18px] w-[18px]" />
              )}
            </button>

            {/* Carrito (solo desktop) */}
            <Link
              to="/cart"
              aria-label={`Carrito, ${cartCount} productos`}
              className="relative hidden rounded-lg p-2 text-brand-foreground transition-colors hover:text-brand-primary xl:block"
            >
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-brand-primary-foreground">
                {cartCount}
              </span>
            </Link>
          </div>
        </div>

        {/* Buscador debajo del navbar (solo mobile) */}
        <div className="px-6 pb-3 sm:px-10 xl:hidden">{searchForm}</div>
      </header>

      {/* ───────── Barra inferior (solo mobile) ───────── */}
      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-brand-border bg-brand-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur xl:hidden"
      >
        <NavLink to="/" end className={({ isActive }) => bottomItem(isActive)}>
          <Home className="h-5 w-5" />
          Inicio
        </NavLink>

        <NavLink to="/cart" className={({ isActive }) => bottomItem(isActive)}>
          <span className="relative">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-bold text-brand-primary-foreground">
                {cartCount}
              </span>
            )}
          </span>
          Carrito
        </NavLink>

        {/* Solo aparece para admin y empleado */}
        {user && isStaff && (
          <NavLink to="/admin" className={({ isActive }) => bottomItem(isActive)}>
            <LayoutDashboard className="h-5 w-5" />
            Admin
          </NavLink>
        )}

        {/* Mientras se recupera la sesión no se muestra nada para evitar parpadeo */}
        {!loading &&
          (user ? (
            <button onClick={handleLogout} className={bottomItem()}>
              <LogOut className="h-5 w-5" />
              Salir
            </button>
          ) : (
            <button onClick={() => setShowModal(true)} className={bottomItem()}>
              <LogIn className="h-5 w-5" />
              Iniciar sesión
            </button>
          ))}
      </nav>

      {showModal && (
        <AuthModal
          onClose={() => setShowModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
}