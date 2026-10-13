import { Link, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Placeholder from "./pages/admin/Placeholder";
import Login from "./pages/Login";
import Inventario from "./pages/admin/Inventario";
import Sucursales from "./pages/admin/Sucursales";
import Proveedores from "./pages/admin/Proveedores";
import Empleados from "./pages/admin/Empleados";
import { adminNav } from "./config/adminNav";

// Pantallas reales por ruta; las que no estén aquí siguen como Placeholder
const adminPages = {
  inventario: Inventario,
  sucursales: Sucursales,
  proveedores: Proveedores,
  empleados: Empleados,
};

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
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute roles={["admin", "empleado"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          {adminNav.map(({ path, label }) => {
            const Page = adminPages[path];
            return (
              <Route
                key={path}
                path={path}
                element={Page ? <Page /> : <Placeholder title={label} />}
              />
            );
          })}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
