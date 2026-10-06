import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { HomePage } from "./pages/HomePage";
import { CatalogPage } from "./pages/CatalogPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { ShopPage } from "./pages/ShopPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { CategoryPreviewPage } from "./pages/CategoryPreviewPage";
import { WellnessPage } from "./pages/WellnessPage";
import { AboutPage } from "./pages/AboutPage";

function readRoute() {
  const path = window.location.pathname;
  const detailMatch = path.match(/^\/productos\/(\d+)\/?$/);
  const params = new URLSearchParams(window.location.search);

  if (detailMatch) return { name: "detail", productId: detailMatch[1] };
  if (path.startsWith("/productos")) return { name: "catalog" };
  if (path.startsWith("/tienda/categoria")) return { name: "categoryPreview", category: params.get("name") || "esta categoría" };
  if (path.startsWith("/tienda")) return { name: "shop" };
  if (path.startsWith("/categorias")) return { name: "categories" };
  if (path.startsWith("/bienestar")) return { name: "wellness" };
  if (path.startsWith("/nosotros")) return { name: "about" };
  return { name: "home" };
}

function App() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const handlePopState = () => setRoute(readRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, "", path);
    setRoute(readRoute());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      <Header navigate={navigate} />
      <main>
        {route.name === "home" && <HomePage navigate={navigate} />}
        {route.name === "shop" && <ShopPage navigate={navigate} />}
        {route.name === "categories" && <CategoriesPage navigate={navigate} />}
        {route.name === "categoryPreview" && <CategoryPreviewPage key={route.category} category={route.category} navigate={navigate} />}
        {route.name === "wellness" && <WellnessPage navigate={navigate} />}
        {route.name === "about" && <AboutPage navigate={navigate} />}
        {route.name === "catalog" && <CatalogPage key={window.location.search} navigate={navigate} />}
        {route.name === "detail" && (
          <ProductDetailPage productId={route.productId} navigate={navigate} />
        )}
      </main>
      <Footer navigate={navigate} />
    </div>
  );
}

export default App;
