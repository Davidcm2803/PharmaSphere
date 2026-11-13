import { useState } from "react";
import { Search } from "lucide-react";
import { useProductSearch } from "../../../hooks/usePurchases";
import useDebouncedValue from "../../../hooks/useDebouncedValue";

// Busca productos por nombre y avisa con onPick(producto). Oculta los que ya están en la orden
export default function ProductSearch({ excludeIds = [], onPick }) {
  const [text, setText] = useState("");
  const q = useDebouncedValue(text.trim(), 300);
  const { data, loading, error } = useProductSearch(q);
  const results = (data?.items ?? []).filter(
    (p) => !excludeIds.includes(p.id_producto),
  );
  const searching = q.length >= 2;

  return (
    <div>
      <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted-foreground">
        Agregar producto
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted-foreground" />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe al menos 2 letras del nombre…"
            className="h-10 w-full rounded-lg border border-brand-border bg-brand-card pl-9 pr-3 text-base text-brand-foreground placeholder:text-brand-muted-foreground focus:border-brand-primary focus:outline-none sm:text-sm"
          />
        </span>
      </label>

      {searching && (
        <ul className="mt-2 divide-y divide-brand-border overflow-hidden rounded-2xl border border-brand-border bg-brand-card">
          {error ? (
            <li className="px-4 py-3 text-sm text-brand-danger">
              No se pudo buscar: {error}
            </li>
          ) : loading ? (
            <li className="px-4 py-3 text-sm text-brand-muted-foreground">
              Buscando…
            </li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-brand-muted-foreground">
              Sin resultados.
            </li>
          ) : (
            results.map((p) => (
              <li key={p.id_producto}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(p);
                    setText("");
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-brand-muted"
                >
                  <span className="font-semibold text-brand-foreground">
                    {p.nombre}
                  </span>
                  <span className="text-brand-primary">+ Agregar</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
