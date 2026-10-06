import { Icon } from "./Icon";

export function Footer({ navigate }) {
  return <footer className="footer">
    <div className="container">
      <div className="footer-grid">
        <div>
          <button className="brand" onClick={() => navigate("/")}>
            <span className="brand-mark"><Icon name="capsule" size={25} /></span>
            <span><strong>PharmaSphere</strong><small>FARMACIA DIGITAL</small></span>
          </button>
          <p>Tu farmacia digital de confianza. Productos de salud y bienestar seleccionados con el cuidado que merecés.</p>
        </div>
        <div><h3>Explorá</h3><button className="footer-link" onClick={() => navigate("/tienda")}>Tienda</button><button className="footer-link" onClick={() => navigate("/productos")}>Todos los productos</button><button className="footer-link" onClick={() => navigate("/bienestar")}>Wellness Hub</button></div>
        <div><h3>Ayuda</h3><button className="footer-link">Preguntas frecuentes</button><button className="footer-link">Contacto</button><button className="footer-link">Privacidad</button></div>
      </div>
      <div className="footer-bottom">© 2026 PharmaSphere. La información del sitio no sustituye la recomendación de un profesional de salud.</div>
    </div>
  </footer>;
}
