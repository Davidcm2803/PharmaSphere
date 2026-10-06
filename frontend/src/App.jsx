import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home/home";
import AdminRoutes from "./pages/Admin/AdminRoutes";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// BrowserRouter y AuthProvider viven en main.jsx

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* Admin: solo admin y empleado. Para algo solo de admin: roles={["admin"]} */}
      <Route element={<ProtectedRoute roles={["admin", "empleado"]} />}>
        <Route path="/admin/*" element={<AdminRoutes />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}