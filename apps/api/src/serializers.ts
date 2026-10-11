import type {
  BotRun,
  BotSettings,
  CatalogProduct,
  CompetitorOffer,
  Order,
  OrderItem,
  OrderStatusHistory,
  PriceChange,
  Prisma,
  Product,
  Store
} from "@prisma/client";

function serializeMoney(value: Prisma.Decimal | null): string | null {
  return value === null ? null : value.toFixed(2);
}

function serializeDate(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

export function serializeStore(store: Store) {
  return {
    ...store,
    createdAt: serializeDate(store.createdAt),
    updatedAt: serializeDate(store.updatedAt)
  };
}

export function serializeProduct(product: Product) {
  return {
    ...product,
    previousPrice: serializeMoney(product.previousPrice),
    currentPrice: serializeMoney(product.currentPrice),
    marketplacePrice: serializeMoney(product.marketplacePrice),
    competitorLowestPrice: serializeMoney(product.competitorLowestPrice),
    minimumPrice: serializeMoney(product.minimumPrice),
    maximumPrice: serializeMoney(product.maximumPrice),
    sourceUpdatedAt: serializeDate(product.sourceUpdatedAt),
    createdAt: serializeDate(product.createdAt),
    updatedAt: serializeDate(product.updatedAt)
  };
}

export function serializeCatalogProduct(product: CatalogProduct) {
  return {
    ...product,
    defaultPrice: product.defaultPrice.toFixed(2),
    createdAt: serializeDate(product.createdAt),
    updatedAt: serializeDate(product.updatedAt)
  };
}

export function serializeCompetitorOffer(offer: CompetitorOffer) {
  return {
    ...offer,
    price: serializeMoney(offer.price),
    observedAt: serializeDate(offer.observedAt)
  };
}

export function serializeOrder(order: Order) {
  return {
    ...order,
    totalAmount: order.totalAmount.toFixed(2),
    orderedAt: serializeDate(order.orderedAt),
    loadedAt: serializeDate(order.loadedAt),
    createdAt: serializeDate(order.createdAt),
    updatedAt: serializeDate(order.updatedAt)
  };
}

export function serializeOrderItem(item: OrderItem) {
  return {
    ...item,
    unitPrice: item.unitPrice.toFixed(2)
  };
}

export function serializeOrderStatusHistory(entry: OrderStatusHistory) {
  return {
    ...entry,
    occurredAt: serializeDate(entry.occurredAt)
  };
}

export function serializePriceChange(change: PriceChange) {
  return {
    ...change,
    oldPrice: serializeMoney(change.oldPrice),
    newPrice: serializeMoney(change.newPrice),
    competitorPrice: serializeMoney(change.competitorPrice),
    minimumPrice: serializeMoney(change.minimumPrice),
    maximumPrice: serializeMoney(change.maximumPrice),
    createdAt: serializeDate(change.createdAt)
  };
}

export function serializeBotRun(run: BotRun) {
  return {
    ...run,
    startedAt: serializeDate(run.startedAt),
    finishedAt: serializeDate(run.finishedAt)
  };
}

export function serializeBotSettings(settings: BotSettings) {
  return {
    ...settings,
    undercutAmount: serializeMoney(settings.undercutAmount),
    createdAt: serializeDate(settings.createdAt),
    updatedAt: serializeDate(settings.updatedAt)
  };
}
