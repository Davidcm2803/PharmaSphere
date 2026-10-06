import { useMemo, useState } from "react";
import { CATEGORIES } from "../data/products";
import { useProducts } from "../hooks/useProducts";
import { EmptyState, ErrorState, ProductGridSkeleton } from "../components/AsyncStates";
import { ProductCard } from "../components/ProductCard";

const PAGE_SIZE = 6;

function initialFilters() {
  const params = new URLSearchParams(window.location.search);
  return { search: params.get("search") ?? "", category: params.get("category") ?? "Todos", minPrice: "", maxPrice: "", sort: "relevance" };
}

export function CatalogPage({ navigate }) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ ...filters, page, pageSize: PAGE_SIZE }), [filters, page]);
  const { items, total, loading, error, retry } = useProducts(params);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setFilter = (name, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [name]: value }));
  };
  const reset = () => {
    setPage(1);
    setFilters({ search: "", category: "Todos", minPrice: "", maxPrice: "", sort: "relevance" });
  };

  return <>
    <section className="page-hero"><div className="container"><span className="eyebrow">Catálogo</span><h1 className="display">Todo para sentirte mejor</h1><p>Explorá nuestro catálogo y encontrá la opción adecuada para tu cuidado diario.</p></div></section>
    <div className="container catalog-layout">
      <aside className="filters" aria-label="Filtros del catálogo">
        <div className="filters-head"><h2>Filtros</h2><button className="text-button" onClick={reset}>Limpiar</button></div>
        <div className="filter-group"><h3>Categoría</h3><div className="filter-options">{CATEGORIES.map((category) => <label className="radio-row" key={category}><input type="radio" name="category" checked={filters.category === category} onChange={() => setFilter("category", category)} />{category}</label>)}</div></div>
        <div className="filter-group"><h3>Rango de precio</h3><div className="price-fields"><input type="number" min="0" placeholder="Mín." value={filters.minPrice} onChange={(event) => setFilter("minPrice", event.target.value)} aria-label="Precio mínimo"/><input type="number" min="0" placeholder="Máx." value={filters.maxPrice} onChange={(event) => setFilter("maxPrice", event.target.value)} aria-label="Precio máximo"/></div></div>
      </aside>
      <section className="catalog-content">
        <div className="catalog-toolbar"><span className="result-count">{loading ? "Buscando productos..." : `${total} producto${total === 1 ? "" : "s"}${filters.search ? ` para “${filters.search}”` : ""}`}</span><select className="sort-select" value={filters.sort} onChange={(event) => setFilter("sort", event.target.value)} aria-label="Ordenar productos"><option value="relevance">Más relevantes</option><option value="price-asc">Precio: menor a mayor</option><option value="price-desc">Precio: mayor a menor</option><option value="name">Nombre A–Z</option></select></div>
        {loading ? <ProductGridSkeleton count={6} /> : error ? <ErrorState message={error} retry={retry} /> : items.length === 0 ? <EmptyState reset={reset} /> : <div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} navigate={navigate} />)}</div>}
        {!loading && !error && total > PAGE_SIZE && <nav className="pagination" aria-label="Paginación"><button className="page-button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>←</button>{Array.from({ length: pages }, (_, index) => index + 1).map((number) => <button key={number} className={`page-button ${page === number ? "active" : ""}`} onClick={() => setPage(number)}>{number}</button>)}<button className="page-button" disabled={page === pages} onClick={() => setPage((value) => value + 1)}>→</button></nav>}
      </section>
    </div>
  </>;
}
