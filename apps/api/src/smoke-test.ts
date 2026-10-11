import assert from "node:assert/strict";

const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const seededProductId = "10000000-0000-4000-8000-000000000001";

interface ProductDto extends Record<string, unknown> {
  id: string;
  name: string;
  sku: string | null;
  externalId: string;
  normalizedStatus: string;
  category: string | null;
  botEnabled: boolean;
  stock: number;
  minimumPrice: string | null;
}

interface Collection<T> {
  data: T[];
}

interface ProductCollection extends Collection<ProductDto> {
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

async function getJson<T>(path: string, expectedStatus = 200): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.status, expectedStatus, `${path} returned ${response.status}`);
  return (await response.json()) as T;
}

function assertMoneyFields(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = record[field];
    assert.ok(value === null || typeof value === "string", `${field} must be a string or null`);
    if (typeof value === "string") {
      assert.match(value, /^\d+\.\d{2}$/, `${field} must have two decimal places`);
    }
  }
}

async function main() {
  assert.deepEqual(await getJson("/api/health"), { status: "ok" });

  const stores = await getJson<Collection<Record<string, unknown>>>("/api/stores");
  assert.equal(stores.data.length, 1);
  assert.ok(Number(stores.data[0]?.productCount) >= 12);

  const products = await getJson<ProductCollection>("/api/products?pageSize=100");
  assert.ok(products.data.length >= 12);
  assert.equal(products.pagination.total, products.data.length);
  for (const product of products.data) {
    assertMoneyFields(product, [
      "previousPrice", "currentPrice", "marketplacePrice", "competitorLowestPrice",
      "minimumPrice", "maximumPrice"
    ]);
  }

  const firstPage = await getJson<ProductCollection>("/api/products?page=1&pageSize=5");
  const secondPage = await getJson<ProductCollection>("/api/products?page=2&pageSize=5");
  assert.equal(firstPage.data.length, 5);
  assert.equal(secondPage.data.length, 5);
  assert.equal(firstPage.data.some((first) => secondPage.data.some((second) => second.id === first.id)), false);

  const searches = await Promise.all([
    getJson<ProductCollection>("/api/products?search=wireless"),
    getJson<ProductCollection>("/api/products?search=ast-mou-01"),
    getJson<ProductCollection>("/api/products?search=demo-p-1001")
  ]);
  for (const result of searches) {
    assert.equal(result.data.some((product) => product.id === seededProductId), true);
  }

  const active = await getJson<ProductCollection>("/api/products?status=ACTIVE");
  assert.ok(active.data.length > 0 && active.data.every((product) => product.normalizedStatus === "ACTIVE"));
  const accessories = await getJson<ProductCollection>("/api/products?category=accessories");
  assert.ok(accessories.data.length > 0 && accessories.data.every((product) => product.category === "Accessories"));

  const categories = await getJson<Collection<string>>("/api/products/categories");
  const seededCategories = [
    "Accessories",
    "Audio",
    "Cameras",
    "Chargers",
    "Home Office",
    "Smart Home",
    "Storage"
  ];
  assert.ok(seededCategories.every((category) => categories.data.includes(category)));
  assert.equal(new Set(categories.data).size, categories.data.length);

  const botDisabled = await getJson<ProductCollection>("/api/products?botEnabled=false");
  assert.ok(botDisabled.data.length > 0 && botDisabled.data.every((product) => !product.botEnabled));
  const readyBotProducts = await getJson<ProductCollection>("/api/products?status=READY&botEnabled=true");
  assert.ok(readyBotProducts.data.length > 0 && readyBotProducts.data.every((product) => product.normalizedStatus === "READY" && product.botEnabled));

  const outOfStock = await getJson<ProductCollection>("/api/products?stockBucket=OUT");
  assert.ok(outOfStock.pagination.total >= 1);
  assert.ok(outOfStock.data.every((product) => product.stock === 0));

  const lowStock = await getJson<ProductCollection>("/api/products?stockBucket=LOW");
  assert.ok(lowStock.pagination.total >= 1);
  assert.ok(lowStock.data.every((product) => product.stock >= 1 && product.stock <= 5));

  const inStock = await getJson<ProductCollection>("/api/products?stockBucket=IN_STOCK");
  assert.ok(inStock.pagination.total >= 10);
  assert.ok(inStock.data.every((product) => product.stock > 5));

  const withMinimumPrice = await getJson<ProductCollection>("/api/products?hasMinimumPrice=true");
  assert.ok(withMinimumPrice.pagination.total >= 11);
  assert.ok(withMinimumPrice.data.every((product) => product.minimumPrice !== null));

  const withoutMinimumPrice = await getJson<ProductCollection>("/api/products?hasMinimumPrice=false");
  assert.ok(withoutMinimumPrice.pagination.total >= 1);
  assert.ok(withoutMinimumPrice.data.every((product) => product.minimumPrice === null));

  const inStockWithoutMinimumPrice = await getJson<ProductCollection>(
    "/api/products?stockBucket=IN_STOCK&hasMinimumPrice=false"
  );
  assert.equal(inStockWithoutMinimumPrice.pagination.total, 1);
  assert.equal(inStockWithoutMinimumPrice.data[0]?.externalId, "DEMO-P-1010");

  const detail = await getJson<{ data: ProductDto & { competitorOffers: Record<string, unknown>[]; priceChanges: Record<string, unknown>[] } }>(`/api/products/${seededProductId}`);
  assert.equal(detail.data.competitorOffers.length, 3);
  assert.ok(detail.data.priceChanges.length > 0);
  detail.data.competitorOffers.forEach((offer) => assertMoneyFields(offer, ["price"]));
  detail.data.priceChanges.forEach((change) => assertMoneyFields(change, ["oldPrice", "newPrice", "competitorPrice", "minimumPrice", "maximumPrice"]));

  const settings = await getJson<{ data: Record<string, unknown> }>("/api/settings");
  assert.equal(settings.data.undercutAmount, "0.01");

  const runs = await getJson<Collection<Record<string, unknown>>>("/api/bot-runs");
  assert.equal(runs.data.length, 4);

  const changes = await getJson<Collection<Record<string, unknown>>>("/api/price-changes");
  assert.equal(changes.data.length, 5);
  changes.data.forEach((change) => assertMoneyFields(change, ["oldPrice", "newPrice", "competitorPrice", "minimumPrice", "maximumPrice"]));

  await getJson("/api/products?page=0", 400);
  await getJson("/api/products?status=NOT_A_STATUS", 400);
  await getJson("/api/products?stockBucket=out", 400);
  await getJson("/api/products?stockBucket=INVALID", 400);
  await getJson("/api/products?hasMinimumPrice=maybe", 400);
  await getJson("/api/products/not-a-uuid", 400);
  await getJson("/api/products/90000000-0000-4000-8000-000000000001", 404);

  console.log("API smoke test passed: all read-only endpoints, filters, pagination, errors, and money serialization verified.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
