-- CreateTable
CREATE TABLE "CatalogProduct" (
    "id" UUID NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "category" TEXT,
    "barcode" TEXT,
    "mpn" TEXT,
    "defaultPrice" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProduct_externalId_key" ON "CatalogProduct"("externalId");

-- CreateIndex
CREATE INDEX "CatalogProduct_active_name_idx" ON "CatalogProduct"("active", "name");

-- CreateIndex
CREATE INDEX "CatalogProduct_barcode_idx" ON "CatalogProduct"("barcode");

-- CreateIndex
CREATE INDEX "CatalogProduct_mpn_idx" ON "CatalogProduct"("mpn");

-- Add a data-integrity check consistent with the other monetary columns
ALTER TABLE "CatalogProduct"
ADD CONSTRAINT "CatalogProduct_defaultPrice_nonnegative" CHECK ("defaultPrice" >= 0);
