export interface TableColumn<Id extends string> {
  id: Id;
  label: string;
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
  { id: "number", label: "N°" },
  { id: "productCode", label: "Məhsul kodu" },
  { id: "productName", label: "Məhsulun adı" },
  { id: "quantity", label: "Miqdar" },
  { id: "currentPrice", label: "Endirimli qiymət" },
  { id: "marketplacePrice", label: "Umicodakı qiymət" },
  { id: "cheapestSeller", label: "Ucuz satıcı" },
  { id: "updatedAt", label: "Tarix" },
  { id: "article", label: "Artikul" },
  { id: "mpn", label: "MPN" },
  { id: "barcode", label: "Barkod" },
  { id: "costPrice", label: "Maya qiyməti" },
  { id: "limit", label: "Limit" },
  { id: "status", label: "Status" },
  { id: "pickupPoint", label: "Götürülmə nöqtəsi" },
  { id: "botStatus", label: "Bot statusu" }
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
  { id: "image", label: "Şəkil" },
  { id: "name", label: "Ad" },
  { id: "productCode", label: "Məhsul kodu" },
  { id: "category", label: "Kateqoriya" },
  { id: "currentPrice", label: "Yeni qiymət" },
  { id: "previousPrice", label: "Köhnə qiymət" },
  { id: "stock", label: "Stok" },
  { id: "competitorPrice", label: "Ən ucuz" },
  { id: "minimumPrice", label: "Alt limit" },
  { id: "marketplaceStatus", label: "BBU Status" },
  { id: "botStatus", label: "Bot statusu" }
];

export const BOT_DEFAULT_VISIBLE: readonly BotColumnId[] = [...BOT_COLUMN_IDS];
