import assert from "node:assert/strict";
import type { LocalOrder, OrderStatus } from "../src/types";
import {
  EMPTY_ORDER_FILTERS,
  firstOrderStatus,
  laterOrderStatuses,
  orderGroupCount,
  orderMatchesFilters,
  orderMatchesQuickFilter
} from "../src/components/settings/orderFilters";
import {
  CANCELLED_ORDER_STATUSES,
  DELIVERED_ORDER_STATUSES,
  IN_DELIVERY_ORDER_STATUSES,
  LOST_ORDER_STATUSES,
  NEW_ORDER_STATUSES,
  ORDER_STATUS_OPTIONS,
  ORDER_STATUS_VALUES,
  centsToDecimalString,
  decimalStringToCents,
  formatAznDecimal,
  formatOrderId,
  multiplyDecimalString,
  orderStatusLabel,
  orderStatusTone,
  sumDecimalStrings
} from "../src/components/settings/orderStatus";

const expectedStatusOptions: ReadonlyArray<readonly [OrderStatus, string]> = [
  ["BUYER_NOT_HOME", "Alıcı evdə olmayıb"],
  ["RETURNED", "Geri qaytarma"],
  ["PACKAGING", "Qablaşdırmada"],
  ["NEW", "Yeni"],
  ["CLARIFYING_WITH_CUSTOMER", "Müştəri ilə dəqiqləşdirilir"],
  ["CUSTOMER_CONFIRMED", "Müştəridən təsdiq alındı"],
  ["READY_FOR_DELIVERY", "Təslimə hazırdır"],
  ["ACCEPTED_FOR_DELIVERY", "Çatdırılma üçün qəbul edildi"],
  ["REJECTED_FOR_DELIVERY", "Çatdırılma üçün qəbul edilmədi"],
  ["ON_WAY_TO_DISTRIBUTION_CENTER", "Bölüşdürmə mərkəzinə yoldadır"],
  ["AT_DISTRIBUTION_CENTER", "Bölüşdürmə mərkəzindədir"],
  ["DELIVERY_SCHEDULED", "Çatdırılma planlaşdırılıb"],
  ["WITH_COURIER", "Kuryerdədir"],
  ["ON_WAY_TO_PUDO", "PUDO-ya yoldadır"],
  ["AT_PUDO", "PUDO-dadır"],
  ["DELIVERED", "Çatdırıldı"],
  ["PARTIALLY_DELIVERED", "Qismən çatdırıldı"],
  ["CUSTOMER_REFUSED", "Müştəri imtina etdi"],
  ["LOGISTICS_CANCELLED", "Logistika ləğv etdi"],
  ["COMPLETED", "Tamamlandı"],
  ["CUSTOMER_CANCELLED", "Müştəri ləğv etdi"],
  ["MARKET_CANCELLED", "Market ləğv etdi"],
  ["REDIRECTED", "Yenidən yönləndirilib"],
  ["STORAGE_AT_DC_PARTNER", "STORAGE_AT_DC_PARTNER"],
  ["ON_THE_WAY_TO_DC_PARTNER", "ON_THE_WAY_TO_DC_PARTNER"],
  ["ON_WAY_TO_INTERMEDIATE_CENTER", "Aralıq mərkəzə yoldadır"],
  ["AT_INTERMEDIATE_CENTER", "Aralıq mərkəzdədir"],
  ["CONFIRMED_FOR_PICKING", "Yığılma üçün təsdiqlənib"],
  ["PICKING", "Yığılmada"],
  ["PICKING_COMPLETED", "Yığılma tamamlandı"],
  ["PACKED", "Paketləndi"],
  ["OFFLINE_CREDIT", "OFFLINE_CREDIT"]
];

assert.equal(expectedStatusOptions.length, 32);
assert.deepEqual(ORDER_STATUS_VALUES, expectedStatusOptions.map(([value]) => value));
assert.deepEqual(
  ORDER_STATUS_OPTIONS.map(({ value, label }) => [value, label]),
  expectedStatusOptions
);
for (const [value, label] of expectedStatusOptions) {
  assert.equal(orderStatusLabel(value), label);
}

assert.deepEqual(NEW_ORDER_STATUSES, [
  "NEW",
  "CLARIFYING_WITH_CUSTOMER",
  "CUSTOMER_CONFIRMED"
]);
assert.deepEqual(DELIVERED_ORDER_STATUSES, [
  "DELIVERED",
  "PARTIALLY_DELIVERED",
  "COMPLETED"
]);
assert.deepEqual(IN_DELIVERY_ORDER_STATUSES, [
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
]);
assert.deepEqual(CANCELLED_ORDER_STATUSES, [
  "RETURNED",
  "CUSTOMER_REFUSED",
  "CUSTOMER_CANCELLED",
  "LOGISTICS_CANCELLED",
  "MARKET_CANCELLED"
]);
assert.deepEqual(LOST_ORDER_STATUSES, [
  "BUYER_NOT_HOME",
  "REJECTED_FOR_DELIVERY",
  "REDIRECTED"
]);
assert.equal(orderStatusTone("NEW"), "new");
assert.equal(orderStatusTone("WITH_COURIER"), "info");
assert.equal(orderStatusTone("DELIVERED"), "success");
assert.equal(orderStatusTone("BUYER_NOT_HOME"), "warning");
assert.equal(orderStatusTone("MARKET_CANCELLED"), "danger");
assert.equal(orderStatusTone("OFFLINE_CREDIT"), "neutral");
assert.equal(formatOrderId("LOCAL-1001"), "#LOCAL-1001");
assert.equal(formatOrderId("#LOCAL-1001"), "#LOCAL-1001");

