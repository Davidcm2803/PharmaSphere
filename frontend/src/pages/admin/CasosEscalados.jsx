import { useState } from "react";
import { AlertTriangle, Phone, RotateCcw } from "lucide-react";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";
import EstadoCasoBadge from "../../components/admin/support/EstadoCasoBadge";
import NivelCasoBadge from "../../components/admin/support/NivelCasoBadge";
import useCasosEscalados from "../../hooks/useCasosEscalados";

const ESTADOS = [
  { value: "abierto", label: "Abiertos" },
  { value: "atendido", label: "En atención" },
  { value: "cerrado", label: "Cerrados" },
  { value: "", label: "Todos los estados" },
];

const NIVELES = [
  { value: "", label: "Todos los niveles" },
  { value: "moderado", label: "Moderado" },
  { value: "grave", label: "Grave" },
  { value: "emergencia", label: "Emergencia" },
];

function formatearFecha(iso) {
  try {
    return new Date(iso).toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function CasosEscalados() {
  const [estado, setEstado] = useState("abierto");
  const [nivel, setNivel] = useState("");
  const { casos, total, loading, error, actuandoId, tomar, cerrar, reabrir, page, setPage, pageSize } =
    useCasosEscalados({ estado, nivel });

  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-brand-foreground">Casos escalados por Javier</h1>
          <p className="text-sm text-brand-muted-foreground">
            Clientes que necesitan seguimiento de un farmacéutico o encargado.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={estado}
            onChange={(e) => { setEstado(e.target.value); setPage(1); }}
            className="rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm"
          >
            {ESTADOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={nivel}
            onChange={(e) => { setNivel(e.target.value); setPage(1); }}
            className="rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm"
          >
            {NIVELES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-brand-muted-foreground">
          <Spinner size="sm" /> Cargando casos…
        </div>
      ) : casos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-border px-4 py-10 text-center text-sm text-brand-muted-foreground">
          No hay casos con estos filtros.
        </div>
      ) : (
        <div className="space-y-3">
          {casos.map((c) => (
            <div key={c.id_caso} className="rounded-2xl border border-brand-border bg-brand-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-brand-foreground">Caso #{c.id_caso}</span>
                  <NivelCasoBadge nivel={c.nivel} />
                  <EstadoCasoBadge estado={c.estado} />
                </div>
                <span className="text-xs text-brand-muted-foreground">{formatearFecha(c.created_at)}</span>
              </div>

              <div className="mt-2 text-sm">
                <p className="font-medium text-brand-foreground">
                  {c.cliente_nombre || "Cliente sin nombre"}
                  {c.cliente_correo && (
                    <span className="ml-1 font-normal text-brand-muted-foreground">· {c.cliente_correo}</span>
                  )}
                </p>
                <p className="mt-1 text-brand-muted-foreground">
                  <span className="font-semibold text-brand-foreground">Motivo:</span> {c.motivo}
                </p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-brand-muted px-3 py-2 text-brand-foreground">
                  {c.mensaje_usuario}
                </p>
                {c.empleado_nombre && (
                  <p className="mt-1 text-xs text-brand-muted-foreground">Atendido por {c.empleado_nombre}</p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {c.estado === "abierto" && (
                  <Button
                    onClick={() => tomar(c.id_caso)}
                    disabled={actuandoId === c.id_caso}
                    className="px-3 py-1.5 text-xs"
                  >
                    <Phone className="mr-1.5 h-3.5 w-3.5" /> Tomar caso
                  </Button>
                )}
                {c.estado === "atendido" && (
                  <Button
                    onClick={() => cerrar(c.id_caso)}
                    disabled={actuandoId === c.id_caso}
                    className="px-3 py-1.5 text-xs"
                  >
                    Marcar como resuelto
                  </Button>
                )}
                {c.estado === "cerrado" && (
                  <Button
                    variant="outline"
                    onClick={() => reabrir(c.id_caso)}
                    disabled={actuandoId === c.id_caso}
                    className="px-3 py-1.5 text-xs"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reabrir
                  </Button>
                )}
                {c.nivel === "emergencia" && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5" /> Verificar que el cliente recibió ayuda
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2 text-sm">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs">
            Anterior
          </Button>
          <span className="text-brand-muted-foreground">Página {page} de {totalPaginas}</span>
          <Button variant="outline" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs">
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}