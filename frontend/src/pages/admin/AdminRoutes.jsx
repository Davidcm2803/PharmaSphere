import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../../components/admin/layout/AdminLayout";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import Placeholder from "./Placeholder";
import Dashboard from "./Dashboard";
import Medicines from "./Medicines";
import ProductCreate from "./ProductCreate";
import ProductEdit from "./ProductEdit";
import Inventario from "./Inventario";
import Proveedores from "./Proveedores";
import Sucursales from "./Sucursales";
import Empleados from "./Empleados";
import PuntoDeVenta from "./PuntoDeVenta";
import Ventas from "./Ventas";
import VentaDetalle from "./VentaDetalle";
import Clientes from "./Clientes";
import Recetas from "./Recetas";

function AdminHome() {
  const { user } = useAuth();
  return <Navigate to={user?.rol === "admin" ? "dashboard" : "punto-de-venta"} replace />;
}

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminHome />} />

        <Route element={<ProtectedRoute roles={["admin", "empleado"]} />}>
          <Route path="productos" element={<Medicines />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="punto-de-venta" element={<PuntoDeVenta />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="recetas" element={<Recetas />} />
          <Route path="vencimientos" element={<Placeholder title="Vencimientos" />} />
        </Route>

        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="productos/nuevo" element={<ProductCreate />} />
          <Route path="productos/:id/editar" element={<ProductEdit />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="ventas/:id" element={<VentaDetalle />} />
          <Route path="compras" element={<Placeholder title="Compras" />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="reportes" element={<Placeholder title="Reportes" />} />
          <Route path="copilot" element={<Placeholder title="Copilot" />} />
          <Route path="sucursales" element={<Sucursales />} />
          <Route path="empleados" element={<Empleados />} />
        </Route>
      </Route>
    </Routes>
  );
}