import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import PageHeader from "../../components/public/PageHeader";

// Contenido editorial
const GUIDES = [
  {
    title: "Cómo construir una rutina simple de suplementos",
    meta: "Rutina diaria · 4 min",
    text: "Empieza con hábitos sostenibles y evita llenar tu día de pasos difíciles de mantener.",
    tips: ["Elige un horario que ya forme parte de tu rutina.", "Toma solo los suplementos indicados para ti.", "Consulta a un profesional si usas medicamentos."],
  },
  {
    title: "Probióticos y prebióticos: la diferencia",
    meta: "Salud digestiva · 5 min",
    text: "Suelen mencionarse juntos, pero cumplen funciones distintas dentro de una alimentación equilibrada.",
    tips: ["Los probióticos aportan microorganismos beneficiosos.", "Los prebióticos alimentan la microbiota.", "La variedad de alimentos también cuenta."],
  },
  {
    title: "Hidratación, sueño y recuperación",
    meta: "Consejo farmacéutico · 3 min",
    text: "Tres pilares sencillos que, juntos, cambian cómo te sientes durante el día.",
    tips: ["Reparte el consumo de agua durante el día.", "Mantén horarios de sueño consistentes.", "Date días de recuperación tras actividad intensa."],
  },
];

export default function WellnessPage() {
  return (
    <>
      <PageHeader title="Wellness hub">
        Consejos claros y prácticos para tomar mejores decisiones sobre tu bienestar.
      </PageHeader>

      <div className="mx-auto max-w-3xl space-y-3 px-4 py-12 sm:px-6">
        {GUIDES.map((guide, i) => (
          <details
            key={guide.title}
            name="wellness-guides"
            open={i === 0}
            className="group rounded-2xl border border-brand-border bg-brand-card open:border-brand-primary/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-xs text-brand-muted-foreground">{guide.meta}</span>
                <span className="font-bold text-brand-foreground">{guide.title}</span>
              </span>
              <ChevronDown className="h-5 w-5 shrink-0 text-brand-primary transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-5 pb-5">
              <p className="text-brand-muted-foreground">{guide.text}</p>
              <ul className="mt-4 space-y-2">
                {guide.tips.map((tip) => (
                  <li key={tip} className="flex gap-2 text-sm text-brand-foreground">
                    <span className="font-bold text-brand-primary">✓</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ))}

        <div className="!mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-brand-accent p-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-bold text-brand-foreground">Encuentra productos para tu bienestar diario</p>
            <p className="text-sm text-brand-muted-foreground">Vitaminas, cuidado personal y más.</p>
          </div>
          <Link to="/shop" className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-brand-primary-foreground transition-colors hover:bg-brand-primary-dark">
            Visitar la tienda
          </Link>
        </div>
      </div>
    </>
  );
}