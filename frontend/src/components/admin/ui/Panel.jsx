export default function Panel({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="mt-8 rounded-3xl border border-brand-border bg-brand-card p-4 shadow-sm sm:p-7">
      {(title || Icon) && (
        <header className="mb-5 flex items-center gap-3 border-b border-brand-border pb-5 sm:mb-6 sm:gap-4">
          {Icon && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-accent text-brand-primary-dark">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div>
            <h2 className="text-lg font-bold text-brand-foreground">{title}</h2>
            {subtitle && <p className="text-[15px] text-brand-muted-foreground">{subtitle}</p>}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}