import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Bus, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
//import { registerWithEmail, continueWithGoogle, loginWithEmail } from "Aca va la ruta del services de firebase";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022" />
    <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00" />
    <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF" />
    <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900" />
  </svg>
);

const Field = ({ icon: Icon, ...props }) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
    <input
      className={cn(
        "w-full pl-10 pr-4 py-2.5 rounded-lg text-sm",
        "bg-background border border-border",
        "text-foreground placeholder:text-foreground/30",
        "focus:outline-none focus:border-primary transition-colors",
      )}
      {...props}
    />
  </div>
);

const ProviderBtn = ({ icon, label, onClick, loading }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={cn(
      "w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium",
      "border border-border bg-card hover:bg-background",
      "text-foreground transition-colors",
      "disabled:opacity-50 disabled:cursor-not-allowed",
    )}
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
    {label}
  </button>
);

const Divider = () => (
  <div className="flex items-center gap-3 my-5">
    <div className="flex-1 h-px bg-border" />
    <span className="text-xs text-foreground/30">o continúa con</span>
    <div className="flex-1 h-px bg-border" />
  </div>
);

export const AuthModal = ({ onClose, onSuccess }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleProvider = async (provider) => {
    setError("");

    if (provider !== "google") {
      setError("Microsoft todavía no está habilitado.");
      return;
    }

    setLoading("google");

    try {
      const result = await continueWithGoogle();

      onSuccess?.(result.profile);
      onClose?.();
    } catch (error) {
      console.error("Error con Google:", error);

      const firebaseErrors = {
        "auth/popup-closed-by-user":
          "Cerraste la ventana de Google.",
        "auth/popup-blocked":
          "El navegador bloqueó la ventana de Google.",
        "auth/cancelled-popup-request":
          "La solicitud de Google fue cancelada.",
        "auth/account-exists-with-different-credential":
          "Este correo ya está registrado con otro método.",
        "auth/network-request-failed":
          "No fue posible conectar con Firebase.",
      };

      setError(
        firebaseErrors[error.code] ??
        error.message ??
        "No fue posible continuar con Google.",
      );
    } finally {
      setLoading(null);
    }
  };

  const handleEmail = async () => {
    setError("");

    const username = form.username.trim();
    const email = form.email.trim();
    const password = form.password;

    if (!email) {
      setError("Debe ingresar un correo electrónico.");
      return;
    }

    if (!password) {
      setError("Debe ingresar una contraseña.");
      return;
    }

    if (mode === "register" && !username) {
      setError("Debe ingresar un nombre de usuario.");
      return;
    }

    if (mode === "register" && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading("email");

    try {
      const result = mode === "login"
        ? await loginWithEmail({ email, password })
        : await registerWithEmail({ username, email, password });

      onSuccess?.(result.profile);
      onClose?.();
    } catch (error) {
      console.error("Error de autenticación:", error);

      const firebaseErrors = {
        "auth/email-already-in-use": "Este correo ya está registrado.",
        "auth/invalid-email": "El correo electrónico no es válido.",
        "auth/weak-password": "La contraseña es demasiado débil.",
        "auth/operation-not-allowed": "El acceso con correo no está habilitado.",
        "auth/network-request-failed": "No fue posible conectar con Firebase.",
        "auth/invalid-credential": "El correo o la contraseña son incorrectos.",
        "auth/user-not-found": "No existe una cuenta con este correo.",
        "auth/wrong-password": "La contraseña es incorrecta.",
        "auth/user-disabled": "Esta cuenta está deshabilitada.",
        "auth/too-many-requests": "Demasiados intentos. Inténtelo más tarde.",
      };

      setError(firebaseErrors[error.code] ?? error.message ?? "No fue posible iniciar sesión.");
    } finally {
      setLoading(null);
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
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">

        <div className="p-8">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-background transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bus className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-foreground">
                506<span className="font-black">Tracker</span>
              </span>
            </div>
            <p className="text-sm text-foreground/40">
              {mode === "login" ? "Inicia sesión para continuar" : "Crea tu cuenta gratis"}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <ProviderBtn
              icon={<GoogleIcon />}
              label="Continuar con Google"
              onClick={() => handleProvider("google")}
              loading={loading === "google"}
            />
            <ProviderBtn
              icon={<MicrosoftIcon />}
              label="Continuar con Microsoft"
              onClick={() => handleProvider("microsoft")}
              loading={loading === "microsoft"}
            />
          </div>

          <Divider />

          <div className="flex flex-col gap-3">
            {mode === "register" && (
              <Field
                icon={User}
                type="text"
                placeholder="Nombre de usuario"
                value={form.username}
                onChange={set("username")}
              />
            )}
            <Field
              icon={Mail}
              type="email"
              placeholder="Correo electrónico"
              value={form.email}
              onChange={set("email")}
            />
            <Field
              icon={Lock}
              type="password"
              placeholder="Contraseña"
              value={form.password}
              onChange={set("password")}
              onKeyDown={(e) => e.key === "Enter" && handleEmail()}
            />

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleEmail}
              disabled={!!loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium mt-1",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 transition-opacity",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {loading === "email" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Iniciar sesión" : "Registrarme"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-foreground/40 mt-5">
            {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              onClick={switchMode}
              className="text-primary hover:underline font-medium"
            >
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};