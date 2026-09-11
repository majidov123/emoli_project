import type {
  ProductCategoriesResponse,
  ProductFilters,
  ProductsResponse,
  StoresResponse
} from "./types";

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    const message = response.status === 503
      ? "Verilənlər bazası əlçatan deyil. PostgreSQL bağlantısını yoxlayın."
      : "Məlumatları yükləmək mümkün olmadı.";
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function fetchStores(signal: AbortSignal) {
  return fetchJson<StoresResponse>("/api/stores", signal);
}

export function fetchProducts(filters: ProductFilters, signal: AbortSignal) {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize)
  });

  if (filters.search) query.set("search", filters.search);
  if (filters.status) query.set("status", filters.status);
  if (filters.category) query.set("category", filters.category);
  if (filters.botEnabled !== "all") {
    query.set("botEnabled", String(filters.botEnabled === "enabled"));
  }
  if (filters.stockBucket) query.set("stockBucket", filters.stockBucket);
  if (filters.hasMinimumPrice !== undefined) {
    query.set("hasMinimumPrice", String(filters.hasMinimumPrice));
  }

  return fetchJson<ProductsResponse>(`/api/products?${query.toString()}`, signal);
}

export function fetchProductCategories(signal: AbortSignal) {
  return fetchJson<ProductCategoriesResponse>("/api/products/categories", signal);
}
