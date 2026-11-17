export default function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-brand-foreground/[0.04] px-4 py-4 sm:px-5 sm:py-5">
      <p className="text-sm text-brand-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-bold sm:text-2xl text-brand-foreground">{value}</p>
    </div>
  );
}