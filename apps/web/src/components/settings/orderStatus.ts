import type { OrderStatus } from "../../types";

export type OrderDialogStatusOption = "ALL" | OrderStatus;
export type OrderStatusTone = "neutral" | "new" | "info" | "success" | "warning" | "danger";

export interface OrderStatusOption {
  value: OrderStatus;
  label: string;
}

export const ORDER_STATUS_VALUES = [
  "BUYER_NOT_HOME", "RETURNED", "PACKAGING", "NEW", "CLARIFYING_WITH_CUSTOMER",
  "CUSTOMER_CONFIRMED", "READY_FOR_DELIVERY", "ACCEPTED_FOR_DELIVERY",
  "REJECTED_FOR_DELIVERY", "ON_WAY_TO_DISTRIBUTION_CENTER", "AT_DISTRIBUTION_CENTER",
  "DELIVERY_SCHEDULED", "WITH_COURIER", "ON_WAY_TO_PUDO", "AT_PUDO", "DELIVERED",
  "PARTIALLY_DELIVERED", "CUSTOMER_REFUSED", "LOGISTICS_CANCELLED", "COMPLETED",
  "CUSTOMER_CANCELLED", "MARKET_CANCELLED", "REDIRECTED", "STORAGE_AT_DC_PARTNER",
  "ON_THE_WAY_TO_DC_PARTNER", "ON_WAY_TO_INTERMEDIATE_CENTER", "AT_INTERMEDIATE_CENTER",
  "CONFIRMED_FOR_PICKING", "PICKING", "PICKING_COMPLETED", "PACKED", "OFFLINE_CREDIT"
] as const satisfies readonly OrderStatus[];

const STATUS_LABELS: Record<OrderStatus, string> = {
  BUYER_NOT_HOME: "Alıcı evdə olmayıb",
  RETURNED: "Geri qaytarma",
  PACKAGING: "Qablaşdırmada",
  NEW: "Yeni",
  CLARIFYING_WITH_CUSTOMER: "Müştəri ilə dəqiqləşdirilir",
  CUSTOMER_CONFIRMED: "Müştəridən təsdiq alındı",
  READY_FOR_DELIVERY: "Təslimə hazırdır",
  ACCEPTED_FOR_DELIVERY: "Çatdırılma üçün qəbul edildi",
  REJECTED_FOR_DELIVERY: "Çatdırılma üçün qəbul edilmədi",
  ON_WAY_TO_DISTRIBUTION_CENTER: "Bölüşdürmə mərkəzinə yoldadır",
  AT_DISTRIBUTION_CENTER: "Bölüşdürmə mərkəzindədir",
  DELIVERY_SCHEDULED: "Çatdırılma planlaşdırılıb",
  WITH_COURIER: "Kuryerdədir",
  ON_WAY_TO_PUDO: "PUDO-ya yoldadır",
  AT_PUDO: "PUDO-dadır",
  DELIVERED: "Çatdırıldı",
  PARTIALLY_DELIVERED: "Qismən çatdırıldı",
  CUSTOMER_REFUSED: "Müştəri imtina etdi",
  LOGISTICS_CANCELLED: "Logistika ləğv etdi",
  COMPLETED: "Tamamlandı",
  CUSTOMER_CANCELLED: "Müştəri ləğv etdi",
  MARKET_CANCELLED: "Market ləğv etdi",
  REDIRECTED: "Yenidən yönləndirilib",
  STORAGE_AT_DC_PARTNER: "STORAGE_AT_DC_PARTNER",
  ON_THE_WAY_TO_DC_PARTNER: "ON_THE_WAY_TO_DC_PARTNER",
  ON_WAY_TO_INTERMEDIATE_CENTER: "Aralıq mərkəzə yoldadır",
  AT_INTERMEDIATE_CENTER: "Aralıq mərkəzdədir",
  CONFIRMED_FOR_PICKING: "Yığılma üçün təsdiqlənib",
  PICKING: "Yığılmada",
  PICKING_COMPLETED: "Yığılma tamamlandı",
  PACKED: "Paketləndi",
  OFFLINE_CREDIT: "OFFLINE_CREDIT"
};

