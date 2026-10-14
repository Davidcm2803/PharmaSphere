import { Link } from "react-router-dom";
import { ChevronRight, Store } from "lucide-react";

export default function BranchSelector({ name = "Wellness Pharmacy" }) {
  return (
    <Link
      to="/"
      className="flex items-center gap-3 rounded-2xl bg-brand-accent px-3.5 py-3 transition-colors hover:bg-brand-muted"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary-dark text-brand-primary-foreground">
        <Store className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-bold text-brand-foreground">{name}</span>
        <span className="block text-xs text-brand-muted-foreground">Abrir tienda</span>
      </span>
      <ChevronRight className="h-4 w-4 text-brand-muted-foreground" />
    </Link>
  );
}