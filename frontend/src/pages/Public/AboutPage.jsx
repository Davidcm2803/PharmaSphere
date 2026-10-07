import { Link } from "react-router-dom";
import { HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import PageHeader from "../../components/public/PageHeader";

const PRINCIPLES = [
  { icon: ShieldCheck, title: "Confianza primero", text: "Cada producto muestra información clara sobre su uso, disponibilidad y condición de venta." },
  { icon: Stethoscope, title: "Cuidado responsable", text: "Los medicamentos con receta siempre muestran un aviso visible antes de decidir." },
  { icon: HeartPulse, title: "Una experiencia cercana", text: "Cada paso está pensado para que encontrar opciones de bienestar sea simple y sin presión." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader title="Cuidarte debería sentirse claro y cercano">
        Una farmacia en línea pensada para tomar mejores decisiones, con información comprensible y bienestar para todos los días.
      </PageHeader>

      <div className="mx-auto max-w-[1536px] space-y-16 px-4 py-14 sm:px-6 lg:px-8">
        <section className="max-w-3xl space-y-4 text-brand-muted-foreground">
          <h2 className="text-2xl font-extrabold tracking-tight text-brand-foreground">Menos confusión, más confianza</h2>
          <p>Buscar productos de salud puede ser abrumador. Por eso organizamos la información de forma sencilla, usamos un lenguaje cercano y destacamos lo que importa antes de elegir.</p>
          <p>Unimos tecnología y cuidado para acompañarte, sin reemplazar la orientación de profesionales de la salud.</p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-brand-border bg-brand-card p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-accent text-brand-accent-foreground">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 font-bold text-brand-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-muted-foreground">{text}</p>
            </article>
          ))}
        </section>

        <section className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-brand-accent p-8 sm:flex-row sm:items-center">
          <p className="text-xl font-bold text-brand-foreground">Explora nuestra selección de productos.</p>
          <Link to="/shop" className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-brand-primary-foreground transition-colors hover:bg-brand-primary-dark">
            Ir a la tienda
          </Link>
        </section>
      </div>
    </>
  );
}