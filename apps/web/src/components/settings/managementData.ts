import type { LocalOrder, SettingsManagementSummary } from "../../types";
import { DELIVERED_ORDER_STATUSES, centsToDecimalString, decimalStringToCents } from "./orderStatus";

export const PICKUP_POINT_TYPES = ["Mağaza", "Anbar", "Ticarət mərkəzi"] as const;
export type PickupPointType = (typeof PICKUP_POINT_TYPES)[number];

export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  type: PickupPointType;
  createdAt: string;
}

export interface AnalyticsPeriod {
  from: string;
  to: string;
}

export interface AnalyticsMetrics {
  turnover: string;
  orderCount: number;
  salesCount: number;
  deliveryRate: number | null;
  averageReceipt: string | null;
  rating: null;
  productCount: number | null;
  activeProductCount: number | null;
}

function isPickupPointType(value: unknown): value is PickupPointType {
  return typeof value === "string" && PICKUP_POINT_TYPES.includes(value as PickupPointType);
}

export function parsePickupPoints(value: string | null): PickupPoint[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PickupPoint => {
      if (!item || typeof item !== "object") return false;
      const point = item as Partial<PickupPoint>;
      return typeof point.id === "string"
        && typeof point.name === "string"
        && typeof point.address === "string"
        && typeof point.createdAt === "string"
        && isPickupPointType(point.type);
    });
  } catch {
    return [];
  }
}

export function pickupStorageKey(storeId: string | undefined) {
  return `emoli:pickup-points:${storeId || "local-store"}`;
}

export function currentMonthPeriod(now = new Date()): AnalyticsPeriod {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const finalDay = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, "0");
  return { from: `${year}-${month}-01`, to: `${year}-${month}-${finalDay}` };
}

export function ordersInPeriod(orders: readonly LocalOrder[], period: AnalyticsPeriod) {
  return orders.filter((order) => {
    const day = order.orderedAt.slice(0, 10);
    return day >= period.from && day <= period.to;
  });
}

export function calculateAnalyticsMetrics(
  orders: readonly LocalOrder[],
  summary: SettingsManagementSummary | null
): AnalyticsMetrics {
  let totalCents = 0n;
  for (const order of orders) {
    const cents = decimalStringToCents(order.totalAmount);
    if (cents !== null) totalCents += cents;
  }
  const salesCount = orders.filter((order) => DELIVERED_ORDER_STATUSES.includes(order.currentStatus)).length;
  return {
    turnover: centsToDecimalString(totalCents),
    orderCount: orders.length,
    salesCount,
    deliveryRate: orders.length > 0 ? (salesCount / orders.length) * 100 : null,
    averageReceipt: orders.length > 0 ? centsToDecimalString(totalCents / BigInt(orders.length)) : null,
    rating: null,
    productCount: summary?.totalProducts ?? null,
    activeProductCount: summary?.activeProducts ?? null
  };
}

export interface TopProductMetric {
  name: string;
  amount: string;
  quantity: number;
}

export function calculateTopProducts(orders: readonly LocalOrder[]): TopProductMetric[] {
  const products = new Map<string, { amount: bigint; quantity: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const unitCents = decimalStringToCents(item.unitPrice);
      if (unitCents === null) continue;
      const current = products.get(item.productName) ?? { amount: 0n, quantity: 0 };
      current.amount += unitCents * BigInt(item.quantity);
      current.quantity += item.quantity;
      products.set(item.productName, current);
    }
  }
  return [...products.entries()]
    .map(([name, value]) => ({ name, amount: centsToDecimalString(value.amount), quantity: value.quantity }))
    .sort((left, right) => {
      const leftAmount = decimalStringToCents(left.amount) ?? 0n;
      const rightAmount = decimalStringToCents(right.amount) ?? 0n;
      return leftAmount === rightAmount ? right.quantity - left.quantity : leftAmount > rightAmount ? -1 : 1;
    })
    .slice(0, 20);
}

export const ANALYTICS_TOOLTIPS = {
  turnover: "Müştərilərin sifariş etdiyi məhsulların ümumi dəyəri (GMV). Ödənilib-ödənilməməsindən asılı olmayaraq bütün sifarişlərin cəmidir.",
  orders: "Seçilmiş dövrdə gələn sifarişlərin sayı. Hər sifariş bir müştərinin alış-veriş səbətidir.",
  sales: "Həqiqətən çatdırılıb tamamlanan sifarişlər. Bu rəqəm sifarişlər sayından az olar — ləğv edilənlər, qaytarılanlar çıxılır.",
  deliveryRate: "ODR (Order Delivery Rate) — neçə faiz sifariş uğurla çatdırıldı. Birmarket bu göstəriciyə əsasən reytinq verir. 90%+ ideal hesab olunur.",
  averageReceipt: "Bir sifarişin ortalama dəyəri. Bu rəqəmi artırmaq üçün daha baha və ya komplekt məhsullar əlavə edə bilərsiniz.",
  rating: "Birmarket-dəki satıcı reytinqin. Aşağı düşdükdə axtarış nəticələrindəki görünürlüğün azalır. 99%+ saxlamağa çalış.",
  products: "Platforma üzrə ümumi məhsul offer sayın (aktiv + deaktiv). Nə qədər çox məhsul, bir o qədər çox satış imkanı.",
  activeProducts: "Hal-hazırda aktiv vəziyyətdə olan məhsulların sayı. Bunlar müştəriyə görünən məhsullardır."
} as const;