assert.equal(decimalStringToCents("0"), 0n);
assert.equal(decimalStringToCents(" 001.2 "), 120n);
assert.equal(decimalStringToCents("-0.01"), -1n);
assert.equal(decimalStringToCents("9007199254740993.99"), 900719925474099399n);
assert.equal(decimalStringToCents("1.234"), null);
assert.equal(decimalStringToCents("1e3"), null);
assert.equal(centsToDecimalString(900719925474099399n), "9007199254740993.99");
assert.equal(centsToDecimalString(-1n), "-0.01");
assert.equal(
  sumDecimalStrings(["9007199254740993.99", "0.02", "-0.01"]),
  "9007199254740994.00"
);
assert.equal(sumDecimalStrings(["1.00", "invalid"]), null);
assert.equal(multiplyDecimalString("9007199254740993.99", 3), "27021597764222981.97");
assert.equal(multiplyDecimalString("10.00", 1.5), null);
assert.equal(formatAznDecimal("9007199254740994.00"), "9 007 199 254 740 994,00 ₼");
assert.equal(formatAznDecimal("-1234.50"), "-1 234,50 ₼");

function makeOrder(
  id: string,
  currentStatus: OrderStatus,
  orderedAt: string,
  history: Array<{ status: OrderStatus; occurredAt: string }> = []
): LocalOrder {
  return {
    id,
    externalId: `LOCAL-${id}`,
    customerName: `Müştəri ${id}`,
    totalAmount: "10.00",
    orderedAt,
    currentStatus,
    loadedAt: "2026-10-01T12:00:00.000Z",
    items: [],
    statusHistory: history.map((entry, index) => ({
      id: `${id}-history-${index}`,
      ...entry
    }))
  };
}

const deliveredOrder = makeOrder("delivered", "DELIVERED", "2026-09-20T22:15:00.000Z", [
  { status: "DELIVERED", occurredAt: "2026-09-21T12:00:00.000Z" },
  { status: "PACKAGING", occurredAt: "2026-09-20T09:00:00.000Z" },
  { status: "NEW", occurredAt: "2026-09-19T08:00:00.000Z" }
]);
const cancelledOrder = makeOrder("cancelled", "MARKET_CANCELLED", "2026-09-21T08:00:00.000Z", [
  { status: "NEW", occurredAt: "2026-09-20T08:00:00.000Z" },
  { status: "MARKET_CANCELLED", occurredAt: "2026-09-21T08:30:00.000Z" }
]);
const lostOrder = makeOrder("lost", "REDIRECTED", "2026-09-22T08:00:00.000Z");

assert.equal(firstOrderStatus(deliveredOrder), "NEW");
assert.deepEqual(laterOrderStatuses(deliveredOrder), ["PACKAGING", "DELIVERED"]);
assert.equal(firstOrderStatus(lostOrder), "REDIRECTED");
assert.deepEqual(laterOrderStatuses(lostOrder), []);
assert.equal(orderMatchesFilters(deliveredOrder, EMPTY_ORDER_FILTERS, null), true);
assert.equal(orderMatchesFilters(deliveredOrder, {
  initialStatus: "NEW",
  nextStatus: "PACKAGING",
  dateFrom: "2026-09-20",
  dateTo: "2026-09-20"
}, null), true);
assert.equal(orderMatchesFilters(deliveredOrder, {
  ...EMPTY_ORDER_FILTERS,
  nextStatus: "RETURNED"
}, null), false);
assert.equal(orderMatchesFilters(deliveredOrder, {
  ...EMPTY_ORDER_FILTERS,
  dateFrom: "2026-09-21"
}, null), false);
assert.equal(orderMatchesFilters(deliveredOrder, {
  ...EMPTY_ORDER_FILTERS,
  dateTo: "2026-09-19"
}, null), false);
assert.equal(orderMatchesQuickFilter(deliveredOrder, "success"), true);
assert.equal(orderMatchesQuickFilter(deliveredOrder, "cancelled"), false);
assert.equal(orderMatchesQuickFilter(cancelledOrder, "cancelled"), true);
assert.equal(orderMatchesQuickFilter(lostOrder, "lost"), true);
assert.equal(
  orderGroupCount([deliveredOrder, cancelledOrder, lostOrder], DELIVERED_ORDER_STATUSES),
  1
);
assert.equal(
  orderGroupCount([deliveredOrder, cancelledOrder, lostOrder], CANCELLED_ORDER_STATUSES),
  1
);

console.log(
  "Orders dashboard test passed: exact 32-status contract, modal groups, decimal-safe money, and composed local filters verified."
);
