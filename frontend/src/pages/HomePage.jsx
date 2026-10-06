import { AsyncProducts } from "../components/AsyncProducts";
import { Icon } from "../components/Icon";

const categories = [
  { name: "Analgésicos", caption: "Dolor y fiebre", icon: "medical" },
  { name: "Suplementos", caption: "Vitaminas y energía", icon: "sparkles" },
  { name: "Alergias", caption: "Alivio diario", icon: "leaf" },
  { name: "Infantil", caption: "Cuidado para pequeños", icon: "baby" },
];

export function HomePage({ navigate }) {
  return <>
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="hero-pill"><Icon name="sparkles" size={16} /> Cuidarte ahora es más simple</span>
          <h1 className="display">Tu bienestar, <em>más cerca.</em></h1>
          <p>Encontrá medicamentos, productos de cuidado personal y bienestar, con información clara para elegir con confianza.</p>
          <div className="hero-actions"><button className="primary-button" onClick={() => navigate("/productos")}>Explorar productos →</button><button className="secondary-button" onClick={() => document.querySelector("#categorias")?.scrollIntoView()}>Ver categorías</button></div>
        </div>
        <div className="hero-visual" aria-label="Selección destacada de bienestar">
          <div className="float-card float-card--top"><Icon name="shield" /> Compra segura</div>
          <div className="hero-bottle"><div className="bottle-label"><span>Fórmula diaria</span><strong>Vita · C</strong></div></div>
          <div className="float-card float-card--bottom"><Icon name="heart" /> Elegido para vos</div>
        </div>
      </div>
      <div className="container trust-row">
        <div className="trust-item"><span className="trust-icon"><Icon name="shield" /></span><div><strong>Productos confiables</strong><span>Información clara y verificada</span></div></div>
        <div className="trust-item"><span className="trust-icon"><Icon name="truck" /></span><div><strong>Entrega conveniente</strong><span>Recibí tu pedido con seguridad</span></div></div>
        <div className="trust-item"><span className="trust-icon"><Icon name="medical" /></span><div><strong>Cuidado responsable</strong><span>Aviso visible para medicamentos</span></div></div>
      </div>
    </section>

    <section className="section categories-section" id="categorias">
      <div className="container">
        <div className="section-head"><div><span className="eyebrow">Comprá por categoría</span><h2>Cuidado para cada día</h2></div><button className="text-button" onClick={() => navigate("/productos")}>Ver todas →</button></div>
        <div className="category-grid">{categories.map((category) => <button className="category-card" key={category.name} onClick={() => navigate(`/productos?category=${encodeURIComponent(category.name)}`)}><span className="category-icon"><Icon name={category.icon} size={27} /></span><strong>{category.name}</strong><span>{category.caption}</span></button>)}</div>
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
