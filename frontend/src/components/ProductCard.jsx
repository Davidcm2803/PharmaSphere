import { useState } from "react";
import { Icon } from "./Icon";

const formatPrice = (price) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(price);

export function ProductCard({ product, navigate }) {
  const [added, setAdded] = useState(false);

  return <article className="product-card">
    <div className="product-image" style={{ backgroundColor: product.color }}>
      {product.image ? <img src={product.image} alt={product.name} /> : <div className="product-placeholder" aria-hidden="true" />}
      <span className={`product-badge ${product.prescriptionRequired ? "prescription-badge" : ""}`}>{product.prescriptionRequired ? "Requiere receta" : product.tag}</span>
      <button className="icon-button" aria-label={`Guardar ${product.name}`}><Icon name="heart" size={17} /></button>
    </div>
    <div className="product-info">
      <div className="product-label-row"><span className="product-category">{product.category}</span><span className="product-rating">★ {product.rating}</span></div>
      <button className="product-title" onClick={() => navigate(`/productos/${product.id}`)}>{product.name}</button>
      <div className="product-meta"><span className="price-group"><span className="product-price">{formatPrice(product.price)}</span><del>{formatPrice(product.originalPrice)}</del></span><button className={`quick-add ${added ? "quick-add--added" : ""}`} onClick={() => setAdded((value) => !value)} aria-label={`${added ? "Quitar" : "Agregar"} ${product.name}`}>{added ? "✓" : "+"}</button></div>
    </div>
  </article>;
}
