import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { HomePage } from "./pages/HomePage";
import { CatalogPage } from "./pages/CatalogPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";

function readRoute() {
  const path = window.location.pathname;
  const detailMatch = path.match(/^\/productos\/(\d+)\/?$/);

  if (detailMatch) return { name: "detail", productId: detailMatch[1] };
  if (path.startsWith("/productos")) return { name: "catalog" };
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
