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

  return <>
    <div className="top-strip">Envío gratis en pedidos superiores a ₡20.000 · Entrega segura en todo Costa Rica</div>
    <header className="site-header">
      <div className="container nav-row">
        <button className="brand" onClick={() => navigate("/")} aria-label="Ir al inicio">
          <span className="brand-mark"><Icon name="capsule" size={25} /></span>
          <span><strong>PharmaSphere</strong><small>FARMACIA DIGITAL</small></span>
        </button>
        <nav className="nav-links" aria-label="Navegación principal">
          <button className="nav-link" onClick={() => navigate("/productos")}>Productos</button>
          <button className="nav-link" onClick={() => navigate("/productos?category=Suplementos")}>Bienestar</button>
          <button className="nav-link" onClick={() => navigate("/#categorias")}>Categorías</button>
        </nav>
        <form className="search-form" role="search" onSubmit={submitSearch}>
          <Icon name="search" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar medicamentos, vitaminas..." aria-label="Buscar productos" />
        </form>
        <button className="header-action" onClick={() => navigate("/productos")}>Ver catálogo</button>
        <button className="menu-button" onClick={() => navigate("/productos")} aria-label="Abrir catálogo"><Icon name="menu" size={25} /></button>
      </div>
    </header>
  </>;
}
