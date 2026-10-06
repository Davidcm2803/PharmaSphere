import { ErrorState, ProductGridSkeleton } from "../components/AsyncStates";
import { Icon } from "../components/Icon";
import { useProduct } from "../hooks/useProducts";

const formatPrice = (price) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(price);

export function ProductDetailPage({ productId, navigate }) {
  const { item: product, loading, error, source, retry } = useProduct(productId);

  if (loading) return <div className="container detail-page"><ProductGridSkeleton count={2} /></div>;
  if (error) return <div className="container detail-page"><ErrorState message={error} retry={retry} /></div>;

  return <section className="detail-page"><div className="container">
    <button className="back-button" onClick={() => navigate("/productos")}>← Volver al catálogo</button>
    {source === "fallback" && <div className="demo-notice">Vista de demostración: iniciá el backend para consultar disponibilidad en tiempo real.</div>}
    <div className="detail-grid">
      <div className="detail-image" style={{ backgroundColor: product.color }}>{product.image ? <img src={product.image} alt={product.name} /> : <div className="product-placeholder" aria-hidden="true" />}</div>
      <div className="detail-copy">
        <span className="eyebrow">{product.category}</span>
        <h1 className="display">{product.name}</h1>
        <div className="detail-price">{formatPrice(product.price)}</div>
        <span className="availability"><i className="stock-dot" /> {product.stock > 0 ? `Disponible · ${product.stock} unidades` : "Agotado"}</span>
        <p className="detail-description">{product.description}</p>
        {product.prescriptionRequired && <div className="prescription-notice" role="note"><Icon name="alert" size={24} /><div><strong>Este medicamento requiere receta médica</strong><p>Presentá una receta válida al retirar o recibir tu pedido. La compra queda sujeta a validación farmacéutica.</p></div></div>}
        <div className="detail-actions"><button className="primary-button" disabled={product.stock <= 0}>Consultar disponibilidad</button><button className="secondary-button" aria-label="Guardar producto"><Icon name="heart" /></button></div>
        <div className="detail-facts"><div className="detail-fact"><span>Disponibilidad</span><strong>{product.stock > 0 ? "En existencia" : "Sin existencias"}</strong></div><div className="detail-fact"><span>Condición de venta</span><strong>{product.prescriptionRequired ? "Con receta" : "Venta libre"}</strong></div><div className="detail-fact"><span>Entrega</span><strong>Según zona</strong></div></div>
      </div>
    </div>
  </div></section>;
}
