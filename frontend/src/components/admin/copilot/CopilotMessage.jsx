import { Database, FileText, Package } from "lucide-react";

const SOURCE_ICONS = { documento: FileText, producto: Package, base_de_datos: Database };

export default function CopilotMessage({ rol, contenido, fuentes = [] }) {
  const isUser = rol === "user";
  return (
    <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-brand-primary text-brand-primary-foreground"
            : "bg-brand-muted text-brand-foreground"
        }`}
      >
        {contenido}
      </div>
      {fuentes.length > 0 && (
        <ul className="flex max-w-[85%] flex-wrap gap-1.5" aria-label="Fuentes usadas">
          {fuentes.map((f) => {
            const Icon = SOURCE_ICONS[f.tipo] ?? FileText;
            return (
              <li
                key={`${f.tipo}-${f.titulo}-${f.detalle ?? ""}`}
                title={f.detalle ?? f.titulo}
                className="flex items-center gap-1 rounded-full border border-brand-border bg-brand-card px-2 py-0.5 text-xs text-brand-muted-foreground"
              >
                <Icon className="h-3 w-3" />
                {f.titulo}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}