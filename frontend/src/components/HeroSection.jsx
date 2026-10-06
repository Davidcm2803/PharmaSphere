import { Icon } from "./Icon";

export function HeroSection({ navigate, showTrust = true }) {
  const showCategories = () => {
    navigate("/#categorias");
    window.setTimeout(() => document.getElementById("categorias")?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  return <section className="hero">
    <div className="container hero-grid">
      <div className="hero-copy">
        <span className="hero-pill"><Icon name="sparkles" size={16} /> Cuidarte ahora es más simple</span>
        <h1 className="display">Tu bienestar, <em>más cerca.</em></h1>
        <p>Encontrá medicamentos, productos de cuidado personal y bienestar, con información clara para elegir con confianza.</p>
        <div className="hero-actions"><button className="primary-button" onClick={() => navigate("/productos")}>Explorar productos →</button><button className="secondary-button" onClick={showCategories}>Ver categorías</button></div>
      </div>
      <div className="hero-visual" aria-label="Selección destacada de bienestar">
        <div className="float-card float-card--top"><Icon name="shield" /> Compra segura</div>
        <div className="hero-bottle"><div className="bottle-label"><span>Fórmula diaria</span><strong>Vita · C</strong></div></div>
        <div className="float-card float-card--bottom"><Icon name="heart" /> Elegido para vos</div>
      </div>
    </div>
    {showTrust && <div className="container trust-row" id="nosotros">
      <div className="trust-item"><span className="trust-icon"><Icon name="shield" /></span><div><strong>Productos confiables</strong><span>Información clara y verificada</span></div></div>
      <div className="trust-item"><span className="trust-icon"><Icon name="truck" /></span><div><strong>Entrega conveniente</strong><span>Recibí tu pedido con seguridad</span></div></div>
      <div className="trust-item"><span className="trust-icon"><Icon name="medical" /></span><div><strong>Cuidado responsable</strong><span>Aviso visible para medicamentos</span></div></div>
    </div>}
  </section>;
}
