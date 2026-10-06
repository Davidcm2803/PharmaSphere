import { Icon } from "./Icon";

const formatPrice = (price) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(price);

export function ProductCard({ product, navigate }) {
  return <article className="product-card">
    <div className="product-image" style={{ backgroundColor: product.color }}>
      {product.image ? <img src={product.image} alt={product.name} /> : <div className="product-placeholder" aria-hidden="true" />}
      <span className={`product-badge ${product.prescriptionRequired ? "prescription-badge" : ""}`}>{product.prescriptionRequired ? "Requiere receta" : "Venta libre"}</span>
      <button className="icon-button" aria-label={`Guardar ${product.name}`}><Icon name="heart" size={17} /></button>
    </div>
    <div className="product-info">
      <span className="product-category">{product.category}</span>
      <button className="product-title" onClick={() => navigate(`/productos/${product.id}`)}>{product.name}</button>
      <div className="product-meta"><span className="product-price">{formatPrice(product.price)}</span><span className="stock-label"><i className="stock-dot" />{product.stock > 0 ? "Disponible" : "Agotado"}</span></div>
    </div>
  </article>;
}
