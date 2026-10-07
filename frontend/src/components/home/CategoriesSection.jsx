import CategoryGrid from "../layout/CategoryGrid";
import SectionHeading from "./SectionHeading";

export default function CategoriesSection() {
  return (
    <section className="bg-brand-muted py-12 lg:py-16">
      <div className="mx-auto max-w-[1536px] px-4 sm:px-6 lg:px-8">
        <SectionHeading title="Compra por categoría" to="/categories" linkLabel="Ver todas" />
        <CategoryGrid limit={4} />
      </div>
    </section>
  );
}