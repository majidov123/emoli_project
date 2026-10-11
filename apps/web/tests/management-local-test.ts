import assert from "node:assert/strict";
import type { LocalOrder, SettingsManagementSummary } from "../src/types";
import {
  ANALYTICS_TOOLTIPS,
  calculateAnalyticsMetrics,
  calculateTopProducts,
  currentMonthPeriod,
  ordersInPeriod,
  parsePickupPoints
} from "../src/components/settings/managementData";

const order: LocalOrder = {
  id: "order-1",
  externalId: "LOCAL-1",
  customerName: "Demo müştəri",
  totalAmount: "42.50",
  orderedAt: "2026-10-05T10:00:00.000Z",
  currentStatus: "DELIVERED",
  loadedAt: "2026-10-05T10:01:00.000Z",
  items: [{ id: "item-1", productExternalId: "P-1", productName: "Demo məhsul", imageUrl: null, quantity: 2, unitPrice: "21.25" }],
  statusHistory: []
};

const summary = {
  totalProducts: 12,
  activeProducts: 7
} as SettingsManagementSummary;

assert.deepEqual(currentMonthPeriod(new Date(2026, 9, 11)), { from: "2026-10-01", to: "2026-10-31" });
assert.equal(ordersInPeriod([order], { from: "2026-10-01", to: "2026-10-31" }).length, 1);
assert.equal(ordersInPeriod([order], { from: "2026-09-01", to: "2026-09-30" }).length, 0);

const metrics = calculateAnalyticsMetrics([order], summary);
assert.equal(metrics.turnover, "42.50");
assert.equal(metrics.orderCount, 1);
assert.equal(metrics.salesCount, 1);
assert.equal(metrics.deliveryRate, 100);
assert.equal(metrics.averageReceipt, "42.50");
assert.equal(metrics.productCount, 12);
assert.equal(metrics.activeProductCount, 7);

assert.deepEqual(calculateTopProducts([order]), [{ name: "Demo məhsul", amount: "42.50", quantity: 2 }]);
assert.equal(parsePickupPoints("not json").length, 0);
assert.equal(parsePickupPoints(JSON.stringify([{ id: "p1", name: "Anbar", address: "Lokal ünvan", type: "Anbar", createdAt: "2026-10-11T00:00:00.000Z" }])).length, 1);
assert.equal(Object.keys(ANALYTICS_TOOLTIPS).length, 8);
assert.equal(ANALYTICS_TOOLTIPS.turnover, "Müştərilərin sifariş etdiyi məhsulların ümumi dəyəri (GMV). Ödənilib-ödənilməməsindən asılı olmayaraq bütün sifarişlərin cəmidir.");

console.log("Management local tests passed");
