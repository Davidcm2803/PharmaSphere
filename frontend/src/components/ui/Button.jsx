import Spinner from "./Spinner";

const variants = {
  primary:
    "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-dark",
  secondary:
    "bg-brand-muted text-brand-foreground hover:bg-brand-accent",
  danger:
    "bg-brand-danger text-white hover:opacity-90",
  outline:
    "border border-brand-border bg-brand-card text-brand-foreground hover:bg-brand-muted",
};

export default function Button({
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
} 