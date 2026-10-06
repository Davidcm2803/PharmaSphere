import { useState } from "react";
import { Icon } from "./Icon";

export function Header({ navigate }) {
  const params = new URLSearchParams(window.location.search);
  const [search, setSearch] = useState(params.get("search") ?? "");

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/productos?search=${encodeURIComponent(query)}` : "/productos");
  };

  const goToSection = (sectionId) => {
    navigate(`/#${sectionId}`);
    window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  return <>
    <div className="top-strip">Envío gratis en pedidos superiores a ₡20.000 · Entrega segura en todo Costa Rica</div>
    <header className="site-header">
      <div className="container nav-row">
        <button className="brand" onClick={() => navigate("/")} aria-label="Ir al inicio">
          <span className="brand-mark"><Icon name="capsule" size={25} /></span>
          <span><strong>PharmaSphere</strong><small>FARMACIA DIGITAL</small></span>
        </button>
        <nav className="nav-links" aria-label="Navegación principal">
          <button className="nav-link nav-link--active" onClick={() => navigate("/productos")}>Tienda</button>
          <button className="nav-link" onClick={() => goToSection("categorias")}>Categorías</button>
          <button className="nav-link" onClick={() => navigate("/productos?category=Suplementos")}>Bienestar</button>
          <button className="nav-link" onClick={() => goToSection("nosotros")}>Nosotros</button>
        </nav>
        <form className="search-form" role="search" onSubmit={submitSearch}>
          <Icon name="search" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar medicamentos, vitaminas..." aria-label="Buscar productos" />
        </form>
        <button className="cart-button" aria-label="Carrito, 0 productos">
          <Icon name="cart" size={25} />
          <span className="cart-count">0</span>
        </button>
      </div>
    </header>
  </>;
}
