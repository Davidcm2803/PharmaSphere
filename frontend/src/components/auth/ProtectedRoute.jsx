import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Uso <Route element={<ProtectedRoute roles={["admin", "empleado"]} />}>
export default function ProtectedRoute({ roles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-background text-sm text-brand-muted-foreground">
        Cargando…
      </div>
    );
  }

  // El login es un modal
  if (!user) return <Navigate to="/" replace />;
  if (roles.length > 0 && !roles.includes(user.rol)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}