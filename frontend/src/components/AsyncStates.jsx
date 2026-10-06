import { Icon } from "./Icon";

export function ProductGridSkeleton({ count = 4 }) {
  return <div className="product-grid" aria-label="Cargando productos">{Array.from({ length: count }, (_, index) => <div className="skeleton" key={index} />)}</div>;
}

export function EmptyState({ reset }) {
  return <div className="state-panel"><div><span className="state-icon"><Icon name="search" size={27} /></span><h3>No encontramos productos</h3><p>Probá con otro término o quitá algunos filtros para ampliar la búsqueda.</p>{reset && <button className="secondary-button" onClick={reset}>Limpiar filtros</button>}</div></div>;
}

export function ErrorState({ message, retry }) {
  return <div className="state-panel" role="alert"><div><span className="state-icon"><Icon name="alert" size={27} /></span><h3>Algo no salió bien</h3><p>{message}</p><button className="primary-button" onClick={retry}>Intentar de nuevo</button></div></div>;
}
