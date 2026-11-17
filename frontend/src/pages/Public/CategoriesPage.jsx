import CategoryGrid from "../../components/layout/CategoryGrid";
import PageHeader from "../../components/public/PageHeader";

export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Compra por categoría">
        Encuentra más rápido los productos que acompañan tu rutina de cuidado.
      </PageHeader>
      <div className="mx-auto max-w-[1536px] px-4 py-12 sm:px-6 lg:px-8">
        <CategoryGrid />
      </div>
    </>
  );
}