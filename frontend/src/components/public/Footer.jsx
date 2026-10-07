import { Link } from "react-router-dom";
import { Pill } from "lucide-react";

const COLUMNS = [
  { title: "Explora", links: [["/shop", "Tienda"], ["/categories", "Categorías"], ["/wellness", "Wellness hub"]] },
  { title: "Compañía", links: [["/about", "Sobre nosotros"]] },
];

export default function Footer() {
  return (
    <footer className="border-t border-brand-border bg-brand-card">
      <div className="mx-auto grid max-w-[1536px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr] lg:px-8">
        <div>
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary text-brand-primary-foreground">
              <Pill className="h-5 w-5 -rotate-45" />
            </span>
            <span className="text-base font-bold text-brand-foreground">
              Pharma<span className="text-brand-primary">IQ</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-muted-foreground">
            Tu farmacia en línea. Productos de salud y bienestar con información clara para elegir con confianza.
          </p>
        </div>

        {COLUMNS.map(({ title, links }) => (
          <div key={title}>
            <h3 className="text-sm font-bold text-brand-foreground">{title}</h3>
            <ul className="mt-3 space-y-2">
              {links.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-brand-muted-foreground transition-colors hover:text-brand-primary">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-brand-border px-4 py-5 text-center text-xs text-brand-muted-foreground">
        © {new Date().getFullYear()} PharmaIQ. La información de este sitio no sustituye la recomendación de un profesional de la salud.
      </div>
    </footer>
  );
}