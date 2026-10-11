import type {
  AddProductsFromCatalogResponse,
  ApiErrorBody,
  BotSettingsResponse,
  CatalogProductsResponse,
  OrdersResponse,
  PriceChangesResponse,
  ProductCategoriesResponse,
  ProductFilters,
  ProductsResponse,
  SettingsHistoryResponse,
  SettingsManagementSummaryResponse,
  SettingsOperationApplyInput,
  SettingsOperationPreviewInput,
  SettingsOperationPreviewResponse,
  SettingsOperationResultResponse,
  StoresResponse,
  UpdateBotSettingsInput
} from "./types";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly details: unknown;

  constructor(message: string, status: number, code: string | null = null, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function readErrorBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await readErrorBody(response);
    const fallbackMessage = response.status === 503
      ? "Verilənlər bazası əlçatan deyil. PostgreSQL bağlantısını yoxlayın."
      : "Məlumatları yükləmək mümkün olmadı.";
    throw new ApiRequestError(
      body?.error?.message ?? fallbackMessage,
      response.status,
      body?.error?.code ?? null,
      body?.error?.details
    );
  }

  return (await response.json()) as T;
}

export function fetchStores(signal: AbortSignal) {
  return fetchJson<StoresResponse>("/api/stores", { signal });
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

  return fetchJson<ProductsResponse>(`/api/products?${query.toString()}`, { signal });
}

export function fetchProductCategories(signal: AbortSignal) {
  return fetchJson<ProductCategoriesResponse>("/api/products/categories", { signal });
}

export function fetchCatalogProducts(
  search: string,
  page: number,
  pageSize: number,
  signal?: AbortSignal
) {
  const query = new URLSearchParams({
    search: search.trim(),
    page: String(page),
    pageSize: String(pageSize)
  });

  return fetchJson<CatalogProductsResponse>(`/api/catalog-products?${query.toString()}`, { signal });
}

export function addProductsFromCatalog(catalogProductIds: string[], signal?: AbortSignal) {
  return fetchJson<AddProductsFromCatalogResponse>("/api/products/from-catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ catalogProductIds }),
    signal
  });
}

export function fetchSettings(signal?: AbortSignal) {
  return fetchJson<BotSettingsResponse>("/api/settings", { signal });
}

export function updateSettings(settings: UpdateBotSettingsInput, signal?: AbortSignal) {
  return fetchJson<BotSettingsResponse>("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
    signal
  });
}

export function fetchPriceChanges(signal?: AbortSignal) {
  return fetchJson<PriceChangesResponse>("/api/price-changes", { signal });
}

export function fetchSettingsManagementSummary(signal?: AbortSignal) {
  return fetchJson<SettingsManagementSummaryResponse>("/api/settings/management-summary", { signal });
}

export function fetchOrders(signal?: AbortSignal) {
  return fetchJson<OrdersResponse>("/api/orders", { signal });
}

export function fetchSettingsHistory(page = 1, pageSize = 20, search = "", signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search.trim()) query.set("search", search.trim());
  return fetchJson<SettingsHistoryResponse>(`/api/settings/history?${query.toString()}`, { signal });
}

export function previewSettingsOperation(input: SettingsOperationPreviewInput, signal?: AbortSignal) {
  return fetchJson<SettingsOperationPreviewResponse>("/api/settings/operations/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal
  });
}

export function applySettingsOperation(input: SettingsOperationApplyInput, signal?: AbortSignal) {
  return fetchJson<SettingsOperationResultResponse>("/api/settings/operations/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal
  });
}
