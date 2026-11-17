import { ArrowLeft } from "lucide-react";
import PageHeader from "../../components/admin/ui/PageHeader";
import ActionButton from "../../components/admin/ui/ActionButton";
import ProductForm from "../../components/admin/products/ProductForm";

export default function ProductCreate() {
  return (
    <>
      <PageHeader
        eyebrow="Operaciones de farmacia"
        title="Nuevo producto"
        subtitle="Completa los datos para agregarlo al catálogo."
        actions={
          <ActionButton to="/admin/productos">
            <ArrowLeft className="h-4 w-4" /> Volver
          </ActionButton>
        }
      />
      <ProductForm />
    </>
  );
}