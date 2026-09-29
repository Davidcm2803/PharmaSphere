import Button from "./Button";
import Spinner from "./Spinner";

function Pagination({ page, totalPages, onPageChange }) {
  return (
    <div className="flex items-center justify-between border-t border-brand-border px-4 py-3">
      <span className="text-sm text-brand-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}

export default function Table({
  columns,
  rows,
  rowKey = "id",
  loading = false,
  emptyMessage = "No hay datos para mostrar",
  page = 1,
  totalPages = 1,
  onPageChange,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-muted text-brand-muted-foreground">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-brand-primary">
                  <Spinner />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-brand-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row[rowKey]} className="hover:bg-brand-muted/50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-brand-foreground">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {onPageChange && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  );
}