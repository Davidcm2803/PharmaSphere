const types = {
  info: "border-brand-border bg-brand-accent text-brand-accent-foreground",
  success: "border-brand-success bg-brand-success-soft text-brand-success",
  warning: "border-brand-warning bg-brand-warning-soft text-brand-warning",
  error: "border-brand-danger bg-brand-danger-soft text-brand-danger",
};

export default function Alert({ type = "info", children }) {
  return (
    <div
      role="alert"
      className={`rounded-lg border px-4 py-3 text-sm ${types[type]}`}
    >
      {children}
    </div>
  );
}