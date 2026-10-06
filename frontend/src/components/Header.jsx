import { useState } from "react";
import { Icon } from "./Icon";

export function Header({ navigate }) {
  const params = new URLSearchParams(window.location.search);
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [menuOpen, setMenuOpen] = useState(false);

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/productos?search=${encodeURIComponent(query)}` : "/productos");
  };

  const goToSection = (sectionId) => {
    setMenuOpen(false);
    navigate(`/#${sectionId}`);
    window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  const goTo = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return <>
    <div className="top-strip">Envío gratis en pedidos superiores a ₡20.000 · Entrega segura en todo Costa Rica</div>
    <header className="site-header">
      <div className="container nav-row">
        <button className="brand" onClick={() => goTo("/")} aria-label="Ir al inicio">
          <span className="brand-mark"><Icon name="capsule" size={25} /></span>
          <span><strong>PharmaSphere</strong><small>FARMACIA DIGITAL</small></span>
        </button>
        <nav className="nav-links" aria-label="Navegación principal">
          <button className="nav-link nav-link--active" onClick={() => goTo("/productos")}>Tienda</button>
          <button className="nav-link" onClick={() => goToSection("categorias")}>Categorías</button>
          <button className="nav-link" onClick={() => goTo("/productos?category=Suplementos")}>Bienestar</button>
          <button className="nav-link" onClick={() => goToSection("nosotros")}>Nosotros</button>
        </nav>
        <form className="search-form" role="search" onSubmit={submitSearch}>
          <Icon name="search" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar medicamentos, vitaminas..." aria-label="Buscar productos" />
        </form>
        <button className="menu-button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}>
          <Icon name={menuOpen ? "close" : "menu"} size={24} />
        </button>
        <nav id="mobile-navigation" className={`mobile-nav ${menuOpen ? "mobile-nav--open" : ""}`} aria-label="Navegación móvil">
          <button className="mobile-nav-link" onClick={() => goTo("/productos")}>Tienda <span>→</span></button>
          <button className="mobile-nav-link" onClick={() => goToSection("categorias")}>Categorías <span>→</span></button>
          <button className="mobile-nav-link" onClick={() => goTo("/productos?category=Suplementos")}>Bienestar <span>→</span></button>
          <button className="mobile-nav-link" onClick={() => goToSection("nosotros")}>Nosotros <span>→</span></button>
        </nav>
      </div>
    </header>
  </>;
}
