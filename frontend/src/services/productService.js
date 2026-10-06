import { PRODUCTS } from "../data/products";

const LOCAL_DELAY = 180;

function waitForLocalData(signal) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, LOCAL_DELAY);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Solicitud cancelada", "AbortError"));
    }, { once: true });
  });
}

function filterProducts(params = {}) {
  const query = params.search?.trim().toLocaleLowerCase("es") ?? "";
  let items = PRODUCTS.filter((product) => {
    const searchableText = `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase("es");
    const matchesSearch = !query || searchableText.includes(query);
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
  return { items: items.slice(start, start + pageSize), total: items.length };
}

export async function getProducts(params = {}, signal) {
  await waitForLocalData(signal);
  return filterProducts(params);
}

export async function getProductById(id, signal) {
  await waitForLocalData(signal);
  const item = PRODUCTS.find((product) => String(product.id) === String(id));
  if (!item) throw new Error("El producto que buscás no existe o ya no está disponible.");
  return { item };
}
