import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { Prisma, PrismaClient } from "@prisma/client";
import { buildApp } from "./app.js";

interface CatalogProductDto {
  id: string;
  externalId: string;
  name: string;
  barcode: string | null;
  mpn: string | null;
  defaultPrice: string;
  active: boolean;
  alreadyAdded: boolean;
}

interface CatalogProductCollection {
  data: CatalogProductDto[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

interface AddedProductCollection {
  data: Array<{
    id: string;
    externalId: string;
    currentPrice: string | null;
    previousPrice: string | null;
    marketplacePrice: string | null;
    botEnabled: boolean;
    normalizedStatus: string;
    sourceUpdatedAt: string | null;
  }>;
  addedCount: number;
}

interface ErrorResponse {
  error: { code: string; message: string };
}

export async function runCatalogApiTest() {
  const prisma = new PrismaClient();
  const token = randomUUID();
  const catalogProductIds = [randomUUID(), randomUUID()];
  const externalIds = [`TEST-CATALOG-${token}-1`, `TEST-CATALOG-${token}-2`];
  const barcode = `TEST-BARCODE-${token}`;
  const mpn = `TEST-MPN-${token}`;
  let activeStoreId: string | undefined;
  let app: ReturnType<typeof buildApp> | undefined;

  try {
    const activeStore = await prisma.store.findFirst({
      where: { active: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true }
    });
    assert.ok(activeStore, "Catalog test requires an active local store");
    activeStoreId = activeStore.id;

    await prisma.catalogProduct.createMany({
      data: [
        {
          id: catalogProductIds[0]!,
          externalId: externalIds[0]!,
          name: `Disposable Catalog Probe ${token}`,
          imageUrl: null,
          category: "Test Fixtures",
          barcode,
          mpn,
          defaultPrice: new Prisma.Decimal("19.98"),
          active: true
        },
        {
          id: catalogProductIds[1]!,
          externalId: externalIds[1]!,
          name: `Disposable Atomicity Probe ${token}`,
          imageUrl: null,
          category: "Test Fixtures",
          barcode: null,
          mpn: null,
          defaultPrice: new Prisma.Decimal("7.40"),
          active: true
        }
      ]
    });

    app = buildApp({ logger: false, prisma });
    await app.ready();

    const getJson = async <T>(url: string, status = 200) => {
      const response = await app!.inject({ method: "GET", url });
      assert.equal(response.statusCode, status, `${url} returned ${response.statusCode}`);
      return response.json<T>();
    };

    for (const search of [
      `Disposable Catalog Probe ${token}`,
      externalIds[0]!,
      barcode,
      mpn
    ]) {
      const result = await getJson<CatalogProductCollection>(
        `/api/catalog-products?search=${encodeURIComponent(search)}&page=1&pageSize=1`
      );
      assert.equal(result.pagination.page, 1);
      assert.equal(result.pagination.pageSize, 1);
      const catalogProduct = result.data.find((product) => product.id === catalogProductIds[0]);
      assert.ok(catalogProduct, `Catalog search did not find disposable product by ${search}`);
      assert.equal(catalogProduct.defaultPrice, "19.98");
      assert.equal(catalogProduct.alreadyAdded, false);
    }

    await getJson("/api/catalog-products", 400);
    await getJson("/api/catalog-products?search=%20%20%20", 400);
    await getJson(`/api/catalog-products?search=${"a".repeat(101)}`, 400);
    await getJson("/api/catalog-products?search=probe&page=0", 400);
    await getJson("/api/catalog-products?search=probe&unknown=true", 400);

    const addResponse = await app.inject({
      method: "POST",
      url: "/api/products/from-catalog",
      payload: { catalogProductIds: [catalogProductIds[0]] }
    });
    assert.equal(addResponse.statusCode, 201);
    const added = addResponse.json<AddedProductCollection>();
    assert.equal(added.addedCount, 1);
    assert.equal(added.data[0]?.externalId, externalIds[0]);
    assert.equal(added.data[0]?.currentPrice, "19.98");
    assert.equal(added.data[0]?.previousPrice, null);
    assert.equal(added.data[0]?.marketplacePrice, null);
    assert.equal(added.data[0]?.botEnabled, false);
    assert.equal(added.data[0]?.normalizedStatus, "DRAFT");
    assert.equal(added.data[0]?.sourceUpdatedAt, null);

    const afterAdd = await getJson<CatalogProductCollection>(
      `/api/catalog-products?search=${encodeURIComponent(externalIds[0]!)}`
    );
    assert.equal(afterAdd.data[0]?.alreadyAdded, true);

    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/api/products/from-catalog",
      payload: { catalogProductIds: [catalogProductIds[0]] }
    });
    assert.equal(duplicateResponse.statusCode, 409);
    assert.equal(duplicateResponse.json<ErrorResponse>().error.code, "PRODUCT_ALREADY_ADDED");

    const atomicConflictResponse = await app.inject({
      method: "POST",
      url: "/api/products/from-catalog",
      payload: { catalogProductIds }
    });
    assert.equal(atomicConflictResponse.statusCode, 409);
    assert.equal(
      await prisma.product.count({
        where: { storeId: activeStoreId, externalId: externalIds[1] }
      }),
      0,
      "A mixed conflicting batch must not add any new product"
    );

    for (const payload of [
      { catalogProductIds: [] },
      { catalogProductIds: [catalogProductIds[0], catalogProductIds[0]] },
      { catalogProductIds: ["not-a-uuid"] },
      { catalogProductIds: [catalogProductIds[1]], unexpected: true },
      { catalogProductIds: [123] }
    ]) {
      const validationResponse: { statusCode: number } = await app!.inject({
        method: "POST",
        url: "/api/products/from-catalog",
        payload
      });
      assert.equal(validationResponse.statusCode, 400);
    }

    console.log(
      "Catalog API test passed: search validation, money serialization, atomic creation, and duplicate prevention verified."
    );
  } finally {
    if (activeStoreId) {
      await prisma.product.deleteMany({
        where: { storeId: activeStoreId, externalId: { in: externalIds } }
      });
    }
    await prisma.catalogProduct.deleteMany({ where: { id: { in: catalogProductIds } } });

    if (app) {
      await app.close();
    } else {
      await prisma.$disconnect();
    }
  }
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  runCatalogApiTest().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
