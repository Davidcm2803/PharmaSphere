import { useProducts } from "../hooks/useProducts";
import { EmptyState, ErrorState, ProductGridSkeleton } from "./AsyncStates";
import { ProductCard } from "./ProductCard";

export function AsyncProducts({ params, navigate, reset }) {
  const { items, loading, error, retry } = useProducts(params);

  if (loading) return <ProductGridSkeleton count={params.pageSize ?? 4} />;
  if (error) return <ErrorState message={error} retry={retry} />;
  if (!items.length) return <EmptyState reset={reset} />;

  return <div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} navigate={navigate} />)}</div>;
}
