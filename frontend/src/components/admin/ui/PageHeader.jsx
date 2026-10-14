export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-primary-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-extrabold sm:text-4xl tracking-tight text-brand-foreground">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-brand-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex w-full items-center gap-3 sm:w-auto">{actions}</div>}
    </div>
  );
}