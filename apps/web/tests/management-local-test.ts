import assert from "node:assert/strict";
import type { LocalOrder, SettingsManagementSummary } from "../src/types";
import {
  ANALYTICS_TOOLTIPS,
  SETTLEMENT_TOOLTIPS,
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
const legacyPoint = parsePickupPoints(JSON.stringify([{ id: "p1", name: "Anbar", address: "Lokal ünvan", type: "Anbar", createdAt: "2026-10-11T00:00:00.000Z" }]));
assert.equal(legacyPoint.length, 1);
assert.equal(legacyPoint[0]?.note, "");
const pointWithNote = parsePickupPoints(JSON.stringify([{ id: "p2", name: "Mağaza", address: "Lokal ünvan", type: "Mağaza", note: "Arxa girişdən yaxınlaşın", createdAt: "2026-10-11T00:00:00.000Z" }]));
assert.equal(pointWithNote[0]?.note, "Arxa girişdən yaxınlaşın");
assert.equal(Object.keys(ANALYTICS_TOOLTIPS).length, 8);
assert.equal(ANALYTICS_TOOLTIPS.turnover, "Müştərilərin sifariş etdiyi məhsulların ümumi dəyəri (GMV). Ödənilib-ödənilməməsindən asılı olmayaraq bütün sifarişlərin cəmidir.");
assert.equal(Object.keys(SETTLEMENT_TOOLTIPS).length, 12);
assert.deepEqual(SETTLEMENT_TOOLTIPS, {
  orderAmount: "Müştərilərin sifariş verdiyi ümumi məbləğ (yaranma tarixinə görə). Hələ çatdırılmamış sifarişlər də daxildir.",
  deliveredAmount: "Faktiki çatdırılıb tamamlanan sifarişlərin ümumi dəyəri. Sənin hesabına köçürüləcək məbləğin əsasıdır.",
  deliveryPercentage: "Sifariş məbləğinin neçə faizi çatdırıldı. Bu göstərici nə qədər yüksəkdirsə, bir o qədər yaxşıdır.",
  sales: "Hesablaşma dövrü üzrə faktiki satış məbləği. Bank komissiyası hələ çıxılmayıb.",
  bankCommission: "Bank kartı ilə edilən ödənişlər üçün bankın tutduğu faiz. Adətən 1-3% arasında olur.",
  commissionPercentage: "Bank komissiyasının satışlara nisbəti. Bu faiz nə qədər aşağı olsa bir o qədər yaxşıdır.",
  umicoTr: "TR (Take Rate) — Birmarket platformasının öz komissiyası. Kateqoriyaya görə dəyişir (adətən 5-15%).",
  trWithVat: "Umico TR komissiyasına ƏDV (18%) əlavə edilmiş məbləğ.",
  trPercentage: "Platform komissiyasının satışlara nisbəti (faizlə).",
  installmentCommission: "Taksitli (hissə-hissə ödəniş) sifarişlər üçün əlavə komissiya. Müştəri taksit seçirsə bu məbləğ tutulur.",
  netIncome: "Bütün komissiyalar (bank, platform, taksit) çıxıldıqdan sonra sənin hesabına gələcək xalis məbləğ.",
  incomePercentage: "Xalis gəlirin satışlara nisbəti. Məsələn 80% o deməkdir ki, hər 100 ₼ satışdan 80 ₼ sənin olur."
});

console.log("Management local tests passed");
