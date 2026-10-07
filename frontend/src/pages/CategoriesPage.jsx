import { Icon } from "../components/Icon";

const SHOP_CATEGORIES = [
  { name: "Vitaminas y suplementos", description: "Apoyo para tu bienestar diario", icon: "sparkles", color: "#e6f7f0" },
  { name: "Salud cardiovascular", description: "Cuidado para el corazón", icon: "heart", color: "#eef1fb" },
  { name: "Sueño y bienestar", description: "Descanso y equilibrio", icon: "leaf", color: "#f3eefb" },
  { name: "Salud digestiva", description: "Bienestar desde el interior", icon: "medical", color: "#fff3ea" },
  { name: "Dolor y fiebre", description: "Alivio para molestias comunes", icon: "medical", color: "#fff7df" },
  { name: "Alergias", description: "Respirá y disfrutá tu día", icon: "leaf", color: "#e8f5fa" },
  { name: "Cuidado infantil", description: "Opciones para los más pequeños", icon: "baby", color: "#fceff1" },
  { name: "Dermocuidado", description: "Protección y cuidado de la piel", icon: "shield", color: "#edf8f4" },
];

export function CategoriesPage({ navigate }) {
  const openCategory = (name) => navigate(`/tienda/categoria?name=${encodeURIComponent(name)}`);

  return <section className="categories-page">
    <div className="container">
      <div className="categories-heading"><span className="eyebrow">Explorá por necesidad</span><h1 className="display">Comprá por categoría</h1><p>Encontrá más rápido los productos que acompañan tu rutina de cuidado.</p></div>
      <div className="shop-category-grid">
        {SHOP_CATEGORIES.map((category) => <button className="shop-category-card" style={{ backgroundColor: category.color }} key={category.name} onClick={() => openCategory(category.name)}>
          <span className="shop-category-icon"><Icon name={category.icon} size={26} /></span>
          <span className="shop-category-copy"><strong>{category.name}</strong><small>{category.description}</small></span>
          <span className="shop-category-arrow">→</span>
        </button>)}
      </div>
    </div>
  </section>;
}
