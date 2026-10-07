import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";

export function CategoryPreviewPage({ category, navigate }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 1100);
    return () => window.clearTimeout(timer);
  }, [category]);

  if (loading) return <section className="category-loading" aria-live="polite">
    <div className="container category-loading-inner">
      <span className="loading-spinner" />
      <span className="eyebrow">Preparando la categoría</span>
      <h1 className="display">Cargando {category}...</h1>
      <div className="loading-track"><span /></div>
      <div className="loading-preview-grid">{Array.from({ length: 4 }, (_, index) => <div className="loading-preview-card" key={index} />)}</div>
    </div>
  </section>;

  return <section className="construction-page">
    <div className="container construction-inner">
      <div className="construction-art" aria-hidden="true"><span className="construction-orbit" /><span className="construction-icon"><Icon name="sparkles" size={44} /></span></div>
      <span className="eyebrow">Próximamente</span>
      <h1 className="display">Estamos preparando<br />{category}</h1>
      <p>Muy pronto vas a poder explorar una selección especial de esta categoría. Mientras tanto, podés encontrar todos nuestros productos en la tienda.</p>
      <div className="construction-actions"><button className="primary-button" onClick={() => navigate("/tienda")}>Ir a la tienda</button><button className="secondary-button" onClick={() => navigate("/categorias")}>Ver otras categorías</button></div>
    </div>
  </section>;
}
