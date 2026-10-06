import { PRODUCTS } from "../data/products";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8010";
const USE_FALLBACK = import.meta.env.VITE_ENABLE_CATALOG_FALLBACK !== "false";

const normalizeProduct = (product) => ({
  id: product.id ?? product.id_producto,
  name: product.name ?? product.nombre,
  description: product.description ?? product.descripcion ?? "Información del producto disponible en farmacia.",
  category: product.category ?? product.categoria ?? "Farmacia",
  price: Number(product.price ?? product.precio ?? 0),
  prescriptionRequired: Boolean(product.prescriptionRequired ?? product.requiere_receta),
  stock: Number(product.stock ?? product.cantidad ?? 0),
  image: product.image ?? product.imagen_url ?? null,
  featured: Boolean(product.featured ?? product.destacado),
  color: product.color ?? "#edf4f1",
});

function filterFallback(params = {}) {
  const query = params.search?.trim().toLocaleLowerCase("es") ?? "";
  let items = PRODUCTS.filter((product) => {
    const matchesSearch = !query || `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase("es").includes(query);
    const matchesCategory = !params.category || params.category === "Todos" || product.category === params.category;
    const matchesMin = !params.minPrice || product.price >= Number(params.minPrice);
    const matchesMax = !params.maxPrice || product.price <= Number(params.maxPrice);
    const matchesFeatured = !params.featured || product.featured;
    return matchesSearch && matchesCategory && matchesMin && matchesMax && matchesFeatured;
  });

  if (params.sort === "price-asc") items = items.toSorted((a, b) => a.price - b.price);
  if (params.sort === "price-desc") items = items.toSorted((a, b) => b.price - a.price);
  if (params.sort === "name") items = items.toSorted((a, b) => a.name.localeCompare(b.name, "es"));

  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, source: "fallback" };
}

async function request(path, signal) {
  const response = await fetch(`${API_URL}${path}`, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`El servidor respondió con estado ${response.status}.`);
  return response.json();
}

export async function getProducts(params = {}, signal) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== false) searchParams.set(key, value);
  });

  try {
    const payload = await request(`/api/inventory/products?${searchParams}`, signal);
    const rawItems = payload.items ?? payload.results ?? payload.data ?? payload;
    return {
      items: rawItems.map(normalizeProduct),
      total: payload.total ?? rawItems.length,
      source: "api",
    };
  } catch (error) {
    if (error.name === "AbortError") throw error;
    if (!USE_FALLBACK) throw new Error("No pudimos cargar el catálogo. Revisá tu conexión e intentá de nuevo.", { cause: error });
    return filterFallback(params);
  }
}

export async function getProductById(id, signal) {
  try {
    const payload = await request(`/api/inventory/products/${id}`, signal);
    return { item: normalizeProduct(payload.data ?? payload), source: "api" };
  } catch (error) {
    if (error.name === "AbortError") throw error;
    if (!USE_FALLBACK) throw new Error("No pudimos cargar este producto.", { cause: error });
    const item = PRODUCTS.find((product) => String(product.id) === String(id));
    if (!item) throw new Error("El producto que buscás no existe o ya no está disponible.", { cause: error });
    return { item, source: "fallback" };
  }
}
