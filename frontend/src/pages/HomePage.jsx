import { AsyncProducts } from "../components/AsyncProducts";
import { Icon } from "../components/Icon";
import { HeroSection } from "../components/HeroSection";

const categories = [
  { name: "Analgésicos", caption: "Dolor y fiebre", icon: "medical" },
  { name: "Suplementos", caption: "Vitaminas y energía", icon: "sparkles" },
  { name: "Alergias", caption: "Alivio diario", icon: "leaf" },
  { name: "Infantil", caption: "Cuidado para pequeños", icon: "baby" },
];

export function HomePage({ navigate }) {
  return <>
    <HeroSection navigate={navigate} />

    <section className="section categories-section" id="categorias">
      <div className="container">
        <div className="section-head"><div><span className="eyebrow">Comprá por categoría</span><h2>Cuidado para cada día</h2></div><button className="text-button" onClick={() => navigate("/productos")}>Ver todas →</button></div>
        <div className="category-grid">{categories.map((category) => <button className="category-card" key={category.name} onClick={() => navigate(`/tienda/categoria?name=${encodeURIComponent(category.name)}`)}><span className="category-icon"><Icon name={category.icon} size={27} /></span><strong>{category.name}</strong><span>{category.caption}</span></button>)}</div>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <div className="section-head"><div><span className="eyebrow">Selección PharmaSphere</span><h2>Productos destacados</h2></div><button className="text-button" onClick={() => navigate("/productos")}>Ver catálogo →</button></div>
        <AsyncProducts params={{ featured: true, pageSize: 4 }} navigate={navigate} />
      </div>
    </section>
  </>;
}
