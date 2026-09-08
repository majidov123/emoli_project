-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK_STORE', 'OUT_OF_STOCK_PLATFORM', 'HIDDEN', 'INVALID', 'UNSALEABLE', 'READY', 'DRAFT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PriceChangeDirection" AS ENUM ('DECREASE', 'INCREASE', 'UPPER_LIMIT', 'UNCHANGED');

-- CreateEnum
CREATE TYPE "BotRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "BotRunSource" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateTable
CREATE TABLE "Store" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "externalId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "previousPrice" DECIMAL(12,2),
    "currentPrice" DECIMAL(12,2),
    "marketplacePrice" DECIMAL(12,2),
    "competitorLowestPrice" DECIMAL(12,2),
    "minimumPrice" DECIMAL(12,2),
    "maximumPrice" DECIMAL(12,2),
    "botEnabled" BOOLEAN NOT NULL DEFAULT false,
    "normalizedStatus" "ProductStatus" NOT NULL DEFAULT 'UNKNOWN',
    "externalStatus" TEXT,
    "sourceUpdatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorOffer" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sellerExternalId" TEXT,
    "sellerName" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "excludedAsFriendStore" BOOLEAN NOT NULL DEFAULT false,
    "observedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceChange" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "oldPrice" DECIMAL(12,2) NOT NULL,
    "newPrice" DECIMAL(12,2) NOT NULL,
    "competitorPrice" DECIMAL(12,2),
    "minimumPrice" DECIMAL(12,2),
    "maximumPrice" DECIMAL(12,2),
    "direction" "PriceChangeDirection" NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotRun" (
    "id" UUID NOT NULL,
    "status" "BotRunStatus" NOT NULL DEFAULT 'RUNNING',
    "source" "BotRunSource" NOT NULL,
    "productsChecked" INTEGER NOT NULL DEFAULT 0,
    "pricesDecreased" INTEGER NOT NULL DEFAULT 0,
    "pricesIncreased" INTEGER NOT NULL DEFAULT 0,
    "pricesSetToUpperLimit" INTEGER NOT NULL DEFAULT 0,
    "productsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),
    "durationMilliseconds" INTEGER,

    CONSTRAINT "BotRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotSettings" (
    "id" UUID NOT NULL,
    "botEnabled" BOOLEAN NOT NULL DEFAULT false,
    "checkIntervalMinutes" INTEGER NOT NULL,
    "undercutAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.01,
    "allowProductsWithoutMinimumPrice" BOOLEAN NOT NULL DEFAULT false,
    "friendStoreExternalId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BotSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_platform_externalId_key" ON "Store"("platform", "externalId");

-- CreateIndex
CREATE INDEX "Store_platform_active_idx" ON "Store"("platform", "active");

-- CreateIndex
CREATE INDEX "Product_storeId_normalizedStatus_idx" ON "Product"("storeId", "normalizedStatus");

-- CreateIndex
CREATE INDEX "Product_normalizedStatus_updatedAt_idx" ON "Product"("normalizedStatus", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Product_category_updatedAt_idx" ON "Product"("category", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Product_botEnabled_updatedAt_idx" ON "Product"("botEnabled", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Product_updatedAt_id_idx" ON "Product"("updatedAt" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Product_storeId_externalId_key" ON "Product"("storeId", "externalId");

-- CreateIndex
CREATE INDEX "CompetitorOffer_productId_observedAt_idx" ON "CompetitorOffer"("productId", "observedAt" DESC);

-- CreateIndex
CREATE INDEX "CompetitorOffer_productId_inStock_excludedAsFriendStore_pri_idx" ON "CompetitorOffer"("productId", "inStock", "excludedAsFriendStore", "price");

-- CreateIndex
CREATE INDEX "CompetitorOffer_sellerExternalId_idx" ON "CompetitorOffer"("sellerExternalId");

-- CreateIndex
CREATE INDEX "PriceChange_productId_createdAt_idx" ON "PriceChange"("productId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PriceChange_createdAt_id_idx" ON "PriceChange"("createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "PriceChange_direction_createdAt_idx" ON "PriceChange"("direction", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BotRun_startedAt_id_idx" ON "BotRun"("startedAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "BotRun_status_startedAt_idx" ON "BotRun"("status", "startedAt" DESC);

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorOffer" ADD CONSTRAINT "CompetitorOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChange" ADD CONSTRAINT "PriceChange_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add data-integrity checks not expressible in the Prisma schema language
ALTER TABLE "Product" ADD CONSTRAINT "Product_stock_nonnegative" CHECK ("stock" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_previousPrice_nonnegative" CHECK ("previousPrice" IS NULL OR "previousPrice" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_currentPrice_nonnegative" CHECK ("currentPrice" IS NULL OR "currentPrice" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_marketplacePrice_nonnegative" CHECK ("marketplacePrice" IS NULL OR "marketplacePrice" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_competitorLowestPrice_nonnegative" CHECK ("competitorLowestPrice" IS NULL OR "competitorLowestPrice" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_minimumPrice_nonnegative" CHECK ("minimumPrice" IS NULL OR "minimumPrice" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_maximumPrice_nonnegative" CHECK ("maximumPrice" IS NULL OR "maximumPrice" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_bounds_valid" CHECK ("minimumPrice" IS NULL OR "maximumPrice" IS NULL OR "minimumPrice" <= "maximumPrice");

ALTER TABLE "CompetitorOffer" ADD CONSTRAINT "CompetitorOffer_price_nonnegative" CHECK ("price" >= 0);

ALTER TABLE "PriceChange" ADD CONSTRAINT "PriceChange_oldPrice_nonnegative" CHECK ("oldPrice" >= 0);
ALTER TABLE "PriceChange" ADD CONSTRAINT "PriceChange_newPrice_nonnegative" CHECK ("newPrice" >= 0);
ALTER TABLE "PriceChange" ADD CONSTRAINT "PriceChange_competitorPrice_nonnegative" CHECK ("competitorPrice" IS NULL OR "competitorPrice" >= 0);
ALTER TABLE "PriceChange" ADD CONSTRAINT "PriceChange_minimumPrice_nonnegative" CHECK ("minimumPrice" IS NULL OR "minimumPrice" >= 0);
ALTER TABLE "PriceChange" ADD CONSTRAINT "PriceChange_maximumPrice_nonnegative" CHECK ("maximumPrice" IS NULL OR "maximumPrice" >= 0);
ALTER TABLE "PriceChange" ADD CONSTRAINT "PriceChange_price_bounds_valid" CHECK ("minimumPrice" IS NULL OR "maximumPrice" IS NULL OR "minimumPrice" <= "maximumPrice");

ALTER TABLE "BotRun" ADD CONSTRAINT "BotRun_productsChecked_nonnegative" CHECK ("productsChecked" >= 0);
ALTER TABLE "BotRun" ADD CONSTRAINT "BotRun_pricesDecreased_nonnegative" CHECK ("pricesDecreased" >= 0);
ALTER TABLE "BotRun" ADD CONSTRAINT "BotRun_pricesIncreased_nonnegative" CHECK ("pricesIncreased" >= 0);
ALTER TABLE "BotRun" ADD CONSTRAINT "BotRun_pricesSetToUpperLimit_nonnegative" CHECK ("pricesSetToUpperLimit" >= 0);
ALTER TABLE "BotRun" ADD CONSTRAINT "BotRun_productsSkipped_nonnegative" CHECK ("productsSkipped" >= 0);
ALTER TABLE "BotRun" ADD CONSTRAINT "BotRun_errorsCount_nonnegative" CHECK ("errorsCount" >= 0);
ALTER TABLE "BotRun" ADD CONSTRAINT "BotRun_durationMilliseconds_nonnegative" CHECK ("durationMilliseconds" IS NULL OR "durationMilliseconds" >= 0);
ALTER TABLE "BotRun" ADD CONSTRAINT "BotRun_time_range_valid" CHECK ("finishedAt" IS NULL OR "finishedAt" >= "startedAt");

ALTER TABLE "BotSettings" ADD CONSTRAINT "BotSettings_checkIntervalMinutes_positive" CHECK ("checkIntervalMinutes" > 0);
ALTER TABLE "BotSettings" ADD CONSTRAINT "BotSettings_undercutAmount_nonnegative" CHECK ("undercutAmount" >= 0);
