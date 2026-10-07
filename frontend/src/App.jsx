import { Navigate, Route, Routes } from "react-router-dom";
import PublicLayout from "./components/public/PublicLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoutes from "./pages/Admin/AdminRoutes";
import Home from "./pages/Public/home";
import ShopPage from "./pages/Public/ShopPage";
import ProductDetailPage from "./pages/Public/ProductDetailPage";
import CategoriesPage from "./pages/Public/CategoriesPage";
import WellnessPage from "./pages/Public/WellnessPage";
import AboutPage from "./pages/Public/AboutPage";

// BrowserRouter y AuthProvider viven en main.jsx

export default function App() {
  return (
    <Routes>
      {/* Sitio publico, Navbar + Footer los pone PublicLayout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/shop/:id" element={<ProductDetailPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/wellness" element={<WellnessPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>

      {/* Admin: solo admin y empleado. Para algo solo de admin: roles={["admin"]} */}
      <Route element={<ProtectedRoute roles={["admin", "empleado"]} />}>
        <Route path="/admin/*" element={<AdminRoutes />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}