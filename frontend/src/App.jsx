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
import CartPage from "./pages/Public/CartPage";
import CheckoutPage from "./pages/Public/CheckoutPage";
import OrderConfirmationPage from "./pages/Public/OrderConfirmationPage";

// Nuevas paginas del sprint
import MyOrdersPage from "./pages/Public/MyOrdersPage";
import ProfilePage from "./pages/Public/ProfilePage";

// BrowserRouter y AuthProvider viven en main.jsx

export default function App() {
  return (
    <Routes>
      {/* Sitio publico */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/shop/:id" element={<ProductDetailPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/wellness" element={<WellnessPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/cart" element={<CartPage />} />

        {/* Rutas exclusivas de clientes autenticados */}
        <Route element={<ProtectedRoute roles={["cliente"]} />}>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/exito" element={<OrderConfirmationPage />} />

          {/* Nuevas rutas */}
          <Route path="/mis-pedidos" element={<MyOrdersPage />} />
          <Route path="/mi-perfil" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Administracion */}
      <Route element={<ProtectedRoute roles={["admin", "empleado"]} />}>
        <Route path="/admin/*" element={<AdminRoutes />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
