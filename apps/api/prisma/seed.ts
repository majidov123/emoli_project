import {
  BotRunSource,
  BotRunStatus,
  PriceChangeDirection,
  Prisma,
  PrismaClient,
  ProductStatus
} from "@prisma/client";

const prisma = new PrismaClient();
const storeId = "00000000-0000-4000-8000-000000000001";
const settingsId = "50000000-0000-4000-8000-000000000001";
const productId = (suffix: number) =>
  `10000000-0000-4000-8000-${suffix.toString().padStart(12, "0")}`;
const money = (value: string) => new Prisma.Decimal(value);
const observedAt = new Date("2026-09-01T08:00:00.000Z");
const createdAt = new Date("2026-08-31T08:00:00.000Z");
const updatedAt = new Date("2026-09-03T08:00:00.000Z");

const products: Prisma.ProductUncheckedCreateInput[] = [
  {
    id: productId(1), storeId, externalId: "DEMO-P-1001", sku: "AST-MOU-01",
    name: "Aster Wireless Mouse", imageUrl: null, category: "Accessories", brand: "Aster", stock: 24,
    previousPrice: money("25.99"), currentPrice: money("24.49"), marketplacePrice: money("24.49"),
    competitorLowestPrice: money("24.50"), minimumPrice: money("20.00"), maximumPrice: money("29.99"),
    botEnabled: true, normalizedStatus: ProductStatus.ACTIVE, externalStatus: "ACTIVE",
    sourceUpdatedAt: new Date("2026-09-03T07:45:00.000Z"), createdAt, updatedAt
  },
  {
    id: productId(2), storeId, externalId: "DEMO-P-1002", sku: "LUM-KEY-02",
    name: "Luma Mechanical Keyboard", imageUrl: null, category: "Accessories", brand: "Luma", stock: 8,
    previousPrice: money("89.00"), currentPrice: money("89.00"), marketplacePrice: money("89.00"),
    competitorLowestPrice: money("85.50"), minimumPrice: money("75.00"), maximumPrice: money("99.99"),
    botEnabled: false, normalizedStatus: ProductStatus.INACTIVE, externalStatus: "DISABLED_BY_SELLER",
    sourceUpdatedAt: new Date("2026-09-03T07:40:00.000Z"), createdAt, updatedAt
  },
  {
    id: productId(3), storeId, externalId: "DEMO-P-1003", sku: "NOV-HUB-03",
    name: "Nova USB-C Hub", imageUrl: null, category: "Accessories", brand: "Nova", stock: 0,
    previousPrice: money("39.90"), currentPrice: money("39.90"), marketplacePrice: money("39.90"),
    competitorLowestPrice: money("38.95"), minimumPrice: money("34.00"), maximumPrice: money("49.00"),
    botEnabled: true, normalizedStatus: ProductStatus.OUT_OF_STOCK_STORE, externalStatus: "OUT_OF_STOCK",
    sourceUpdatedAt: new Date("2026-09-03T07:35:00.000Z"), createdAt, updatedAt
  },
  {
    id: productId(4), storeId, externalId: "DEMO-P-1004", sku: "AST-CHG-04",
    name: "Aster 65W Charger", imageUrl: null, category: "Chargers", brand: "Aster", stock: 14,
    previousPrice: money("49.90"), currentPrice: money("44.90"), marketplacePrice: money("44.90"),
    competitorLowestPrice: money("43.90"), minimumPrice: money("39.00"), maximumPrice: money("55.00"),
    botEnabled: true, normalizedStatus: ProductStatus.OUT_OF_STOCK_PLATFORM, externalStatus: "PLATFORM_OUT_OF_STOCK",
    sourceUpdatedAt: new Date("2026-09-03T07:30:00.000Z"), createdAt, updatedAt
  },
  {
    id: productId(5), storeId, externalId: "DEMO-P-1005", sku: "LUM-LMP-05",
    name: "Luma Desk Lamp", imageUrl: null, category: "Home Office", brand: "Luma", stock: 6,
    previousPrice: money("31.50"), currentPrice: money("31.50"), marketplacePrice: money("31.50"),
    competitorLowestPrice: money("30.00"), minimumPrice: money("27.00"), maximumPrice: money("39.00"),
    botEnabled: false, normalizedStatus: ProductStatus.HIDDEN, externalStatus: "HIDDEN",
    sourceUpdatedAt: new Date("2026-09-03T07:25:00.000Z"), createdAt, updatedAt
  },
  {
    id: productId(6), storeId, externalId: "DEMO-P-1006", sku: null,
    name: "Orbit Smart Plug", imageUrl: null, category: "Smart Home", brand: "Orbit", stock: 10,
    previousPrice: null, currentPrice: null, marketplacePrice: null, competitorLowestPrice: null,
    minimumPrice: money("12.00"), maximumPrice: money("25.00"), botEnabled: false,
    normalizedStatus: ProductStatus.INVALID, externalStatus: "INVALID_DATA",
    sourceUpdatedAt: new Date("2026-09-03T07:20:00.000Z"), createdAt, updatedAt
  },
  {
    id: productId(7), storeId, externalId: "DEMO-P-1007", sku: "NOV-STD-07",
    name: "Nova Laptop Stand", imageUrl: null, category: "Home Office", brand: "Nova", stock: 4,
    previousPrice: money("34.99"), currentPrice: money("34.99"), marketplacePrice: null,
    competitorLowestPrice: money("33.50"), minimumPrice: money("30.00"), maximumPrice: money("45.00"),
    botEnabled: false, normalizedStatus: ProductStatus.UNSALEABLE, externalStatus: "NOT_SALEABLE",
    sourceUpdatedAt: new Date("2026-09-03T07:15:00.000Z"), createdAt, updatedAt
  },
  {
    id: productId(8), storeId, externalId: "DEMO-P-1008", sku: "CAS-EAR-08",
    name: "Caspian Noise-Isolating Earbuds", imageUrl: null, category: "Audio", brand: "Caspian", stock: 30,
    previousPrice: money("21.00"), currentPrice: money("19.49"), marketplacePrice: money("19.49"),
    competitorLowestPrice: money("19.50"), minimumPrice: money("17.50"), maximumPrice: money("25.00"),
    botEnabled: true, normalizedStatus: ProductStatus.READY, externalStatus: "READY_TO_LIST",
    sourceUpdatedAt: new Date("2026-09-03T07:10:00.000Z"), createdAt, updatedAt
  },
  {
    id: productId(9), storeId, externalId: "DEMO-P-1009", sku: null,
    name: "Orbit Mini Speaker", imageUrl: null, category: "Audio", brand: "Orbit", stock: 12,
    previousPrice: null, currentPrice: null, marketplacePrice: null, competitorLowestPrice: null,
    minimumPrice: money("24.00"), maximumPrice: money("39.99"), botEnabled: false,
    normalizedStatus: ProductStatus.DRAFT, externalStatus: "DRAFT", sourceUpdatedAt: null, createdAt, updatedAt
  },
  {
    id: productId(10), storeId, externalId: "DEMO-P-1010", sku: "LUM-CBL-10",
    name: "Luma Cable Organizer", imageUrl: null, category: null, brand: null, stock: 50,
    previousPrice: money("7.50"), currentPrice: money("12.00"), marketplacePrice: money("12.00"),
    competitorLowestPrice: null, minimumPrice: null, maximumPrice: money("12.00"), botEnabled: false,
    normalizedStatus: ProductStatus.UNKNOWN, externalStatus: null, sourceUpdatedAt: null, createdAt, updatedAt
  },
  {
    id: productId(11), storeId, externalId: "DEMO-P-1011", sku: "AST-SSD-11",
    name: "Aster Portable SSD 1 TB", imageUrl: null, category: "Storage", brand: "Aster", stock: 7,
    previousPrice: money("119.99"), currentPrice: money("109.49"), marketplacePrice: money("109.49"),
    competitorLowestPrice: money("109.50"), minimumPrice: money("99.00"), maximumPrice: money("129.99"),
    botEnabled: true, normalizedStatus: ProductStatus.ACTIVE, externalStatus: "ACTIVE",
    sourceUpdatedAt: new Date("2026-09-03T07:05:00.000Z"), createdAt, updatedAt
  },
  {
    id: productId(12), storeId, externalId: "DEMO-P-1012", sku: "NOV-CAM-12",
    name: "Nova Full HD Webcam", imageUrl: null, category: "Cameras", brand: "Nova", stock: 16,
    previousPrice: money("49.99"), currentPrice: money("52.99"), marketplacePrice: money("52.99"),
    competitorLowestPrice: money("53.00"), minimumPrice: money("49.00"), maximumPrice: money("69.99"),
    botEnabled: true, normalizedStatus: ProductStatus.READY, externalStatus: "READY_TO_LIST",
    sourceUpdatedAt: new Date("2026-09-03T07:00:00.000Z"), createdAt, updatedAt
  }
];

