export default function Input({ label, error, id, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-brand-foreground">
          {label}
        </label>
      )}
      <input
        id={id}
        aria-invalid={error ? "true" : undefined}
        className={`rounded-lg border bg-brand-card px-3 py-2 text-sm text-brand-foreground outline-none transition placeholder:text-brand-muted-foreground focus:ring-2 focus:ring-brand-ring disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? "border-brand-danger" : "border-brand-input"
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-brand-danger">{error}</span>}
    </div>
  );
}