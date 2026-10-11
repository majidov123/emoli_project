import ExcelJS from "exceljs";
import type { Product, ProductExportScope, ProductStatus } from "../types";

export type { ProductExportScope } from "../types";

export interface LimitImportRow {
  rowNumber: number;
  externalId: string;
  minimumPrice?: string;
  maximumPrice?: string;
}

export interface LimitImportError {
  rowNumber: number;
  field: "file" | "externalId" | "minimumPrice" | "maximumPrice" | "row";
  message: string;
}

export interface ParsedLimitWorkbook {
  rows: LimitImportRow[];
  errors: LimitImportError[];
}

const MONEY_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const EXPECTED_HEADERS = ["Məhsul kodu", "Alt limit", "Üst limit"] as const;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function moneyCellValue(
  value: ExcelJS.CellValue,
  rowNumber: number,
  field: "minimumPrice" | "maximumPrice",
  errors: LimitImportError[]
) {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value !== "string") {
    errors.push({
      rowNumber,
      field,
      message: "Məbləğ mətn formatında, nöqtə ilə və ən çox iki onluq rəqəmlə yazılmalıdır."
    });
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) return undefined;
  if (!MONEY_PATTERN.test(normalized)) {
    errors.push({
      rowNumber,
      field,
      message: "Məbləğ mənfi olmamalı, vergül/eksponent daşımamalı və ən çox iki onluq rəqəmli olmalıdır."
    });
    return undefined;
  }

  return normalized;
}

function cellText(cell: ExcelJS.Cell) {
  return typeof cell.value === "string" ? cell.value.trim() : "";
}

function exactCents(value: string | null) {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export function exceedsCompetitorByMoreThanTwentyPercent(
  currentPrice: string | null,
  competitorPrice: string | null
) {
  const current = exactCents(currentPrice);
  const competitor = exactCents(competitorPrice);
  if (current === null || competitor === null || competitor === 0n || current <= competitor) {
    return false;
  }
  return (current - competitor) * 5n > competitor;
}

export function productMatchesExportScope(product: Product, scope: ProductExportScope) {
  if (scope === "ALL") return true;
  if (scope === "NOT_ACTIVE") return product.normalizedStatus !== "ACTIVE";
  return product.normalizedStatus === (scope as ProductStatus);
}

function makeDownload(buffer: ExcelJS.Buffer, filename: string) {
  const bytes = new Uint8Array(buffer as ArrayBuffer);
  const url = URL.createObjectURL(new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function buildProductsWorkbook(products: Product[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Birmarket local price management";
  workbook.created = new Date(0);
  workbook.modified = new Date(0);

  const sheet = workbook.addWorksheet("Məhsullar", {
    views: [{ state: "frozen", ySplit: 1 }]
  });
  sheet.columns = [
    { header: "Məhsul kodu", key: "externalId", width: 22 },
    { header: "SKU", key: "sku", width: 20 },
    { header: "Məhsulun adı", key: "name", width: 38 },
    { header: "Kateqoriya", key: "category", width: 24 },
    { header: "Miqdar", key: "stock", width: 11 },
    { header: "Endirimli qiymət", key: "currentPrice", width: 18 },
    { header: "Marketplace qiyməti", key: "marketplacePrice", width: 20 },
    { header: "Ən ucuz rəqib qiyməti", key: "competitorLowestPrice", width: 23 },
    { header: "Alt limit", key: "minimumPrice", width: 15 },
    { header: "Üst limit", key: "maximumPrice", width: 15 },
    { header: "Status", key: "normalizedStatus", width: 25 },
    { header: "Bot aktivdir", key: "botEnabled", width: 15 }
  ];

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF273263" } };
  header.alignment = { vertical: "middle" };
  header.height = 24;

  for (const product of products) {
    const row = sheet.addRow({
      externalId: product.externalId,
      sku: product.sku ?? "",
      name: product.name,
      category: product.category ?? "",
      stock: product.stock,
      currentPrice: product.currentPrice ?? "",
      marketplacePrice: product.marketplacePrice ?? "",
      competitorLowestPrice: product.competitorLowestPrice ?? "",
      minimumPrice: product.minimumPrice ?? "",
      maximumPrice: product.maximumPrice ?? "",
      normalizedStatus: product.normalizedStatus,
      botEnabled: product.botEnabled ? "Aktiv" : "Deaktiv"
    });

    for (const index of [1, 2, 6, 7, 8, 9, 10]) {
      row.getCell(index).numFmt = "@";
    }
    row.alignment = { vertical: "top", wrapText: true };

    if (exceedsCompetitorByMoreThanTwentyPercent(
      product.currentPrice,
      product.competitorLowestPrice
    )) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } };
        cell.font = { color: { argb: "FF9C0006" } };
      });
    }
  }

  sheet.autoFilter = { from: "A1", to: "L1" };
  return workbook.xlsx.writeBuffer();
}

export async function downloadProductsWorkbook(products: Product[]) {
  const buffer = await buildProductsWorkbook(products);
  makeDownload(buffer, "birmarket-local-products.xlsx");
}

