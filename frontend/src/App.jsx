import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home/home";
import AdminLayout, { adminNav } from "./components/layout/AdminLayout";
import Placeholder from "./pages/Admin/Placeholder";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// BrowserRouter y AuthProvider viven en main.jsx

export default function App() {
  return (
    <Routes>
      {/* Cliente  */}
      <Route path="/" element={<Home />} />

      {/* Admin: solo admin y empleado. Para algo solo de admin: roles={["admin"]} ejemplo la vista de ingresar nuevo empleado */}
      <Route element={<ProtectedRoute roles={["admin", "empleado"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          {adminNav.map(({ path, label }) => (
            <Route
              key={path}
              path={path}
              element={<Placeholder title={label} />}
            />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}