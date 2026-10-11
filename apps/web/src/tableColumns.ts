export interface TableColumn<Id extends string> {
  id: Id;
  label: string;
  /** Preferred desktop width. Visible columns are summed to decide when scrolling is truly needed. */
  width: number;
}

export const BOT_SELECTION_COLUMN_WIDTH = 42;

export function preferredTableWidth<Id extends string>(
  columns: readonly TableColumn<Id>[],
  fixedWidth = 0
) {
  return fixedWidth + columns.reduce((total, column) => total + column.width, 0);
}

export const BBU_COLUMN_IDS = [
  "number",
  "productCode",
  "productName",
  "quantity",
  "currentPrice",
  "marketplacePrice",
  "cheapestSeller",
  "updatedAt",
  "article",
  "mpn",
  "barcode",
  "costPrice",
  "limit",
  "status",
  "pickupPoint",
  "botStatus"
] as const;

export type BbuColumnId = (typeof BBU_COLUMN_IDS)[number];

export const BBU_COLUMNS: readonly TableColumn<BbuColumnId>[] = [
  { id: "number", label: "N°", width: 46 },
  { id: "productCode", label: "Məhsul kodu", width: 104 },
  { id: "productName", label: "Məhsulun adı", width: 196 },
  { id: "quantity", label: "Miqdar", width: 60 },
  { id: "currentPrice", label: "Endirimli qiymət", width: 98 },
  { id: "marketplacePrice", label: "Umicodakı qiymət", width: 104 },
  { id: "cheapestSeller", label: "Ucuz satıcı", width: 124 },
  { id: "updatedAt", label: "Tarix", width: 98 },
  { id: "article", label: "Artikul", width: 100 },
  { id: "mpn", label: "MPN", width: 96 },
  { id: "barcode", label: "Barkod", width: 116 },
  { id: "costPrice", label: "Maya qiyməti", width: 100 },
  { id: "limit", label: "Limit", width: 120 },
  { id: "status", label: "Status", width: 110 },
  { id: "pickupPoint", label: "Götürülmə nöqtəsi", width: 128 },
  { id: "botStatus", label: "Bot statusu", width: 102 }
];

export const BBU_DEFAULT_VISIBLE: readonly BbuColumnId[] = [
  "number",
  "productCode",
  "productName",
  "quantity",
  "currentPrice",
  "marketplacePrice",
  "updatedAt",
  "limit",
  "status",
  "botStatus"
];

export const BOT_COLUMN_IDS = [
  "image",
  "name",
  "productCode",
  "category",
  "currentPrice",
  "previousPrice",
  "stock",
  "competitorPrice",
  "minimumPrice",
  "marketplaceStatus",
  "botStatus"
] as const;

export type BotColumnId = (typeof BOT_COLUMN_IDS)[number];

export const BOT_COLUMNS: readonly TableColumn<BotColumnId>[] = [
  { id: "image", label: "Şəkil", width: 58 },
  { id: "name", label: "Ad", width: 176 },
  { id: "productCode", label: "Məhsul kodu", width: 100 },
  { id: "category", label: "Kateqoriya", width: 104 },
  { id: "currentPrice", label: "Yeni qiymət", width: 84 },
  { id: "previousPrice", label: "Köhnə qiymət", width: 84 },
  { id: "stock", label: "Stok", width: 52 },
  { id: "competitorPrice", label: "Ən ucuz", width: 86 },
  { id: "minimumPrice", label: "Alt limit", width: 116 },
  { id: "marketplaceStatus", label: "BBU Status", width: 108 },
  { id: "botStatus", label: "Bot statusu", width: 98 }
];

export const BOT_DEFAULT_VISIBLE: readonly BotColumnId[] = [...BOT_COLUMN_IDS];
