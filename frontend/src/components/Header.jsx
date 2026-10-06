import { useRef, useState } from "react";
import { Icon } from "./Icon";

export function Header({ navigate }) {
  const params = new URLSearchParams(window.location.search);
  const currentPath = window.location.pathname;
  const currentHash = window.location.hash;
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    setSearchOpen(false);
    navigate(query ? `/productos?search=${encodeURIComponent(query)}` : "/productos");
  };

  const toggleSearch = () => {
    setMenuOpen(false);
    setSearchOpen((open) => {
      const nextValue = !open;
      if (nextValue) window.setTimeout(() => searchInputRef.current?.focus(), 0);
      return nextValue;
    });
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

  const activeTab = currentPath.startsWith("/bienestar")
    ? "wellness"
    : currentPath.startsWith("/categorias") || currentPath.startsWith("/tienda/categoria")
      ? "categories"
      : currentPath.startsWith("/tienda") || currentPath.startsWith("/productos")
        ? "shop"
        : currentHash === "#nosotros"
          ? "about"
          : null;

  const activeClass = (tab, baseClass) => `${baseClass} ${activeTab === tab ? `${baseClass}--active` : ""}`.trim();

  return <>
    <div className="top-strip">Envío gratis en pedidos superiores a ₡20.000 · Entrega segura en todo Costa Rica</div>
    <header className="site-header">
      <div className="container nav-row">
        <button className="brand" onClick={() => goTo("/")} aria-label="Ir al inicio">
          <span className="brand-mark"><Icon name="capsule" size={25} /></span>
          <span><strong>PharmaSphere</strong><small>FARMACIA DIGITAL</small></span>
        </button>
        <nav className="nav-links" aria-label="Navegación principal">
          <button className={activeClass("shop", "nav-link")} aria-current={activeTab === "shop" ? "page" : undefined} onClick={() => goTo("/tienda")}>Tienda</button>
          <button className={activeClass("categories", "nav-link")} aria-current={activeTab === "categories" ? "page" : undefined} onClick={() => goTo("/categorias")}>Categorías</button>
          <button className={activeClass("wellness", "nav-link")} aria-current={activeTab === "wellness" ? "page" : undefined} onClick={() => goTo("/bienestar")}>Wellness Hub</button>
          <button className={activeClass("about", "nav-link")} aria-current={activeTab === "about" ? "page" : undefined} onClick={() => goToSection("nosotros")}>Nosotros</button>
        </nav>
        <form className={`search-form ${searchOpen ? "search-form--open" : ""}`} role="search" onSubmit={submitSearch}>
          <Icon name="search" />
          <input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Escape" && setSearchOpen(false)} placeholder="Buscar medicamentos, vitaminas..." aria-label="Buscar productos" />
          <button className="search-close" type="button" onClick={() => setSearchOpen(false)} aria-label="Cerrar búsqueda"><Icon name="close" size={18} /></button>
        </form>
        <div className="mobile-actions">
          <button className={`search-toggle ${searchOpen ? "search-toggle--active" : ""}`} onClick={toggleSearch} aria-expanded={searchOpen} aria-label={searchOpen ? "Cerrar búsqueda" : "Abrir búsqueda"}><Icon name={searchOpen ? "close" : "search"} size={22} /></button>
          <button className="menu-button" onClick={() => { setSearchOpen(false); setMenuOpen((open) => !open); }} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}>
            <Icon name={menuOpen ? "close" : "menu"} size={24} />
          </button>
        </div>
        <nav id="mobile-navigation" className={`mobile-nav ${menuOpen ? "mobile-nav--open" : ""}`} aria-label="Navegación móvil">
          <button className={activeClass("shop", "mobile-nav-link")} aria-current={activeTab === "shop" ? "page" : undefined} onClick={() => goTo("/tienda")}>Tienda <span>→</span></button>
          <button className={activeClass("categories", "mobile-nav-link")} aria-current={activeTab === "categories" ? "page" : undefined} onClick={() => goTo("/categorias")}>Categorías <span>→</span></button>
          <button className={activeClass("wellness", "mobile-nav-link")} aria-current={activeTab === "wellness" ? "page" : undefined} onClick={() => goTo("/bienestar")}>Wellness Hub <span>→</span></button>
          <button className={activeClass("about", "mobile-nav-link")} aria-current={activeTab === "about" ? "page" : undefined} onClick={() => goToSection("nosotros")}>Nosotros <span>→</span></button>
        </nav>
      </div>
    </header>
  </>;
}
