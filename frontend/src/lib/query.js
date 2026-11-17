// Arma "?a=1&b=2" ignorando valores vacíos o nulos. Devuelve "" si no hay parámetros
export const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value != null) query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : "";
};

// Fecha y hora legibles en es-CR
export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("es-CR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

// Fecha AAAA-MM-DD sin desfase de zona horaria
export const formatDate = (value) => {
  if (!value) return "—";
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CR", {
    dateStyle: "medium",
  });
};

export const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};