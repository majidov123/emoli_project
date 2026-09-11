export const PRODUCT_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "OUT_OF_STOCK_STORE",
  "OUT_OF_STOCK_PLATFORM",
  "HIDDEN",
  "INVALID",
  "UNSALEABLE",
  "READY",
  "DRAFT",
  "UNKNOWN"
] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type ProductSource = "bbu" | "bot";
export type BotEnabledFilter = "all" | "enabled" | "disabled";
export type StockBucket = "OUT" | "LOW" | "IN_STOCK";
export type StockBucketFilter = "all" | StockBucket;
export type MinimumPriceFilter = "all" | "limited" | "unlimited";

export interface BotProductFilters {
  botEnabled: BotEnabledFilter;
  stockBucket: StockBucketFilter;
  minimumPrice: MinimumPriceFilter;
  category: string;
}

export interface Store {
  id: string;
  name: string;
  platform: string;
  externalId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  productCount: number;
}

export type ProductStore = Omit<Store, "productCount">;

export interface Product {
  id: string;
  storeId: string;
  externalId: string;
  sku: string | null;
  name: string;
  imageUrl: string | null;
  category: string | null;
  brand: string | null;
  stock: number;
  previousPrice: string | null;
  currentPrice: string | null;
  marketplacePrice: string | null;
  competitorLowestPrice: string | null;
  minimumPrice: string | null;
  maximumPrice: string | null;
  botEnabled: boolean;
  normalizedStatus: ProductStatus;
  externalStatus: string | null;
  sourceUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  store: ProductStore;
  cheapestSellerName?: string | null;
  mpn?: string | null;
  barcode?: string | null;
  costPrice?: string | null;
  pickupPoint?: string | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProductsResponse {
  data: Product[];
  pagination: Pagination;
}

export interface StoresResponse {
  data: Store[];
}

export interface ProductCategoriesResponse {
  data: string[];
}

export interface ProductFilters {
  page: number;
  pageSize: number;
  search: string;
  status?: ProductStatus;
  category: string;
  botEnabled: BotEnabledFilter;
  stockBucket?: StockBucket;
  hasMinimumPrice?: boolean;
}
