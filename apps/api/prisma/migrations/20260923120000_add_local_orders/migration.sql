-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM (
    'BUYER_NOT_HOME',
    'RETURNED',
    'PACKAGING',
    'NEW',
    'CLARIFYING_WITH_CUSTOMER',
    'CUSTOMER_CONFIRMED',
    'READY_FOR_DELIVERY',
    'ACCEPTED_FOR_DELIVERY',
    'REJECTED_FOR_DELIVERY',
    'ON_WAY_TO_DISTRIBUTION_CENTER',
    'AT_DISTRIBUTION_CENTER',
    'DELIVERY_SCHEDULED',
    'WITH_COURIER',
    'ON_WAY_TO_PUDO',
    'AT_PUDO',
    'DELIVERED',
    'PARTIALLY_DELIVERED',
    'CUSTOMER_REFUSED',
    'LOGISTICS_CANCELLED',
    'COMPLETED',
    'CUSTOMER_CANCELLED',
    'MARKET_CANCELLED',
    'REDIRECTED',
    'STORAGE_AT_DC_PARTNER',
    'ON_THE_WAY_TO_DC_PARTNER',
    'ON_WAY_TO_INTERMEDIATE_CENTER',
    'AT_INTERMEDIATE_CENTER',
    'CONFIRMED_FOR_PICKING',
    'PICKING',
    'PICKING_COMPLETED',
    'PACKED',
    'OFFLINE_CREDIT'
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "externalId" TEXT NOT NULL,
    "customerName" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "orderedAt" TIMESTAMPTZ(3) NOT NULL,
    "currentStatus" "OrderStatus" NOT NULL,
    "loadedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID,
    "productExternalId" TEXT,
    "productName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_storeId_externalId_key" ON "Order"("storeId", "externalId");

-- CreateIndex
CREATE INDEX "Order_storeId_orderedAt_id_idx" ON "Order"("storeId", "orderedAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Order_storeId_currentStatus_orderedAt_idx" ON "Order"("storeId", "currentStatus", "orderedAt" DESC);

-- CreateIndex
CREATE INDEX "Order_storeId_loadedAt_idx" ON "Order"("storeId", "loadedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_orderId_productExternalId_key" ON "OrderItem"("orderId", "productExternalId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderStatusHistory_orderId_status_occurredAt_key" ON "OrderStatusHistory"("orderId", "status", "occurredAt");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_occurredAt_id_idx" ON "OrderStatusHistory"("orderId", "occurredAt", "id");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_status_occurredAt_idx" ON "OrderStatusHistory"("status", "occurredAt" DESC);

-- AddForeignKey
ALTER TABLE "Order"
ADD CONSTRAINT "Order_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory"
ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add data-integrity checks not expressible in the Prisma schema language
ALTER TABLE "Order"
ADD CONSTRAINT "Order_externalId_nonempty" CHECK (btrim("externalId") <> ''),
ADD CONSTRAINT "Order_totalAmount_nonnegative" CHECK ("totalAmount" >= 0);

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_productExternalId_nonempty" CHECK (
    "productExternalId" IS NULL OR btrim("productExternalId") <> ''
),
ADD CONSTRAINT "OrderItem_productName_nonempty" CHECK (btrim("productName") <> ''),
ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0),
ADD CONSTRAINT "OrderItem_unitPrice_nonnegative" CHECK ("unitPrice" >= 0);