const offers: Prisma.CompetitorOfferUncheckedCreateInput[] = [
  { id: "20000000-0000-4000-8000-000000000001", productId: productId(1), sellerExternalId: "seller-river", sellerName: "River Cart", price: money("24.50"), inStock: true, excludedAsFriendStore: false, observedAt },
  { id: "20000000-0000-4000-8000-000000000002", productId: productId(1), sellerExternalId: "friend-demo-001", sellerName: "Friendly Demo Outlet", price: money("23.90"), inStock: true, excludedAsFriendStore: true, observedAt },
  { id: "20000000-0000-4000-8000-000000000003", productId: productId(1), sellerExternalId: "seller-cloud", sellerName: "Cloud Cart", price: money("22.00"), inStock: false, excludedAsFriendStore: false, observedAt },
  { id: "20000000-0000-4000-8000-000000000004", productId: productId(2), sellerExternalId: "seller-cobalt", sellerName: "Cobalt Keys", price: money("85.50"), inStock: true, excludedAsFriendStore: false, observedAt },
  { id: "20000000-0000-4000-8000-000000000005", productId: productId(3), sellerExternalId: null, sellerName: "Anonymous Demo Seller", price: money("38.95"), inStock: true, excludedAsFriendStore: false, observedAt },
  { id: "20000000-0000-4000-8000-000000000006", productId: productId(4), sellerExternalId: "seller-spark", sellerName: null, price: money("43.90"), inStock: true, excludedAsFriendStore: false, observedAt },
  { id: "20000000-0000-4000-8000-000000000007", productId: productId(5), sellerExternalId: "seller-home", sellerName: "Home Demo", price: money("30.00"), inStock: true, excludedAsFriendStore: false, observedAt },
  { id: "20000000-0000-4000-8000-000000000008", productId: productId(8), sellerExternalId: "seller-sound", sellerName: "Sound Demo", price: money("19.50"), inStock: true, excludedAsFriendStore: false, observedAt },
  { id: "20000000-0000-4000-8000-000000000009", productId: productId(8), sellerExternalId: "friend-demo-001", sellerName: "Friendly Demo Outlet", price: money("19.25"), inStock: true, excludedAsFriendStore: true, observedAt },
  { id: "20000000-0000-4000-8000-000000000010", productId: productId(11), sellerExternalId: "seller-storage", sellerName: "Storage Demo", price: money("109.50"), inStock: true, excludedAsFriendStore: false, observedAt },
  { id: "20000000-0000-4000-8000-000000000011", productId: productId(11), sellerExternalId: "seller-archive", sellerName: "Archive Demo", price: money("105.00"), inStock: false, excludedAsFriendStore: false, observedAt },
  { id: "20000000-0000-4000-8000-000000000012", productId: productId(12), sellerExternalId: "seller-camera", sellerName: "Camera Demo", price: money("53.00"), inStock: true, excludedAsFriendStore: false, observedAt }
];

