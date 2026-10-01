export default function DataTable({ columns, rows, rowKey = "id", empty = "Sin resultados", renderActions }) {
  const cell = (c, row) => (c.render ? c.render(row) : row[c.key]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-border px-5 py-10 text-center text-brand-muted-foreground">
        {empty}
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-brand-border md:block">
        <table className="w-full text-left text-[15px]">
          <thead className="bg-brand-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-brand-muted-foreground">
                  {c.label}
                </th>
              ))}
              {renderActions && (
                <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-brand-muted-foreground">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {rows.map((row) => (
              <tr key={row[rowKey]} className="transition-colors hover:bg-brand-muted/60">
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={`px-5 py-4 ${i === 0 ? "font-bold text-brand-foreground" : "text-brand-muted-foreground"}`}
                  >
                    {cell(c, row)}
                  </td>
                ))}
                {renderActions && (
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">{renderActions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={row[rowKey]} className="rounded-2xl border border-brand-border p-4">
            <p className="font-bold text-brand-foreground">{cell(columns[0], row)}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {columns.slice(1).map((c) => (
                <div key={c.key} className="min-w-0">
                  <dt className="text-xs font-bold uppercase tracking-wide text-brand-muted-foreground">{c.label}</dt>
                  <dd className="mt-0.5 truncate text-brand-foreground">{cell(c, row)}</dd>
                </div>
              ))}
            </dl>
            {renderActions && (
              <div className="mt-4 flex justify-end gap-1 border-t border-brand-border pt-3">{renderActions(row)}</div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}