// Utilidades de vencimiento compartidas por Inventario, Vencimientos y LotesModal

const pad = (n) => String(n).padStart(2, "0");

// "2026-12-15" -> Date local (sin desfase de zona horaria)
const parse = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

// "2026-12-15" -> "15 dic 2026"
export const fmtDate = (iso) =>
  parse(iso).toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// Mañana como YYYY-MM-DD (hora local): el backend rechaza lotes ya vencidos
export const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Días que faltan para vencer (negativo = ya venció)
export const daysUntil = (iso) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parse(iso) - today) / 86400000);
};

// Umbrales sugeridos: >90 normal, 61-90 próximo, 31-60 advertencia, 1-30 urgente
export const expiryStatus = (days) => {
  if (days < 0) return { variant: "danger", label: "Vencido" };
  if (days === 0) return { variant: "danger", label: "Vence hoy" };
  if (days <= 30) return { variant: "danger", label: "Urgente" };
  if (days <= 60) return { variant: "warning", label: "Advertencia" };
  if (days <= 90) return { variant: "neutral", label: "Próximo" };
  return { variant: "success", label: "Normal" };
};

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
