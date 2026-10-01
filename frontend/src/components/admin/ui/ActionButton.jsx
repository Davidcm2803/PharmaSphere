import { Link } from "react-router-dom";
import { cn } from "../../../lib/utils";

export default function ActionButton({ variant = "outline", to, className, ...props }) {
  const classes = cn(
    "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none",
    "disabled:pointer-events-none disabled:opacity-60",
    variant === "primary"
      ? "bg-brand-primary-dark text-brand-primary-foreground shadow-sm hover:bg-brand-primary"
      : variant === "danger"
        ? "bg-brand-danger text-white hover:opacity-90"
        : "border border-brand-border bg-brand-card text-brand-foreground hover:bg-brand-muted",
    className,
  );
  return to ? <Link to={to} className={classes} {...props} /> : <button className={classes} {...props} />;
}