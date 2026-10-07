export default function PageHeader({ title, children }) {
  return (
    <section className="border-b border-brand-border bg-brand-accent/60">
      <div className="mx-auto max-w-[1536px] px-4 py-12 sm:px-6 lg:px-8 lg:py-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-brand-foreground sm:text-5xl">
          {title}
        </h1>
        {children && (
          <p className="mt-3 max-w-2xl text-lg text-brand-muted-foreground">{children}</p>
        )}
      </div>
    </section>
  );
}