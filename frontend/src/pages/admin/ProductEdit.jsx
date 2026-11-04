import { ArrowLeft } from "lucide-react";
import { useParams } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import { ENDPOINTS } from "../../config/api";
import PageHeader from "../../components/admin/ui/PageHeader";
import ActionButton from "../../components/admin/ui/ActionButton";
import Notice from "../../components/admin/ui/Notice";
import ProductForm from "../../components/admin/products/ProductForm";

export default function ProductEdit() {
  const { id } = useParams();
  // Con token de admin, el detalle incluye costo y estado
  const { data, error, loading } = useFetch(`${ENDPOINTS.PRODUCTS}/${id}`);

  return (
    <>
      <PageHeader
        eyebrow="Operaciones de farmacia"
        title="Editar producto"
        subtitle={data?.nombre ?? "Modifica los datos del producto."}
        actions={
          <ActionButton to="/admin/productos">
            <ArrowLeft className="h-4 w-4" /> Volver
          </ActionButton>
        }
      />
      {loading && <p className="py-16 text-center text-brand-muted-foreground">Cargando producto…</p>}
      {error && <Notice type="error" className="mt-8">{error}</Notice>}
      {data && <ProductForm key={data.id_producto} product={data} />}
    </>
  );
}