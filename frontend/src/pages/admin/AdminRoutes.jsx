import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../../components/admin/layout/AdminLayout";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import Placeholder from "./Placeholder";
import Medicines from "./Medicines";
import ProductCreate from "./ProductCreate";
import ProductEdit from "./ProductEdit";
import Inventario from "./Inventario";
import Proveedores from "./Proveedores";
import Sucursales from "./Sucursales";
import Empleados from "./Empleados";

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Placeholder title="Resumen" />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="productos" element={<Medicines />} />
        <Route path="productos/nuevo" element={<ProductCreate />} />
        <Route path="productos/:id/editar" element={<ProductEdit />} />
        <Route path="ventas" element={<Placeholder title="Ventas" />} />
        <Route path="compras" element={<Placeholder title="Compras" />} />
        <Route path="proveedores" element={<Proveedores />} />
        <Route path="clientes" element={<Placeholder title="Clientes" />} />
        <Route path="recetas" element={<Placeholder title="Recetas" />} />
        <Route path="vencimientos" element={<Placeholder title="Vencimientos" />} />
        <Route path="reportes" element={<Placeholder title="Reportes" />} />
        <Route path="copilot" element={<Placeholder title="Copilot" />} />

        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="sucursales" element={<Sucursales />} />
          <Route path="empleados" element={<Empleados />} />
        </Route>
      </Route>
    </Routes>
  );
}