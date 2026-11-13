import Badge from "../../ui/Badge";

const ESTADO_BADGE = {
  pendiente: ["warning", "Pendiente"],
  recibida: ["success", "Recibida"],
  cancelada: ["danger", "Cancelada"],
};

export default function EstadoCompraBadge({ estado }) {
  const [variant, label] = ESTADO_BADGE[estado] ?? ["neutral", estado];
  return <Badge variant={variant}>{label}</Badge>;
}
