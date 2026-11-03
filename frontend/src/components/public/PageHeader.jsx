export default function PageHeader({ title, children }) {
  return (
    <section className="border-b border-brand-border bg-brand-accent/60">
      <div className="mx-auto max-w-[1536px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-foreground sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {children && (
          <p className="mt-2 max-w-2xl text-base text-brand-muted-foreground sm:mt-3 sm:text-lg">{children}</p>
        )}
      </div>
    </section>
  );
}