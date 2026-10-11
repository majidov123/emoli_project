import {
  BotPriceSource,
  BotRunSource,
  BotRunStatus,
  OrderStatus,
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
const catalogProductId = (suffix: number) =>
  `60000000-0000-4000-8000-${suffix.toString().padStart(12, "0")}`;
const orderId = (suffix: number) =>
  `70000000-0000-4000-8000-${suffix.toString().padStart(12, "0")}`;
const orderItemId = (suffix: number) =>
  `71000000-0000-4000-8000-${suffix.toString().padStart(12, "0")}`;
const orderHistoryId = (suffix: number) =>
  `72000000-0000-4000-8000-${suffix.toString().padStart(12, "0")}`;
const money = (value: string) => new Prisma.Decimal(value);
const observedAt = new Date("2026-09-01T08:00:00.000Z");
const createdAt = new Date("2026-08-31T08:00:00.000Z");
const updatedAt = new Date("2026-09-03T08:00:00.000Z");

const catalogProducts: Prisma.CatalogProductUncheckedCreateInput[] = [
  {
    id: catalogProductId(1), externalId: "LOCAL-CAT-2001", name: "Zephyr Foldable Phone Stand",
    imageUrl: null, category: "Accessories", barcode: "9900000002001", mpn: "ZEP-STD-A1",
    defaultPrice: money("18.75"), active: true, createdAt, updatedAt
  },
  {
    id: catalogProductId(2), externalId: "LOCAL-CAT-2002", name: "Maral Compact Bluetooth Speaker",
    imageUrl: null, category: "Audio", barcode: "9900000002002", mpn: "MAR-SPK-C2",
    defaultPrice: money("42.90"), active: true, createdAt, updatedAt
  },
  {
    id: catalogProductId(3), externalId: "LOCAL-CAT-2003", name: "Kura Braided USB-C Cable",
    imageUrl: null, category: "Chargers", barcode: "9900000002003", mpn: null,
    defaultPrice: money("11.40"), active: true, createdAt, updatedAt
  },
  {
    id: catalogProductId(4), externalId: "LOCAL-CAT-2004", name: "Solis Monitor Light Bar",
    imageUrl: null, category: "Home Office", barcode: null, mpn: "SOL-LGT-M4",
    defaultPrice: money("64.25"), active: true, createdAt, updatedAt
  },
  {
    id: catalogProductId(5), externalId: "LOCAL-CAT-2005", name: "Atlas Mini Tripod",
    imageUrl: null, category: "Cameras", barcode: "9900000002005", mpn: "ATL-TRI-M5",
    defaultPrice: money("27.30"), active: true, createdAt, updatedAt
  },
  {
    id: catalogProductId(6), externalId: "LOCAL-CAT-2006", name: "Nimbus Wireless Presenter",
    imageUrl: null, category: "Home Office", barcode: "9900000002006", mpn: null,
    defaultPrice: money("36.80"), active: true, createdAt, updatedAt
  },
  {
    id: catalogProductId(7), externalId: "LOCAL-CAT-2007", name: "Pomegranate Desk Organizer",
    imageUrl: null, category: "Home Office", barcode: null, mpn: "PMG-ORG-D7",
    defaultPrice: money("23.60"), active: true, createdAt, updatedAt
  },
  {
    id: catalogProductId(8), externalId: "LOCAL-CAT-2008", name: "Meridian Portable Card Reader",
    imageUrl: null, category: "Storage", barcode: "9900000002008", mpn: "MER-CRD-P8",
    defaultPrice: money("16.95"), active: true, createdAt, updatedAt
  },
  {
    id: catalogProductId(9), externalId: "LOCAL-CAT-2009", name: "Quartz Travel Adapter",
    imageUrl: null, category: "Chargers", barcode: "9900000002009", mpn: "QTZ-ADP-T9",
    defaultPrice: money("31.10"), active: true, createdAt, updatedAt
  },
  {
    id: catalogProductId(10), externalId: "LOCAL-CAT-2010", name: "Willow Webcam Privacy Cover",
    imageUrl: null, category: "Accessories", barcode: "9900000002010", mpn: null,
    defaultPrice: money("6.45"), active: true, createdAt, updatedAt
  },
  {
    id: catalogProductId(11), externalId: "LOCAL-CAT-2011", name: "Horizon Ergonomic Wrist Rest",
    imageUrl: null, category: "Accessories", barcode: null, mpn: "HRZ-WRS-E11",
    defaultPrice: money("21.55"), active: true, createdAt, updatedAt
  },
  {
    id: catalogProductId(12), externalId: "LOCAL-CAT-2012", name: "Ember Pocket Fan",
    imageUrl: null, category: "Accessories", barcode: "9900000002012", mpn: "EMB-FAN-P12",
    defaultPrice: money("14.20"), active: false, createdAt, updatedAt
  }
];

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

const ordersLoadedAt = new Date("2026-09-03T09:30:00.000Z");
const orders: Prisma.OrderUncheckedCreateInput[] = [
  {
    id: orderId(1), storeId, externalId: "LOCAL-ORDER-2026-0001", customerName: "Demo alıcı 01",
    totalAmount: money("48.49"), orderedAt: new Date("2026-08-25T10:15:00.000Z"),
    currentStatus: OrderStatus.NEW, loadedAt: ordersLoadedAt,
    createdAt: new Date("2026-08-25T10:15:00.000Z"), updatedAt: ordersLoadedAt
  },
  {
    id: orderId(2), storeId, externalId: "LOCAL-ORDER-2026-0002", customerName: "Demo alıcı 02",
    totalAmount: money("109.49"), orderedAt: new Date("2026-08-26T11:20:00.000Z"),
    currentStatus: OrderStatus.PACKAGING, loadedAt: ordersLoadedAt,
    createdAt: new Date("2026-08-26T11:20:00.000Z"), updatedAt: ordersLoadedAt
  },
  {
    id: orderId(3), storeId, externalId: "LOCAL-ORDER-2026-0003", customerName: "Demo alıcı 03",
    totalAmount: money("80.90"), orderedAt: new Date("2026-08-27T12:25:00.000Z"),
    currentStatus: OrderStatus.WITH_COURIER, loadedAt: ordersLoadedAt,
    createdAt: new Date("2026-08-27T12:25:00.000Z"), updatedAt: ordersLoadedAt
  },
  {
    id: orderId(4), storeId, externalId: "LOCAL-ORDER-2026-0004", customerName: "Demo alıcı 04",
    totalAmount: money("38.98"), orderedAt: new Date("2026-08-28T13:30:00.000Z"),
    currentStatus: OrderStatus.DELIVERED, loadedAt: ordersLoadedAt,
    createdAt: new Date("2026-08-28T13:30:00.000Z"), updatedAt: ordersLoadedAt
  },
  {
    id: orderId(5), storeId, externalId: "LOCAL-ORDER-2026-0005", customerName: "Demo alıcı 05",
    totalAmount: money("77.48"), orderedAt: new Date("2026-08-29T14:35:00.000Z"),
    currentStatus: OrderStatus.COMPLETED, loadedAt: ordersLoadedAt,
    createdAt: new Date("2026-08-29T14:35:00.000Z"), updatedAt: ordersLoadedAt
  },
  {
    id: orderId(6), storeId, externalId: "LOCAL-ORDER-2026-0006", customerName: null,
    totalAmount: money("31.50"), orderedAt: new Date("2026-08-30T15:40:00.000Z"),
    currentStatus: OrderStatus.CUSTOMER_CANCELLED, loadedAt: ordersLoadedAt,
    createdAt: new Date("2026-08-30T15:40:00.000Z"), updatedAt: ordersLoadedAt
  },
  {
    id: orderId(7), storeId, externalId: "LOCAL-ORDER-2026-0007", customerName: "Demo alıcı 07",
    totalAmount: money("89.00"), orderedAt: new Date("2026-08-31T16:45:00.000Z"),
    currentStatus: OrderStatus.LOGISTICS_CANCELLED, loadedAt: ordersLoadedAt,
    createdAt: new Date("2026-08-31T16:45:00.000Z"), updatedAt: ordersLoadedAt
  },
  {
    id: orderId(8), storeId, externalId: "LOCAL-ORDER-2026-0008", customerName: "Demo alıcı 08",
    totalAmount: money("34.99"), orderedAt: new Date("2026-09-01T09:05:00.000Z"),
    currentStatus: OrderStatus.BUYER_NOT_HOME, loadedAt: ordersLoadedAt,
    createdAt: new Date("2026-09-01T09:05:00.000Z"), updatedAt: ordersLoadedAt
  },
  {
    id: orderId(9), storeId, externalId: "LOCAL-ORDER-2026-0009", customerName: "Demo alıcı 09",
    totalAmount: money("79.80"), orderedAt: new Date("2026-09-02T10:10:00.000Z"),
    currentStatus: OrderStatus.AT_PUDO, loadedAt: ordersLoadedAt,
    createdAt: new Date("2026-09-02T10:10:00.000Z"), updatedAt: ordersLoadedAt
  },
  {
    id: orderId(10), storeId, externalId: "LOCAL-ORDER-2026-0010", customerName: "Demo alıcı 10",
    totalAmount: money("64.39"), orderedAt: new Date("2026-09-03T08:15:00.000Z"),
    currentStatus: OrderStatus.RETURNED, loadedAt: ordersLoadedAt,
    createdAt: new Date("2026-09-03T08:15:00.000Z"), updatedAt: ordersLoadedAt
  }
];

const orderItems: Prisma.OrderItemUncheckedCreateInput[] = [
  { id: orderItemId(1), orderId: orderId(1), productId: productId(1), productExternalId: "DEMO-P-1001", productName: "Aster Wireless Mouse", imageUrl: null, quantity: 1, unitPrice: money("24.49") },
  { id: orderItemId(2), orderId: orderId(1), productId: productId(10), productExternalId: "DEMO-P-1010", productName: "Luma Cable Organizer", imageUrl: null, quantity: 2, unitPrice: money("12.00") },
  { id: orderItemId(3), orderId: orderId(2), productId: productId(11), productExternalId: "DEMO-P-1011", productName: "Aster Portable SSD 1 TB", imageUrl: null, quantity: 1, unitPrice: money("109.49") },
  { id: orderItemId(4), orderId: orderId(3), productId: productId(4), productExternalId: "DEMO-P-1004", productName: "Aster 65W Charger", imageUrl: null, quantity: 1, unitPrice: money("44.90") },
  { id: orderItemId(5), orderId: orderId(3), productId: productId(10), productExternalId: "DEMO-P-1010", productName: "Luma Cable Organizer", imageUrl: null, quantity: 3, unitPrice: money("12.00") },
  { id: orderItemId(6), orderId: orderId(4), productId: productId(8), productExternalId: "DEMO-P-1008", productName: "Caspian Noise-Isolating Earbuds", imageUrl: null, quantity: 2, unitPrice: money("19.49") },
  { id: orderItemId(7), orderId: orderId(5), productId: productId(12), productExternalId: "DEMO-P-1012", productName: "Nova Full HD Webcam", imageUrl: null, quantity: 1, unitPrice: money("52.99") },
  { id: orderItemId(8), orderId: orderId(5), productId: productId(1), productExternalId: "DEMO-P-1001", productName: "Aster Wireless Mouse", imageUrl: null, quantity: 1, unitPrice: money("24.49") },
  { id: orderItemId(9), orderId: orderId(6), productId: productId(5), productExternalId: "DEMO-P-1005", productName: "Luma Desk Lamp", imageUrl: null, quantity: 1, unitPrice: money("31.50") },
  { id: orderItemId(10), orderId: orderId(7), productId: productId(2), productExternalId: "DEMO-P-1002", productName: "Luma Mechanical Keyboard", imageUrl: null, quantity: 1, unitPrice: money("89.00") },
  { id: orderItemId(11), orderId: orderId(8), productId: productId(7), productExternalId: "DEMO-P-1007", productName: "Nova Laptop Stand", imageUrl: null, quantity: 1, unitPrice: money("34.99") },
  { id: orderItemId(12), orderId: orderId(9), productId: productId(3), productExternalId: "DEMO-P-1003", productName: "Nova USB-C Hub", imageUrl: null, quantity: 2, unitPrice: money("39.90") },
  { id: orderItemId(13), orderId: orderId(10), productId: productId(4), productExternalId: "DEMO-P-1004", productName: "Aster 65W Charger", imageUrl: null, quantity: 1, unitPrice: money("44.90") },
  { id: orderItemId(14), orderId: orderId(10), productId: productId(8), productExternalId: "DEMO-P-1008", productName: "Caspian Noise-Isolating Earbuds", imageUrl: null, quantity: 1, unitPrice: money("19.49") }
];

const statusHistoryEntry = (
  id: number,
  order: number,
  status: OrderStatus,
  occurredAt: string
): Prisma.OrderStatusHistoryUncheckedCreateInput => ({
  id: orderHistoryId(id),
  orderId: orderId(order),
  status,
  occurredAt: new Date(occurredAt)
});

const orderStatusHistory: Prisma.OrderStatusHistoryUncheckedCreateInput[] = [
  statusHistoryEntry(1, 1, OrderStatus.NEW, "2026-08-25T10:15:00.000Z"),
  statusHistoryEntry(2, 2, OrderStatus.NEW, "2026-08-26T11:20:00.000Z"),
  statusHistoryEntry(3, 2, OrderStatus.CUSTOMER_CONFIRMED, "2026-08-26T12:00:00.000Z"),
  statusHistoryEntry(4, 2, OrderStatus.PACKAGING, "2026-08-26T13:10:00.000Z"),
  statusHistoryEntry(5, 3, OrderStatus.NEW, "2026-08-27T12:25:00.000Z"),
  statusHistoryEntry(6, 3, OrderStatus.CUSTOMER_CONFIRMED, "2026-08-27T12:55:00.000Z"),
  statusHistoryEntry(7, 3, OrderStatus.PACKED, "2026-08-27T14:00:00.000Z"),
  statusHistoryEntry(8, 3, OrderStatus.ACCEPTED_FOR_DELIVERY, "2026-08-28T07:30:00.000Z"),
  statusHistoryEntry(9, 3, OrderStatus.WITH_COURIER, "2026-08-28T09:00:00.000Z"),
  statusHistoryEntry(10, 4, OrderStatus.NEW, "2026-08-28T13:30:00.000Z"),
  statusHistoryEntry(11, 4, OrderStatus.PACKED, "2026-08-28T15:00:00.000Z"),
  statusHistoryEntry(12, 4, OrderStatus.WITH_COURIER, "2026-08-29T08:30:00.000Z"),
  statusHistoryEntry(13, 4, OrderStatus.DELIVERED, "2026-08-29T12:45:00.000Z"),
  statusHistoryEntry(14, 5, OrderStatus.NEW, "2026-08-29T14:35:00.000Z"),
  statusHistoryEntry(15, 5, OrderStatus.PACKED, "2026-08-29T16:00:00.000Z"),
  statusHistoryEntry(16, 5, OrderStatus.DELIVERED, "2026-08-30T11:00:00.000Z"),
  statusHistoryEntry(17, 5, OrderStatus.COMPLETED, "2026-08-30T12:00:00.000Z"),
  statusHistoryEntry(18, 6, OrderStatus.NEW, "2026-08-30T15:40:00.000Z"),
  statusHistoryEntry(19, 6, OrderStatus.CUSTOMER_CANCELLED, "2026-08-30T16:05:00.000Z"),
  statusHistoryEntry(20, 7, OrderStatus.NEW, "2026-08-31T16:45:00.000Z"),
  statusHistoryEntry(21, 7, OrderStatus.PACKAGING, "2026-08-31T17:10:00.000Z"),
  statusHistoryEntry(22, 7, OrderStatus.LOGISTICS_CANCELLED, "2026-09-01T08:00:00.000Z"),
  statusHistoryEntry(23, 8, OrderStatus.NEW, "2026-09-01T09:05:00.000Z"),
  statusHistoryEntry(24, 8, OrderStatus.WITH_COURIER, "2026-09-02T08:20:00.000Z"),
  statusHistoryEntry(25, 8, OrderStatus.BUYER_NOT_HOME, "2026-09-02T12:30:00.000Z"),
  statusHistoryEntry(26, 9, OrderStatus.NEW, "2026-09-02T10:10:00.000Z"),
  statusHistoryEntry(27, 9, OrderStatus.PACKED, "2026-09-02T12:00:00.000Z"),
  statusHistoryEntry(28, 9, OrderStatus.ON_WAY_TO_PUDO, "2026-09-03T07:45:00.000Z"),
  statusHistoryEntry(29, 9, OrderStatus.AT_PUDO, "2026-09-03T09:00:00.000Z"),
  statusHistoryEntry(30, 10, OrderStatus.NEW, "2026-09-03T08:15:00.000Z"),
  statusHistoryEntry(31, 10, OrderStatus.WITH_COURIER, "2026-09-03T08:40:00.000Z"),
  statusHistoryEntry(32, 10, OrderStatus.DELIVERED, "2026-09-03T09:00:00.000Z"),
  statusHistoryEntry(33, 10, OrderStatus.RETURNED, "2026-09-03T09:20:00.000Z")
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

    for (const catalogProduct of catalogProducts) {
      const { id, ...update } = catalogProduct;
      await tx.catalogProduct.upsert({ where: { id }, create: catalogProduct, update });
    }

    for (const product of products) {
      const { id, ...update } = product;
      await tx.product.upsert({ where: { id }, create: product, update });
    }

    // Replace only this seed's fixed order IDs so reruns cannot remove local user-created orders.
    await tx.order.deleteMany({ where: { id: { in: orders.map((order) => order.id) } } });
    await tx.order.createMany({ data: orders });
    await tx.orderItem.createMany({ data: orderItems });
    await tx.orderStatusHistory.createMany({ data: orderStatusHistory });

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
      botPriceSource: BotPriceSource.BBU,
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

  console.log(`Seeded 1 store, ${catalogProducts.length} catalog products, ${products.length} products, ${orders.length} local orders, ${offers.length} offers, ${priceChanges.length} price changes, ${botRuns.length} bot runs, and 1 settings record.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
