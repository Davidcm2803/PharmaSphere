import { Link } from "react-router-dom";

export default function SectionHeading({ title, to, linkLabel }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <h2 className="text-2xl font-extrabold tracking-tight text-brand-foreground sm:text-3xl">{title}</h2>
      {to && (
        <Link to={to} className="shrink-0 text-sm font-semibold text-brand-primary hover:text-brand-primary-dark">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}