const priceChanges: Prisma.PriceChangeUncheckedCreateInput[] = [
  {
    id: "30000000-0000-4000-8000-000000000001", productId: productId(1),
    oldPrice: money("25.99"), newPrice: money("24.49"), competitorPrice: money("24.50"),
    minimumPrice: money("20.00"), maximumPrice: money("29.99"), direction: PriceChangeDirection.DECREASE,
    reason: "Undercut lowest eligible competitor by 0.01", source: "BOT",
    createdAt: new Date("2026-09-03T08:01:00.000Z")
  },
  {
    id: "30000000-0000-4000-8000-000000000002", productId: productId(11),
    oldPrice: money("119.99"), newPrice: money("109.49"), competitorPrice: money("109.50"),
    minimumPrice: money("99.00"), maximumPrice: money("129.99"), direction: PriceChangeDirection.DECREASE,
    reason: "Undercut lowest eligible competitor by 0.01", source: "BOT",
    createdAt: new Date("2026-09-03T08:01:01.000Z")
  },
  {
    id: "30000000-0000-4000-8000-000000000003", productId: productId(12),
    oldPrice: money("49.99"), newPrice: money("52.99"), competitorPrice: money("53.00"),
    minimumPrice: money("49.00"), maximumPrice: money("69.99"), direction: PriceChangeDirection.INCREASE,
    reason: "Undercut lowest eligible competitor by 0.01", source: "BOT",
    createdAt: new Date("2026-09-03T08:01:02.000Z")
  },
  {
    id: "30000000-0000-4000-8000-000000000004", productId: productId(10),
    oldPrice: money("7.50"), newPrice: money("12.00"), competitorPrice: null,
    minimumPrice: null, maximumPrice: money("12.00"), direction: PriceChangeDirection.UPPER_LIMIT,
    reason: "Set manually to configured upper limit", source: "MANUAL",
    createdAt: new Date("2026-09-02T10:30:00.000Z")
  },
  {
    id: "30000000-0000-4000-8000-000000000005", productId: productId(2),
    oldPrice: money("89.00"), newPrice: money("89.00"), competitorPrice: money("85.50"),
    minimumPrice: money("75.00"), maximumPrice: money("99.99"), direction: PriceChangeDirection.UNCHANGED,
    reason: "Product is inactive", source: "BOT",
    createdAt: new Date("2026-09-01T09:15:00.000Z")
  }
];

