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
export type ProductExportScope =
  | "ALL"
  | "ACTIVE"
  | "NOT_ACTIVE"
  | "OUT_OF_STOCK_STORE"
  | "OUT_OF_STOCK_PLATFORM"
  | "HIDDEN"
  | "INVALID"
  | "UNSALEABLE"
  | "READY"
  | "DRAFT";
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

export interface CatalogProduct {
  id: string;
  externalId: string;
  name: string;
  imageUrl: string | null;
  category: string | null;
  barcode: string | null;
  mpn: string | null;
  defaultPrice: string;
  active: boolean;
  alreadyAdded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogProductsResponse {
  data: CatalogProduct[];
  pagination: Pagination;
}

export interface AddProductsFromCatalogResponse {
  data: Product[];
  addedCount: number;
}

export interface BotSettings {
  id: string;
  botEnabled: boolean;
  botPriceSource: "BBU" | "SITE";
  checkIntervalMinutes: number;
  undercutAmount: string;
  allowProductsWithoutMinimumPrice: boolean;
  friendStoreExternalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BotSettingsResponse {
  data: BotSettings;
}

export interface UpdateBotSettingsInput {
  botEnabled?: boolean;
  botPriceSource?: "BBU" | "SITE";
  checkIntervalMinutes?: number;
  undercutAmount?: string;
  allowProductsWithoutMinimumPrice?: boolean;
  friendStoreExternalId?: string | null;
}

export type PriceChangeDirection = "DECREASE" | "INCREASE" | "UPPER_LIMIT" | "UNCHANGED";

export interface PriceChangeProduct {
  id: string;
  externalId: string;
  sku: string | null;
  name: string;
}

export interface PriceChange {
  id: string;
  productId: string;
  oldPrice: string;
  newPrice: string;
  competitorPrice: string | null;
  minimumPrice: string | null;
  maximumPrice: string | null;
  direction: PriceChangeDirection;
  reason: string;
  source: string;
  createdAt: string;
  product: PriceChangeProduct;
}

export interface PriceChangesResponse {
  data: PriceChange[];
}

export type SettingsOperationType =
  | "AUTO_ASSIGN_MINIMUM_LIMITS"
  | "ADJUST_PRICES_TO_MINIMUM"
  | "SET_PRICES_TO_MAXIMUM"
  | "INCREASE_PRICES"
  | "IMPORT_LIMITS";

export type AutoLimitSelection = "ALL" | "WITHOUT_LIMIT";
export type UpperLimitSelection = "ALL" | "ABOVE_UPPER";

export type SettingsOperationPreviewInput =
  | {
      operation: "AUTO_ASSIGN_MINIMUM_LIMITS";
      selection: AutoLimitSelection;
      percentage: string;
    }
  | {
      operation: "ADJUST_PRICES_TO_MINIMUM";
      percentage: string;
    }
  | {
      operation: "SET_PRICES_TO_MAXIMUM";
      selection: UpperLimitSelection;
    }
  | {
      operation: "INCREASE_PRICES";
      percentage: string;
    }
  | {
      operation: "IMPORT_LIMITS";
      rows: Array<{
        externalId: string;
        minimumPrice?: string;
        maximumPrice?: string;
      }>;
    };

export type SettingsOperationApplyInput = SettingsOperationPreviewInput & {
  previewToken: string;
  expectedAffectedCount: number;
};

export interface SettingsOperationChange {
  productId: string;
  externalId: string;
  name: string;
  oldPrice: string | null;
  newPrice: string | null;
  oldMinimumPrice: string | null;
  newMinimumPrice: string | null;
  oldMaximumPrice: string | null;
  newMaximumPrice: string | null;
}

export interface SettingsOperationPreview {
  operation: SettingsOperationType;
  matchedCount: number;
  affectedCount: number;
  unchangedCount: number;
  skippedCount: number;
  constrainedCount: number;
  previewToken: string;
  changes: SettingsOperationChange[];
  truncated: boolean;
}

export interface SettingsOperationPreviewResponse {
  data: SettingsOperationPreview;
}

export interface SettingsOperationResult {
  id: string;
  type: SettingsOperationType;
  matchedCount: number;
  affectedCount: number;
  unchangedCount: number;
  skippedCount: number;
  constrainedCount: number;
  createdAt: string;
  priceChangesCreated: number;
}

export interface SettingsOperationResultResponse {
  data: SettingsOperationResult;
}

export interface SettingsManagementSummary {
  store: { id: string; name: string };
  totalProducts: number;
  activeProducts: number;
  botEnabledProducts: number;
  withMinimumPrice: number;
  withoutMinimumPrice: number;
  withMaximumPrice: number;
  belowMinimumPrice: number;
  aboveMaximumPrice: number;
  friendOffersExcluded: number;
  priceChangeCount: number;
  settingsOperationCount: number;
  botRunCount: number;
  botEnabled: boolean;
  latestBotRun: {
    status: "RUNNING" | "SUCCESS" | "PARTIAL" | "FAILED";
    startedAt: string;
    finishedAt: string | null;
  } | null;
  marketplaceConnected: false;
  orderSourceConnected: false;
}

export interface SettingsManagementSummaryResponse {
  data: SettingsManagementSummary;
}

export type OrderStatus =
  | "BUYER_NOT_HOME"
  | "RETURNED"
  | "PACKAGING"
  | "NEW"
  | "CLARIFYING_WITH_CUSTOMER"
  | "CUSTOMER_CONFIRMED"
  | "READY_FOR_DELIVERY"
  | "ACCEPTED_FOR_DELIVERY"
  | "REJECTED_FOR_DELIVERY"
  | "ON_WAY_TO_DISTRIBUTION_CENTER"
  | "AT_DISTRIBUTION_CENTER"
  | "DELIVERY_SCHEDULED"
  | "WITH_COURIER"
  | "ON_WAY_TO_PUDO"
  | "AT_PUDO"
  | "DELIVERED"
  | "PARTIALLY_DELIVERED"
  | "CUSTOMER_REFUSED"
  | "LOGISTICS_CANCELLED"
  | "COMPLETED"
  | "CUSTOMER_CANCELLED"
  | "MARKET_CANCELLED"
  | "REDIRECTED"
  | "STORAGE_AT_DC_PARTNER"
  | "ON_THE_WAY_TO_DC_PARTNER"
  | "ON_WAY_TO_INTERMEDIATE_CENTER"
  | "AT_INTERMEDIATE_CENTER"
  | "CONFIRMED_FOR_PICKING"
  | "PICKING"
  | "PICKING_COMPLETED"
  | "PACKED"
  | "OFFLINE_CREDIT";

export interface LocalOrderItem {
  id: string;
  productExternalId: string | null;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: string;
}

export interface LocalOrderStatusHistoryItem {
  id: string;
  status: OrderStatus;
  occurredAt: string;
}

export interface LocalOrder {
  id: string;
  externalId: string;
  customerName: string | null;
  totalAmount: string;
  orderedAt: string;
  currentStatus: OrderStatus;
  loadedAt: string;
  items: LocalOrderItem[];
  statusHistory: LocalOrderStatusHistoryItem[];
}

export interface OrdersSummary {
  total: number;
  totalAmount: string;
  oldestOrderedAt: string | null;
  newestOrderedAt: string | null;
  lastLoadedAt: string | null;
  statusCounts: Partial<Record<OrderStatus, number>>;
}

export interface OrdersResponse {
  data: LocalOrder[];
  summary: OrdersSummary;
}

export interface SettingsHistorySummary {
  botRuns: {
    total: number;
    RUNNING: number;
    SUCCESS: number;
    PARTIAL: number;
    FAILED: number;
    productsChecked: number;
    pricesDecreased: number;
    pricesIncreased: number;
    pricesSetToUpperLimit: number;
    productsSkipped: number;
    errorsCount: number;
  };
  priceChanges: {
    total: number;
    DECREASE: number;
    INCREASE: number;
    UPPER_LIMIT: number;
    UNCHANGED: number;
  };
  settingsOperations: {
    total: number;
    affectedCount: number;
  };
}

interface SettingsHistoryEventBase {
  id: string;
  type: "BOT_RUN" | "PRICE_CHANGE" | "SETTINGS_OPERATION";
  createdAt?: string;
  occurredAt?: string;
}

export interface BotRunHistoryEvent extends SettingsHistoryEventBase {
  type: "BOT_RUN";
  status?: "RUNNING" | "SUCCESS" | "PARTIAL" | "FAILED";
  source?: "MANUAL" | "SCHEDULED";
  productsChecked?: number;
  pricesDecreased?: number;
  pricesIncreased?: number;
  pricesSetToUpperLimit?: number;
  productsSkipped?: number;
  errorsCount?: number;
  startedAt?: string;
}

export interface PriceChangeHistoryEvent extends SettingsHistoryEventBase {
  type: "PRICE_CHANGE";
  direction?: PriceChangeDirection;
  oldPrice?: string;
  newPrice?: string;
  product?: PriceChangeProduct;
  productName?: string;
  productExternalId?: string;
}

export interface SettingsOperationHistoryEvent extends SettingsHistoryEventBase {
  type: "SETTINGS_OPERATION";
  operation?: SettingsOperationType;
  operationType?: SettingsOperationType;
  affectedCount?: number;
  matchedCount?: number;
  skippedCount?: number;
}

export type SettingsHistoryEvent =
  | BotRunHistoryEvent
  | PriceChangeHistoryEvent
  | SettingsOperationHistoryEvent;

export interface SettingsHistoryResponse {
  data: SettingsHistoryEvent[];
  pagination: Pagination;
  summary: SettingsHistorySummary;
}

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}
