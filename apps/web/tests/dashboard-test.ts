import assert from "node:assert/strict";
import { createProductFilters, reloadDashboardData } from "../src/dashboardState";
import { resolveColumnPreferences } from "../src/hooks/useColumnPreferences";
import {
  CANCELLED_ORDER_STATUSES,
  DELIVERED_ORDER_STATUSES,
  IN_DELIVERY_ORDER_STATUSES,
  NEW_ORDER_STATUSES,
  ORDER_STATUS_OPTIONS,
  centsToDecimalString,
  decimalStringToCents,
  formatAznDecimal
} from "../src/components/settings/orderStatus";
import {
  BBU_COLUMNS,
  BBU_DEFAULT_VISIBLE,
  BOT_COLUMNS,
  BOT_DEFAULT_VISIBLE,
  BOT_SELECTION_COLUMN_WIDTH,
  preferredTableWidth
} from "../src/tableColumns";

const botFilters = {
  botEnabled: "enabled" as const,
  stockBucket: "LOW" as const,
  minimumPrice: "limited" as const,
  category: "Accessories"
};

const bbuQuery = createProductFilters({
  source: "bbu",
  search: "Aster",
  bbuPage: 3,
  bbuPageSize: 10,
  bbuStatus: "ACTIVE",
  botPage: 4,
  botPageSize: 20,
  botFilters
});
assert.deepEqual(bbuQuery, {
  page: 3,
  pageSize: 10,
  search: "Aster",
  status: "ACTIVE",
  category: "",
  botEnabled: "all"
});

const botQuery = createProductFilters({
  source: "bot",
  search: "Aster",
  bbuPage: 3,
  bbuPageSize: 10,
  bbuStatus: "ACTIVE",
  botPage: 4,
  botPageSize: 20,
  botFilters
});
assert.deepEqual(botQuery, {
  page: 4,
  pageSize: 20,
  search: "Aster",
  category: "Accessories",
  botEnabled: "enabled",
  stockBucket: "LOW",
  hasMinimumPrice: true
});

const refreshCalls: string[] = [];
const dashboardStateBeforeRefresh = JSON.stringify({ bbuQuery, botQuery });
await reloadDashboardData([
  async () => { refreshCalls.push("stores"); },
  async () => { refreshCalls.push("products"); },
  async () => { refreshCalls.push("categories"); }
]);
assert.deepEqual(refreshCalls, ["stores", "products", "categories"]);
assert.equal(JSON.stringify({ bbuQuery, botQuery }), dashboardStateBeforeRefresh);
await assert.rejects(
  reloadDashboardData([
    async () => undefined,
    async () => { throw new Error("refresh failed"); },
    async () => undefined
  ]),
  /refresh failed/
);

const defaultBotColumns = BOT_COLUMNS.filter((column) => BOT_DEFAULT_VISIBLE.includes(column.id));
assert.equal(defaultBotColumns.length, 11);
assert.ok(BOT_DEFAULT_VISIBLE.includes("marketplaceStatus"));
assert.ok(BOT_DEFAULT_VISIBLE.includes("botStatus"));
assert.ok(preferredTableWidth(defaultBotColumns, BOT_SELECTION_COLUMN_WIDTH) <= 1_160);

const defaultBbuColumns = BBU_COLUMNS.filter((column) => BBU_DEFAULT_VISIBLE.includes(column.id));
assert.equal(defaultBbuColumns.length, 10);
assert.ok(preferredTableWidth(defaultBbuColumns) <= 1_050);
assert.ok(preferredTableWidth(BBU_COLUMNS) > preferredTableWidth(defaultBbuColumns));

const storedOrder = [...BOT_DEFAULT_VISIBLE].reverse();
const restored = resolveColumnPreferences(
  JSON.stringify({
    version: 1,
    order: [...storedOrder, "unknown", storedOrder[0]],
    visible: ["botStatus", "marketplaceStatus"]
  }),
  BOT_COLUMNS,
  BOT_DEFAULT_VISIBLE
);
assert.deepEqual(restored.order, storedOrder);
assert.deepEqual(restored.visible, ["botStatus", "marketplaceStatus"]);
assert.deepEqual(
  resolveColumnPreferences("not-json", BOT_COLUMNS, BOT_DEFAULT_VISIBLE).visible,
  BOT_DEFAULT_VISIBLE
);

assert.deepEqual(
  ORDER_STATUS_OPTIONS.map(({ label }) => label),
  [
    "Alıcı evdə olmayıb",
    "Geri qaytarma",
    "Qablaşdırmada",
    "Yeni",
    "Müştəri ilə dəqiqləşdirilir",
    "Müştəridən təsdiq alındı",
    "Təslimə hazırdır",
    "Çatdırılma üçün qəbul edildi",
    "Çatdırılma üçün qəbul edilmədi",
    "Bölüşdürmə mərkəzinə yoldadır",
    "Bölüşdürmə mərkəzindədir",
    "Çatdırılma planlaşdırılıb",
    "Kuryerdədir",
    "PUDO-ya yoldadır",
    "PUDO-dadır",
    "Çatdırıldı",
    "Qismən çatdırıldı",
    "Müştəri imtina etdi",
    "Logistika ləğv etdi",
    "Tamamlandı",
    "Müştəri ləğv etdi",
    "Market ləğv etdi",
    "Yenidən yönləndirilib",
    "STORAGE_AT_DC_PARTNER",
    "ON_THE_WAY_TO_DC_PARTNER",
    "Aralıq mərkəzə yoldadır",
    "Aralıq mərkəzdədir",
    "Yığılma üçün təsdiqlənib",
    "Yığılmada",
    "Yığılma tamamlandı",
    "Paketləndi",
    "OFFLINE_CREDIT"
  ]
);
assert.deepEqual(NEW_ORDER_STATUSES, ["NEW", "CLARIFYING_WITH_CUSTOMER", "CUSTOMER_CONFIRMED"]);
assert.deepEqual(DELIVERED_ORDER_STATUSES, ["DELIVERED", "PARTIALLY_DELIVERED", "COMPLETED"]);
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
assert.equal(decimalStringToCents("9007199254740993.99"), 900719925474099399n);
assert.equal(centsToDecimalString(900719925474099399n), "9007199254740993.99");
assert.equal(formatAznDecimal("1234.50"), "1 234,50 ₼");

console.log(
  "Dashboard test passed: API filter state, local refresh isolation, compact default widths, column preferences, order statuses, and decimal-safe totals verified."
);
