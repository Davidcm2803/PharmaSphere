import { NavLink } from "react-router-dom";
import { cn } from "../../../lib/utils";

export default function SidebarItem({ path, label, icon: Icon, badge, tone }) {
  return (
    <NavLink
      to={`/admin/${path}`}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition-colors",
          isActive
            ? "bg-brand-primary-dark text-brand-primary-foreground shadow-md shadow-brand-primary/30"
            : "text-brand-muted-foreground hover:bg-brand-muted hover:text-brand-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span className="flex-1">{label}</span>
          {badge != null && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                isActive
                  ? "bg-white/20 text-white"
                  : tone === "danger"
                    ? "bg-brand-danger-soft text-brand-danger"
                    : "bg-brand-accent text-brand-accent-foreground",
              )}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}