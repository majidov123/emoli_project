import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  buildProductsWorkbook,
  exceedsCompetitorByMoreThanTwentyPercent,
  parseLimitsWorkbook,
  productMatchesExportScope
} from "../src/lib/productExcel";
import type { Product } from "../src/types";

const product: Product = {
  id: "test-product",
  storeId: "test-store",
  externalId: "TEST-001",
  sku: "SAFE-SKU",
  name: "Fictional Excel Product",
  imageUrl: null,
  category: "Test",
  brand: null,
  stock: 4,
  previousPrice: "20.00",
  currentPrice: "24.01",
  marketplacePrice: "24.01",
  competitorLowestPrice: "20.00",
  minimumPrice: "18.00",
  maximumPrice: "30.00",
  botEnabled: false,
  normalizedStatus: "ACTIVE",
  externalStatus: null,
  sourceUpdatedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  store: {
    id: "test-store",
    name: "Fictional Store",
    platform: "LOCAL",
    externalId: null,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
};

assert.equal(exceedsCompetitorByMoreThanTwentyPercent("24.00", "20.00"), false);
assert.equal(exceedsCompetitorByMoreThanTwentyPercent("24.01", "20.00"), true);
assert.equal(exceedsCompetitorByMoreThanTwentyPercent("0.30", "0.25"), false);
assert.equal(exceedsCompetitorByMoreThanTwentyPercent("0.31", "0.25"), true);
assert.equal(exceedsCompetitorByMoreThanTwentyPercent("20.00", "0.00"), false);
assert.equal(exceedsCompetitorByMoreThanTwentyPercent(null, "20.00"), false);
assert.equal(productMatchesExportScope(product, "ACTIVE"), true);
assert.equal(productMatchesExportScope(product, "NOT_ACTIVE"), false);

const exportedBuffer = await buildProductsWorkbook([product]);
const exportedWorkbook = new ExcelJS.Workbook();
await exportedWorkbook.xlsx.load(exportedBuffer);
const exportedSheet = exportedWorkbook.getWorksheet("Məhsullar");
assert.ok(exportedSheet);
assert.equal(exportedSheet.getCell("A2").value, "TEST-001");
assert.equal(exportedSheet.getCell("F2").value, "24.01");
assert.equal(exportedSheet.getCell("F2").numFmt, "@");
assert.equal(exportedSheet.getCell("A2").fill.type, "pattern");

const importWorkbook = new ExcelJS.Workbook();
const importSheet = importWorkbook.addWorksheet("Limitlər");
importSheet.addRow(["Məhsul kodu", "Alt limit", "Üst limit"]);
importSheet.addRow(["TEST-001", "19.98", "25.00"]);
importSheet.addRow(["TEST-002", "", "30.50"]);
importSheet.addRow(["TEST-001", "18.00", ""]);
importSheet.addRow(["TEST-003", 12.4, "20.00"]);
const importBuffer = await importWorkbook.xlsx.writeBuffer();
const importFile = new File([new Uint8Array(importBuffer as ArrayBuffer)], "limits.xlsx", {
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
});
const parsed = await parseLimitsWorkbook(importFile);
assert.deepEqual(parsed.rows, [
  { rowNumber: 2, externalId: "TEST-001", minimumPrice: "19.98", maximumPrice: "25.00" },
  { rowNumber: 3, externalId: "TEST-002", minimumPrice: undefined, maximumPrice: "30.50" }
]);
assert.ok(parsed.errors.some((error) => error.rowNumber === 4 && /təkrarlanır/.test(error.message)));
assert.ok(parsed.errors.some((error) => error.rowNumber === 5 && error.field === "minimumPrice"));

const wrongExtension = await parseLimitsWorkbook(new File([], "limits.csv"));
assert.equal(wrongExtension.errors[0]?.field, "file");

console.log("Product Excel test passed: exact 20% comparison, string money export, and row validation verified.");
