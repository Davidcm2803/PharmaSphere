export default function Field({ label, error, hint, required, className, children }) {
  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-brand-foreground">
        {label}
        {required && <span className="text-brand-danger"> *</span>}
        <div className="mt-1.5 font-normal">{children}</div>
      </label>
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-brand-danger">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-brand-muted-foreground">{hint}</p>
      )}
    </div>
  );
}