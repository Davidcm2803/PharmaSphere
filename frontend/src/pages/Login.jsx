import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión, no tiene sentido ver el login
  if (user) {
    return <Navigate to={user.rol === "cliente" ? "/" : "/admin"} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedUser = await login(correo.trim(), password);
      navigate(loggedUser.rol === "cliente" ? "/" : "/admin", {
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-background p-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-brand-border bg-brand-card p-6 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-bold text-brand-primary">
            PharmaSphere
          </h1>
          <p className="text-sm text-brand-muted-foreground">
            Inicia sesión para continuar
          </p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <Input
          id="correo"
          label="Correo"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="admin@pharmasphere.com"
          required
        />
        <Input
          id="password"
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button type="submit" loading={loading}>
          Iniciar sesión
        </Button>
      </form>
    </div>
  );
}
