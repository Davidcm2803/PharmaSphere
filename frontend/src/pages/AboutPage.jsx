import { Icon } from "../components/Icon";

const principles = [
  { icon: "shield", title: "Confianza primero", text: "Presentamos cada producto con información clara sobre su uso, disponibilidad y condición de venta." },
  { icon: "medical", title: "Cuidado responsable", text: "Los medicamentos que requieren receta siempre muestran un aviso visible antes de tomar una decisión." },
  { icon: "heart", title: "Una experiencia humana", text: "Diseñamos cada paso para que encontrar opciones de bienestar se sienta simple, cercano y sin presión." },
];

export function AboutPage({ navigate }) {
  return <>
    <section className="about-hero">
      <div className="container about-hero-inner">
        <span className="about-mark"><Icon name="heart" size={32} /></span>
        <span className="eyebrow">Conocé PharmaSphere</span>
        <h1 className="display">Cuidarte debería sentirse<br /><em>claro y cercano.</em></h1>
        <p>Construimos una experiencia de farmacia digital pensada alrededor de mejores decisiones, información comprensible y bienestar para todos los días.</p>
        <div className="about-actions"><button className="primary-button" onClick={() => navigate("/tienda")}>Conocer la tienda</button><button className="secondary-button" onClick={() => document.getElementById("principios")?.scrollIntoView({ behavior: "smooth" })}>Nuestros principios ↓</button></div>
      </div>
    </section>

    <section className="about-story-section">
      <div className="container about-story">
        <div className="about-story-visual" aria-hidden="true">
          <span className="story-shape story-shape--one"><Icon name="capsule" size={54} /></span>
          <span className="story-shape story-shape--two"><Icon name="leaf" size={35} /></span>
          <span className="story-note">Bienestar con propósito</span>
        </div>
        <div className="about-story-copy"><span className="eyebrow">Por qué existimos</span><h2 className="display">Menos confusión.<br />Más confianza.</h2><p>Sabemos que buscar productos de salud puede ser abrumador. Por eso organizamos la información de manera sencilla, usamos un lenguaje cercano y destacamos lo que realmente importa antes de elegir.</p><p>PharmaSphere une tecnología y cuidado para acompañarte, sin reemplazar la orientación de profesionales de la salud.</p></div>
      </div>
    </section>

    <section className="about-principles" id="principios">
      <div className="container">
        <div className="section-head"><div><span className="eyebrow">Lo que nos guía</span><h2>Tres principios, una sola intención</h2></div><p className="principles-intro">Hacer que el cuidado cotidiano sea más comprensible y accesible.</p></div>
        <div className="principles-grid">{principles.map((principle, index) => <article className="principle-card" key={principle.title}><span className="principle-number">0{index + 1}</span><span className="principle-icon"><Icon name={principle.icon} size={27} /></span><h3>{principle.title}</h3><p>{principle.text}</p></article>)}</div>
      </div>
    </section>

    <section className="about-next"><div className="container about-next-card"><div><span className="eyebrow">Seguimos construyendo</span><h2 className="display">Una farmacia digital que crece con vos.</h2><p>Explorá consejos prácticos en Wellness Hub o conocé nuestra selección de productos.</p></div><div className="about-next-actions"><button className="primary-button" onClick={() => navigate("/bienestar")}>Visitar Wellness Hub</button><button className="secondary-button" onClick={() => navigate("/tienda")}>Explorar productos</button></div></div></section>
  </>;
}
