import { AlertTriangle, PhoneCall, Siren } from "lucide-react";

// Extrae el primer numero de telefono "parecido" del texto para armar un tel:
// (el backend no manda el numero aparte, solo lo incluye en la respuesta)
function extraerTelefono(texto) {
  const match = texto.match(/(\+?\d[\d\s-]{5,}\d)/);
  if (!match) return null;
  const limpio = match[1].replace(/[\s-]/g, "");
  return limpio.length >= 7 ? limpio : null;
}

function Fuentes({ fuentes }) {
  if (!fuentes?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {fuentes.map((f, i) => (
        <span
          key={i}
          className="rounded-full border border-brand-border px-2 py-0.5 text-[11px] text-brand-muted-foreground"
          title={f.detalle || undefined}
        >
          {f.titulo}
        </span>
      ))}
    </div>
  );
}

// Mensaje normal, sin alerta (nivel_alerta leve, o mensaje del usuario)
function BurbujaNormal({ rol, contenido, fuentes }) {
  const esUsuario = rol === "user";
  return (
    <div className={`flex ${esUsuario ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
          esUsuario
            ? "bg-brand-primary text-brand-primary-foreground"
            : "bg-brand-muted text-brand-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap">{contenido}</p>
        {!esUsuario && <Fuentes fuentes={fuentes} />}
      </div>
    </div>
  );
}

// nivel_alerta: "moderado" -> caso escalado, sin emergencia
function BurbujaModerado({ contenido, fuentes, escalamiento }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2 rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="whitespace-pre-wrap">{contenido}</p>
        {escalamiento?.referencia && (
          <p className="text-xs font-semibold">
            Caso #{escalamiento.referencia} — un encargado te contactará pronto.
          </p>
        )}
        <Fuentes fuentes={fuentes} />
      </div>
    </div>
  );
}

// nivel_alerta: "grave" -> algo que un farmaceutico debe revisar
function BurbujaGrave({ contenido, escalamiento }) {
  const telefono = extraerTelefono(contenido);
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-2 rounded-2xl border border-orange-300 bg-orange-50 px-3.5 py-3 text-sm text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-100">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
          <AlertTriangle className="h-3.5 w-3.5" />
          Esto requiere atención de un farmacéutico
        </div>
        <p className="whitespace-pre-wrap">{contenido}</p>
        {escalamiento?.referencia && (
          <p className="text-xs font-semibold">Caso #{escalamiento.referencia}</p>
        )}
        {telefono && (
          <a
            href={`tel:${telefono}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            Llamar ahora
          </a>
        )}
      </div>
    </div>
  );
}

// nivel_alerta: "emergencia" -> no se puede ayudar por chat, llamar ya
function BurbujaEmergencia({ contenido }) {
  const telefono = extraerTelefono(contenido);
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-2.5 rounded-2xl border-2 border-red-400 bg-red-50 px-3.5 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
          <Siren className="h-4 w-4" />
          Posible emergencia
        </div>
        <p className="whitespace-pre-wrap font-medium">{contenido}</p>
        {telefono && (
          <a
            href={`tel:${telefono}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-bold text-white"
          >
            <PhoneCall className="h-4 w-4" />
            Llamar a emergencias
          </a>
        )}
      </div>
    </div>
  );
}

// El frontend solo decide COMO se ve cada nivel; cual nivel es, lo decide
// siempre el backend en nivel_alerta.
export default function CopilotClienteMensaje({ rol, contenido, fuentes, nivelAlerta, escalamiento }) {
  if (rol === "user" || !nivelAlerta || nivelAlerta === "leve") {
    return <BurbujaNormal rol={rol} contenido={contenido} fuentes={fuentes} />;
  }
  if (nivelAlerta === "moderado") {
    return <BurbujaModerado contenido={contenido} fuentes={fuentes} escalamiento={escalamiento} />;
  }
  if (nivelAlerta === "grave") {
    return <BurbujaGrave contenido={contenido} escalamiento={escalamiento} />;
  }
  return <BurbujaEmergencia contenido={contenido} />;
}