export const ORDER_STATUS_OPTIONS: readonly OrderStatusOption[] = ORDER_STATUS_VALUES.map((value) => ({
  value,
  label: STATUS_LABELS[value]
}));

export const NEW_ORDER_STATUSES: readonly OrderStatus[] = [
  "NEW",
  "CLARIFYING_WITH_CUSTOMER",
  "CUSTOMER_CONFIRMED"
];

export const DELIVERED_ORDER_STATUSES: readonly OrderStatus[] = [
  "DELIVERED",
  "PARTIALLY_DELIVERED",
  "COMPLETED"
];

export const IN_DELIVERY_ORDER_STATUSES: readonly OrderStatus[] = [
  "BUYER_NOT_HOME",
  "WITH_COURIER",
  "ON_WAY_TO_PUDO",
  "AT_PUDO",
  "ON_WAY_TO_DISTRIBUTION_CENTER",
  "AT_DISTRIBUTION_CENTER",
  "ON_WAY_TO_INTERMEDIATE_CENTER",
  "AT_INTERMEDIATE_CENTER",
  "READY_FOR_DELIVERY",
  "PACKAGING",
  "PICKING",
  "CONFIRMED_FOR_PICKING",
  "PICKING_COMPLETED"
];

export const CANCELLED_ORDER_STATUSES: readonly OrderStatus[] = [
  "RETURNED",
  "CUSTOMER_REFUSED",
  "CUSTOMER_CANCELLED",
  "LOGISTICS_CANCELLED",
  "MARKET_CANCELLED"
];

export const LOST_ORDER_STATUSES: readonly OrderStatus[] = [
  "BUYER_NOT_HOME",
  "REJECTED_FOR_DELIVERY",
  "REDIRECTED"
];

export const SUCCESSFUL_ORDER_STATUSES = DELIVERED_ORDER_STATUSES;

export const ORDER_STATUS_GROUPS = {
  NEW: NEW_ORDER_STATUSES,
  DELIVERED: DELIVERED_ORDER_STATUSES,
  IN_DELIVERY: IN_DELIVERY_ORDER_STATUSES,
  CANCELLED: CANCELLED_ORDER_STATUSES
} as const;

export const ORDER_QUICK_FILTERS = [
  { id: "LOST", label: "İtmiş sifarişlər", statuses: LOST_ORDER_STATUSES },
  { id: "SUCCESSFUL", label: "Uğurlu sifarişlər", statuses: SUCCESSFUL_ORDER_STATUSES },
  { id: "CANCELLED", label: "Ləğv edilən sifarişlər", statuses: CANCELLED_ORDER_STATUSES }
] as const;

export function orderStatusLabel(status: OrderStatus) {
  return STATUS_LABELS[status];
}

export function formatOrderId(value: string) {
  return value.startsWith("#") ? value : `#${value}`;
}

export function orderStatusTone(status: OrderStatus): OrderStatusTone {
  if (CANCELLED_ORDER_STATUSES.includes(status)) return "danger";
  if (DELIVERED_ORDER_STATUSES.includes(status)) return "success";
  if (LOST_ORDER_STATUSES.includes(status)) return "warning";
  if (NEW_ORDER_STATUSES.includes(status)) return "new";
  if (IN_DELIVERY_ORDER_STATUSES.includes(status)) return "info";
  return "neutral";
}

const DECIMAL_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

export function decimalStringToCents(value: string): bigint | null {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) return null;
  const [, sign, whole, fraction = ""] = match;
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return sign === "-" ? -cents : cents;
}

export function centsToDecimalString(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fraction}`;
}

export function sumDecimalStrings(values: readonly string[]): string | null {
  let total = 0n;
  for (const value of values) {
    const cents = decimalStringToCents(value);
    if (cents === null) return null;
    total += cents;
  }
  return centsToDecimalString(total);
}

export function multiplyDecimalString(value: string, quantity: number): string | null {
  const cents = decimalStringToCents(value);
  if (cents === null || !Number.isSafeInteger(quantity)) return null;
  return centsToDecimalString(cents * BigInt(quantity));
}

export function formatAznDecimal(value: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const cents = decimalStringToCents(value);
  if (cents === null) return `${value} ₼`;
  const canonical = centsToDecimalString(cents);
  const [whole, fraction] = canonical.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped},${fraction} ₼`;
}
