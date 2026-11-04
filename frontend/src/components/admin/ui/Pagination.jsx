import { ChevronLeft, ChevronRight } from "lucide-react";

const btn =
  "flex h-9 items-center gap-1 rounded-lg border border-brand-border bg-brand-card px-3 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-muted disabled:pointer-events-none disabled:opacity-40";

export default function Pagination({ page, pages, total, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <p className="text-sm text-brand-muted-foreground">
        Página {page} de {pages} · {total} en total
      </p>
      <div className="flex gap-2">
        <button className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <button className={btn} disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Siguiente <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}