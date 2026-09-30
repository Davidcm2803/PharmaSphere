import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Pill, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

const Field = ({ icon: Icon, ...props }) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted-foreground" />
    <input
      className={cn(
        "w-full pl-10 pr-4 py-2.5 rounded-lg text-sm",
        "bg-brand-background border border-brand-border",
        "text-brand-foreground placeholder:text-brand-muted-foreground",
        "focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-ring/20 transition-colors",
      )}
      {...props}
    />
  </div>
);

export const AuthModal = ({ onClose, onSuccess }) => {
  const { login, register } = useAuth();

  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ nombre: "", correo: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const nombre = form.nombre.trim();
    const correo = form.correo.trim().toLowerCase();
    const password = form.password;

    if (!correo) return setError("Debe ingresar un correo electrónico.");
    if (!password) return setError("Debe ingresar una contraseña.");

    if (mode === "register") {
      if (nombre.length < 2)
        return setError("El nombre debe tener al menos 2 caracteres.");
      if (password.length < 8)
        return setError("La contraseña debe tener al menos 8 caracteres.");
    }

    setLoading(true);
    try {
      const user =
        mode === "login"
          ? await login(correo, password)
          : await register(nombre, correo, password);

      onSuccess?.(user);
      onClose?.();
    } catch (err) {
      // apiFetch ya trae el message del backend
      setError(err.message || "No fue posible continuar.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError("");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-brand-card border border-brand-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-8">
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-5 right-5 p-1.5 rounded-lg text-brand-muted-foreground hover:text-brand-foreground hover:bg-brand-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-brand-primary-foreground">
                <Pill className="w-4 h-4 -rotate-45" />
              </div>
              <span className="text-lg font-bold text-brand-foreground">
                Pharma<span className="text-brand-primary">IQ</span>
              </span>
            </div>
            <p className="text-sm text-brand-muted-foreground">
              {mode === "login"
                ? "Inicia sesión para continuar"
                : "Crea tu cuenta gratis"}
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
            {mode === "register" && (
              <Field
                icon={User}
                type="text"
                placeholder="Nombre completo"
                autoComplete="name"
                value={form.nombre}
                onChange={set("nombre")}
              />
            )}
            <Field
              icon={Mail}
              type="email"
              placeholder="Correo electrónico"
              autoComplete="email"
              value={form.correo}
              onChange={set("correo")}
            />
            <Field
              icon={Lock}
              type="password"
              placeholder={
                mode === "register"
                  ? "Contraseña (mínimo 8 caracteres)"
                  : "Contraseña"
              }
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={form.password}
              onChange={set("password")}
            />

            {error && (
              <p
                role="alert"
                className="text-xs text-brand-danger bg-brand-danger/10 border border-brand-danger/20 rounded-lg px-3 py-2"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium mt-1",
                "bg-brand-primary text-brand-primary-foreground",
                "hover:bg-brand-primary-dark transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Iniciar sesión" : "Registrarme"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-brand-muted-foreground mt-5">
            {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="text-brand-primary hover:underline font-medium"
            >
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};