const botRuns: Prisma.BotRunUncheckedCreateInput[] = [
  {
    id: "40000000-0000-4000-8000-000000000001", status: BotRunStatus.SUCCESS,
    source: BotRunSource.SCHEDULED, productsChecked: 12, pricesDecreased: 2, pricesIncreased: 1,
    pricesSetToUpperLimit: 1, productsSkipped: 8, errorsCount: 0, errorMessage: null,
    startedAt: new Date("2026-09-03T08:00:00.000Z"), finishedAt: new Date("2026-09-03T08:00:01.550Z"),
    durationMilliseconds: 1550
  },
  {
    id: "40000000-0000-4000-8000-000000000002", status: BotRunStatus.PARTIAL,
    source: BotRunSource.SCHEDULED, productsChecked: 12, pricesDecreased: 0, pricesIncreased: 0,
    pricesSetToUpperLimit: 0, productsSkipped: 11, errorsCount: 1,
    errorMessage: "Demo validation failure for DEMO-P-1006",
    startedAt: new Date("2026-09-02T08:00:00.000Z"), finishedAt: new Date("2026-09-02T08:00:01.240Z"),
    durationMilliseconds: 1240
  },
  {
    id: "40000000-0000-4000-8000-000000000003", status: BotRunStatus.SUCCESS,
    source: BotRunSource.MANUAL, productsChecked: 12, pricesDecreased: 0, pricesIncreased: 0,
    pricesSetToUpperLimit: 0, productsSkipped: 12, errorsCount: 0, errorMessage: null,
    startedAt: new Date("2026-09-01T12:00:00.000Z"), finishedAt: new Date("2026-09-01T12:00:00.780Z"),
    durationMilliseconds: 780
  },
  {
    id: "40000000-0000-4000-8000-000000000004", status: BotRunStatus.FAILED,
    source: BotRunSource.SCHEDULED, productsChecked: 0, pricesDecreased: 0, pricesIncreased: 0,
    pricesSetToUpperLimit: 0, productsSkipped: 0, errorsCount: 1,
    errorMessage: "Demo run intentionally failed before product processing",
    startedAt: new Date("2026-08-31T08:00:00.000Z"), finishedAt: new Date("2026-08-31T08:00:00.250Z"),
    durationMilliseconds: 250
  }
];

async function main() {
  await prisma.$transaction(async (tx) => {
    const store: Prisma.StoreUncheckedCreateInput = {
      id: storeId,
      name: "Caspian Demo Market",
      platform: "BIRMARKET_DEMO",
      externalId: "demo-store-001",
      active: true,
      createdAt,
      updatedAt
    };
    const { id: seededStoreId, ...storeUpdate } = store;
    await tx.store.upsert({ where: { id: seededStoreId }, create: store, update: storeUpdate });

    for (const product of products) {
      const { id, ...update } = product;
      await tx.product.upsert({ where: { id }, create: product, update });
    }
    for (const offer of offers) {
      const { id, ...update } = offer;
      await tx.competitorOffer.upsert({ where: { id }, create: offer, update });
    }
    for (const change of priceChanges) {
      const { id, ...update } = change;
      await tx.priceChange.upsert({ where: { id }, create: change, update });
    }
    for (const run of botRuns) {
      const { id, ...update } = run;
      await tx.botRun.upsert({ where: { id }, create: run, update });
    }

    const settings: Prisma.BotSettingsUncheckedCreateInput = {
      id: settingsId,
      botEnabled: true,
      checkIntervalMinutes: 15,
      undercutAmount: money("0.01"),
      allowProductsWithoutMinimumPrice: false,
      friendStoreExternalId: "friend-demo-001",
      createdAt,
      updatedAt
    };
    const { id: seededSettingsId, ...settingsUpdate } = settings;
    await tx.botSettings.upsert({
      where: { id: seededSettingsId },
      create: settings,
      update: settingsUpdate
    });
  });

  console.log(`Seeded 1 store, ${products.length} products, ${offers.length} offers, ${priceChanges.length} price changes, ${botRuns.length} bot runs, and 1 settings record.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
