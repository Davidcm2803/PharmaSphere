import { Link, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Placeholder from "./pages/admin/Placeholder";
import { adminNav } from "./config/adminNav";

function Home() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Inicio</h1>
      <Link to="/admin" className="text-brand-primary underline">
        Ir al panel de administración
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Placeholder title="Login (tareas #2 y #3)" />} />

      <Route element={<ProtectedRoute roles={["admin", "empleado"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          {adminNav.map(({ path, label }) => (
            <Route key={path} path={path} element={<Placeholder title={label} />} />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}