export async function buildLimitsSampleWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Birmarket local price management";
  workbook.created = new Date(0);
  workbook.modified = new Date(0);
  const sheet = workbook.addWorksheet("Limitlər", {
    views: [{ state: "frozen", ySplit: 1 }]
  });
  sheet.columns = [
    { header: EXPECTED_HEADERS[0], key: "externalId", width: 28 },
    { header: EXPECTED_HEADERS[1], key: "minimumPrice", width: 18 },
    { header: EXPECTED_HEADERS[2], key: "maximumPrice", width: 18 }
  ];
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF273263" }
  };
  sheet.getColumn(1).numFmt = "@";
  sheet.getColumn(2).numFmt = "@";
  sheet.getColumn(3).numFmt = "@";

  const notes = workbook.addWorksheet("Təlimat");
  notes.getColumn(1).width = 100;
  notes.addRows([
    ["Birinci sətirdə başlıqlar dəyişdirilməməlidir."],
    ["A sütunu: Məhsul kodu. B sütunu: Alt limit. C sütunu: Üst limit."],
    ["Boş limit xanası mövcud limiti qoruyur."],
    ["Məbləğləri mətn kimi, nöqtə ilə və ən çox iki onluq rəqəmlə daxil edin (məsələn 19.98)."]
  ]);
  notes.getColumn(1).numFmt = "@";
  return workbook.xlsx.writeBuffer();
}

export async function downloadLimitsSampleWorkbook() {
  const buffer = await buildLimitsSampleWorkbook();
  makeDownload(buffer, "birmarket-limit-numunesi.xlsx");
}

export async function parseLimitsWorkbook(file: File): Promise<ParsedLimitWorkbook> {
  const errors: LimitImportError[] = [];
  if (!file.name.toLocaleLowerCase("az").endsWith(".xlsx")) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, field: "file", message: "Yalnız .xlsx faylı seçilə bilər." }]
    };
  }
  if (file.size > 5 * 1024 * 1024) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, field: "file", message: "Excel faylı 5 MB-dan böyük ola bilməz." }]
    };
  }

  const workbook = new ExcelJS.Workbook();
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
  } catch {
    return {
      rows: [],
      errors: [{ rowNumber: 0, field: "file", message: "Excel faylını oxumaq mümkün olmadı." }]
    };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, field: "file", message: "Excel faylında iş vərəqi tapılmadı." }]
    };
  }

  EXPECTED_HEADERS.forEach((expected, index) => {
    if (cellText(sheet.getRow(1).getCell(index + 1)) !== expected) {
      errors.push({
        rowNumber: 1,
        field: "file",
        message: `${index + 1}-ci sütunun başlığı “${expected}” olmalıdır.`
      });
    }
  });
  if (errors.length > 0) return { rows: [], errors };

  const rows: LimitImportRow[] = [];
  const seenCodes = new Map<string, number>();
  const maxRow = Math.min(sheet.actualRowCount, 2001);
  if (sheet.actualRowCount > 2001) {
    errors.push({
      rowNumber: 0,
      field: "file",
      message: "Bir faylda ən çox 2000 məhsul sətri ola bilər."
    });
  }

  for (let rowNumber = 2; rowNumber <= maxRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const rawCode = row.getCell(1).value;
    const rawMinimum = row.getCell(2).value;
    const rawMaximum = row.getCell(3).value;
    const completelyBlank = [rawCode, rawMinimum, rawMaximum]
      .every((value) => value === null || value === undefined || value === "");
    if (completelyBlank) continue;

    const rowErrorStart = errors.length;
    if (typeof rawCode !== "string" || !rawCode.trim()) {
      errors.push({
        rowNumber,
        field: "externalId",
        message: "Məhsul kodu boş ola bilməz və mətn formatında olmalıdır."
      });
    }
    const externalId = normalizeText(rawCode);
    if (externalId.length > 100) {
      errors.push({ rowNumber, field: "externalId", message: "Məhsul kodu 100 simvoldan uzun ola bilməz." });
    }

    const minimumPrice = moneyCellValue(rawMinimum, rowNumber, "minimumPrice", errors);
    const maximumPrice = moneyCellValue(rawMaximum, rowNumber, "maximumPrice", errors);
    if (minimumPrice === undefined && maximumPrice === undefined) {
      errors.push({ rowNumber, field: "row", message: "Ən azı bir limit daxil edilməlidir." });
    }

    const codeKey = externalId.toLocaleUpperCase("az");
    const earlierRow = seenCodes.get(codeKey);
    if (externalId && earlierRow !== undefined) {
      errors.push({
        rowNumber,
        field: "externalId",
        message: `Məhsul kodu faylda təkrarlanır (ilk sətir: ${earlierRow}).`
      });
    } else if (externalId) {
      seenCodes.set(codeKey, rowNumber);
    }

    if (errors.length === rowErrorStart) {
      rows.push({ rowNumber, externalId, minimumPrice, maximumPrice });
    }
  }

  return { rows, errors };
}
