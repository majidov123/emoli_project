-- CreateEnum
CREATE TYPE "BotPriceSource" AS ENUM ('BBU', 'SITE');

-- CreateEnum
CREATE TYPE "SettingsOperationType" AS ENUM (
    'AUTO_ASSIGN_MINIMUM_LIMITS',
    'ADJUST_PRICES_TO_MINIMUM',
    'SET_PRICES_TO_MAXIMUM',
    'INCREASE_PRICES',
    'IMPORT_LIMITS'
);

-- AlterTable
ALTER TABLE "BotSettings"
ADD COLUMN "botPriceSource" "BotPriceSource" NOT NULL DEFAULT 'BBU';

-- AlterTable
ALTER TABLE "PriceChange"
ADD COLUMN "settingsOperationId" UUID;

-- CreateTable
CREATE TABLE "SettingsOperation" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "type" "SettingsOperationType" NOT NULL,
    "parameters" JSONB NOT NULL,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "affectedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettingsOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettingsOperationItem" (
    "id" UUID NOT NULL,
    "operationId" UUID NOT NULL,
    "productId" UUID,
    "productExternalId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "oldPrice" DECIMAL(12,2),
    "newPrice" DECIMAL(12,2),
    "oldMinimumPrice" DECIMAL(12,2),
    "newMinimumPrice" DECIMAL(12,2),
    "oldMaximumPrice" DECIMAL(12,2),
    "newMaximumPrice" DECIMAL(12,2),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettingsOperationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceChange_settingsOperationId_idx" ON "PriceChange"("settingsOperationId");

-- CreateIndex
CREATE INDEX "SettingsOperation_storeId_createdAt_id_idx" ON "SettingsOperation"("storeId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "SettingsOperation_type_createdAt_idx" ON "SettingsOperation"("type", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SettingsOperationItem_operationId_productExternalId_key" ON "SettingsOperationItem"("operationId", "productExternalId");

-- CreateIndex
CREATE INDEX "SettingsOperationItem_operationId_idx" ON "SettingsOperationItem"("operationId");

-- CreateIndex
CREATE INDEX "SettingsOperationItem_productId_idx" ON "SettingsOperationItem"("productId");

-- AddForeignKey
ALTER TABLE "SettingsOperation"
ADD CONSTRAINT "SettingsOperation_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettingsOperationItem"
ADD CONSTRAINT "SettingsOperationItem_operationId_fkey"
FOREIGN KEY ("operationId") REFERENCES "SettingsOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettingsOperationItem"
ADD CONSTRAINT "SettingsOperationItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChange"
ADD CONSTRAINT "PriceChange_settingsOperationId_fkey"
FOREIGN KEY ("settingsOperationId") REFERENCES "SettingsOperation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add data-integrity checks for immutable operation summaries and snapshots
ALTER TABLE "SettingsOperation"
ADD CONSTRAINT "SettingsOperation_matchedCount_nonnegative" CHECK ("matchedCount" >= 0),
ADD CONSTRAINT "SettingsOperation_affectedCount_nonnegative" CHECK ("affectedCount" >= 0),
ADD CONSTRAINT "SettingsOperation_unchangedCount_nonnegative" CHECK ("unchangedCount" >= 0),
ADD CONSTRAINT "SettingsOperation_skippedCount_nonnegative" CHECK ("skippedCount" >= 0),
ADD CONSTRAINT "SettingsOperation_counts_partition_matched" CHECK (
    "matchedCount" = "affectedCount" + "unchangedCount" + "skippedCount"
);

ALTER TABLE "SettingsOperationItem"
ADD CONSTRAINT "SettingsOperationItem_productExternalId_nonempty" CHECK (btrim("productExternalId") <> ''),
ADD CONSTRAINT "SettingsOperationItem_productName_nonempty" CHECK (btrim("productName") <> ''),
ADD CONSTRAINT "SettingsOperationItem_oldPrice_nonnegative" CHECK ("oldPrice" IS NULL OR "oldPrice" >= 0),
ADD CONSTRAINT "SettingsOperationItem_newPrice_nonnegative" CHECK ("newPrice" IS NULL OR "newPrice" >= 0),
ADD CONSTRAINT "SettingsOperationItem_oldMinimumPrice_nonnegative" CHECK ("oldMinimumPrice" IS NULL OR "oldMinimumPrice" >= 0),
ADD CONSTRAINT "SettingsOperationItem_newMinimumPrice_nonnegative" CHECK ("newMinimumPrice" IS NULL OR "newMinimumPrice" >= 0),
ADD CONSTRAINT "SettingsOperationItem_oldMaximumPrice_nonnegative" CHECK ("oldMaximumPrice" IS NULL OR "oldMaximumPrice" >= 0),
ADD CONSTRAINT "SettingsOperationItem_newMaximumPrice_nonnegative" CHECK ("newMaximumPrice" IS NULL OR "newMaximumPrice" >= 0),
ADD CONSTRAINT "SettingsOperationItem_oldPriceBounds_valid" CHECK (
    "oldMinimumPrice" IS NULL OR "oldMaximumPrice" IS NULL OR "oldMinimumPrice" <= "oldMaximumPrice"
),
ADD CONSTRAINT "SettingsOperationItem_newPriceBounds_valid" CHECK (
    "newMinimumPrice" IS NULL OR "newMaximumPrice" IS NULL OR "newMinimumPrice" <= "newMaximumPrice"
);
