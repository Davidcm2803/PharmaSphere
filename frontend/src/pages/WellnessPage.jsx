import { Icon } from "../components/Icon";

const guides = [
  {
    category: "Rutina diaria",
    time: "4 min",
    title: "Cómo construir una rutina simple de suplementos",
    summary: "Empezá con hábitos sostenibles y evitá llenar tu día de pasos difíciles de mantener.",
    tips: ["Definí un horario que ya forme parte de tu rutina.", "Elegí solo los suplementos indicados para vos.", "Consultá a un profesional si utilizás medicamentos."],
  },
  {
    category: "Salud digestiva",
    time: "5 min",
    title: "Probióticos y prebióticos: entendé la diferencia",
    summary: "Aunque suelen mencionarse juntos, cumplen funciones diferentes dentro de una alimentación equilibrada.",
    tips: ["Los probióticos aportan microorganismos beneficiosos.", "Los prebióticos sirven de alimento para la microbiota.", "La variedad de alimentos también es importante."],
  },
  {
    category: "Consejo farmacéutico",
    time: "3 min",
    title: "Hidratación, sueño y recuperación cotidiana",
    summary: "Tres pilares sencillos que trabajan juntos y pueden transformar cómo te sentís durante el día.",
    tips: ["Distribuí el consumo de agua durante el día.", "Mantené horarios de sueño consistentes.", "Permití días de recuperación después de actividad intensa."],
  },
];

export function WellnessPage({ navigate }) {
  return <>
    <section className="wellness-hero">
      <div className="container wellness-hero-inner">
        <span className="wellness-mark"><Icon name="sparkles" size={34} /></span>
        <span className="eyebrow">Bienestar que sí cabe en tu día</span>
        <h1 className="display">Wellness Hub</h1>
        <p>Consejos claros y prácticos para tomar mejores decisiones sobre tu bienestar, con información que podés aplicar a tu ritmo.</p>
        <div className="wellness-topics" aria-label="Temas disponibles"><span>Nutrición</span><span>Descanso</span><span>Movimiento</span><span>Cuidado diario</span></div>
      </div>
    </section>

    <section className="wellness-content">
      <div className="container wellness-layout">
        <article className="featured-guide">
          <div className="featured-guide-copy"><span className="guide-kicker">Guía destacada · 6 min</span><h2 className="display">Pequeños hábitos,<br />cambios que se sienten.</h2><p>Una guía amable para revisar tu energía, descanso e hidratación sin buscar una rutina perfecta.</p><button className="primary-button" onClick={() => document.getElementById("guias")?.scrollIntoView({ behavior: "smooth" })}>Empezar a explorar</button></div>
          <div className="wellness-visual" aria-hidden="true"><span className="wellness-sun"><Icon name="sparkles" size={45} /></span><span className="wellness-leaf wellness-leaf--one"><Icon name="leaf" size={30} /></span><span className="wellness-leaf wellness-leaf--two"><Icon name="leaf" size={24} /></span></div>
        </article>

        <div className="guides-section" id="guias">
          <div className="section-head"><div><span className="eyebrow">Aprendé a tu ritmo</span><h2>Guías para sentirte mejor</h2></div><span className="guide-count">3 lecturas breves</span></div>
          <div className="guide-list">
            {guides.map((guide, index) => <details className="guide-item" key={guide.title} name="wellness-guides" open={index === 0}>
              <summary><span className="guide-number">0{index + 1}</span><span className="guide-summary-copy"><span className="guide-meta">{guide.category} · {guide.time}</span><strong>{guide.title}</strong></span><span className="guide-toggle">+</span></summary>
              <div className="guide-body"><p>{guide.summary}</p><ul>{guide.tips.map((tip) => <li key={tip}><span>✓</span>{tip}</li>)}</ul></div>
            </details>)}
          </div>
        </div>

        <aside className="wellness-cta"><span className="wellness-cta-icon"><Icon name="heart" size={28} /></span><div><span className="eyebrow">Acompañá tu rutina</span><h2>Encontrá productos para tu bienestar diario</h2><p>Explorá vitaminas, cuidado personal y opciones seleccionadas para complementar hábitos saludables.</p></div><button className="secondary-button" onClick={() => navigate("/tienda")}>Visitar la tienda →</button></aside>
      </div>
    </section>
  </>;
}
