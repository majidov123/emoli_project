import type { ProductStatus } from "./types";

export const STATUS_LABELS: Record<ProductStatus, string> = {
  ACTIVE: "Satışda",
  INACTIVE: "Deaktiv",
  OUT_OF_STOCK_STORE: "Mağazada bitib",
  OUT_OF_STOCK_PLATFORM: "Platformada bitib",
  HIDDEN: "Gizli",
  INVALID: "Qayda pozuntusu",
  UNSALEABLE: "Satıla bilmir",
  READY: "Satışa hazır",
  DRAFT: "Qaralama",
  UNKNOWN: "Naməlum"
};

export const STATUS_TONES: Record<ProductStatus, string> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  OUT_OF_STOCK_STORE: "warning",
  OUT_OF_STOCK_PLATFORM: "orange",
  HIDDEN: "neutral",
  INVALID: "danger",
  UNSALEABLE: "danger",
  READY: "info",
  DRAFT: "purple",
  UNKNOWN: "neutral"
};

export const EXTERNAL_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  DISABLED_BY_SELLER: "Satıcı deaktiv edib",
  OUT_OF_STOCK: "Stok bitib",
  PLATFORM_OUT_OF_STOCK: "Platformada bitib",
  HIDDEN: "Gizli",
  INVALID_DATA: "Məlumat yanlışdır",
  NOT_SALEABLE: "Satıla bilmir",
  READY_TO_LIST: "Satışa hazır",
  DRAFT: "Qaralama"
};
