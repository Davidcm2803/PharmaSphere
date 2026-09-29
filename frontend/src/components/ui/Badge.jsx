const variants = {
  neutral: "bg-brand-muted text-brand-muted-foreground",
  success: "bg-brand-success-soft text-brand-success",
  warning: "bg-brand-warning-soft text-brand-warning",
  danger: "bg-brand-danger-soft text-brand-danger",
};

export default function Badge({ variant = "neutral", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}