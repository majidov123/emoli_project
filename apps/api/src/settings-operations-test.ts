import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient, ProductStatus } from "@prisma/client";
import { buildApp } from "./app.js";

interface PreviewChange {
  externalId: string;
  oldPrice: string | null;
  newPrice: string | null;
  oldMinimumPrice: string | null;
  newMinimumPrice: string | null;
  oldMaximumPrice: string | null;
  newMaximumPrice: string | null;
}

interface PreviewResponse {
  data: {
    operation: string;
    matchedCount: number;
    affectedCount: number;
    unchangedCount: number;
    skippedCount: number;
    constrainedCount: number;
    previewToken: string;
    changes: PreviewChange[];
    truncated: boolean;
  };
}

interface ApplyResponse {
  data: {
    id: string;
    type: string;
    affectedCount: number;
    constrainedCount: number;
    priceChangesCreated: number;
  };
}

interface ErrorResponse {
  error: { code: string; message: string };
}

async function main() {
  const prisma = new PrismaClient();
  const app = buildApp({ logger: false, prisma });
  const token = randomUUID();
  const storeId = randomUUID();
  const ids = {
    auto: randomUUID(),
    adjust: randomUUID(),
    upper: randomUUID(),
    increase: randomUUID(),
    import: randomUUID()
  };
  const externalId = (name: keyof typeof ids) => `SETTINGS-TEST-${token}-${name}`;
  const sourceUpdatedAt = new Date("2026-09-01T09:00:00.000Z");

  try {
    await prisma.store.create({
      data: {
        id: storeId,
        name: `Disposable Settings Store ${token}`,
        platform: `SETTINGS_TEST_${token}`,
        externalId: token,
        active: true,
        createdAt: new Date("2000-01-01T00:00:00.000Z")
      }
    });
    await prisma.product.createMany({
      data: [
        {
          id: ids.auto,
          storeId,
          externalId: externalId("auto"),
          name: "Disposable automatic-limit product",
          currentPrice: new Prisma.Decimal("100.00"),
          marketplacePrice: new Prisma.Decimal("91.25"),
          maximumPrice: new Prisma.Decimal("150.00"),
          sourceUpdatedAt,
          normalizedStatus: ProductStatus.ACTIVE
        },
        {
          id: ids.adjust,
          storeId,
          externalId: externalId("adjust"),
          name: "Disposable below-limit product",
          currentPrice: new Prisma.Decimal("80.00"),
          marketplacePrice: new Prisma.Decimal("79.00"),
          minimumPrice: new Prisma.Decimal("90.00"),
          maximumPrice: new Prisma.Decimal("120.00"),
          sourceUpdatedAt,
          normalizedStatus: ProductStatus.ACTIVE
        },
        {
          id: ids.upper,
          storeId,
          externalId: externalId("upper"),
          name: "Disposable above-upper product",
          currentPrice: new Prisma.Decimal("130.00"),
          marketplacePrice: new Prisma.Decimal("125.00"),
          minimumPrice: new Prisma.Decimal("50.00"),
          maximumPrice: new Prisma.Decimal("120.00"),
          sourceUpdatedAt,
          normalizedStatus: ProductStatus.ACTIVE
        },
        {
          id: ids.increase,
          storeId,
          externalId: externalId("increase"),
          name: "Disposable increase product",
          currentPrice: new Prisma.Decimal("50.00"),
          marketplacePrice: new Prisma.Decimal("47.00"),
          minimumPrice: new Prisma.Decimal("20.00"),
          maximumPrice: new Prisma.Decimal("55.00"),
          sourceUpdatedAt,
          normalizedStatus: ProductStatus.ACTIVE
        },
        {
          id: ids.import,
          storeId,
          externalId: externalId("import"),
          name: "Disposable import product",
          currentPrice: new Prisma.Decimal("40.00"),
          marketplacePrice: new Prisma.Decimal("39.00"),
          sourceUpdatedAt,
          normalizedStatus: ProductStatus.DRAFT
        }
      ]
    });

    await app.ready();

    const preview = async (payload: Record<string, unknown>, status = 200) => {
      const response = await app.inject({
        method: "POST",
        url: "/api/settings/operations/preview",
        payload
      });
      assert.equal(response.statusCode, status, response.body);
      return response;
    };
    const apply = async (payload: Record<string, unknown>, previewData: PreviewResponse["data"]) => {
      const response = await app.inject({
        method: "POST",
        url: "/api/settings/operations/apply",
        payload: {
          ...payload,
          previewToken: previewData.previewToken,
          expectedAffectedCount: previewData.affectedCount
        }
      });
      assert.equal(response.statusCode, 201, response.body);
      return response.json<ApplyResponse>().data;
    };

    const automaticPayload = {
      operation: "AUTO_ASSIGN_MINIMUM_LIMITS",
      selection: "WITHOUT_LIMIT",
      percentage: "10"
    };
    const operationsBeforePreview = await prisma.settingsOperation.count({ where: { storeId } });
    const automaticPreview = (await preview(automaticPayload)).json<PreviewResponse>().data;
    assert.equal(automaticPreview.matchedCount, 1);
    assert.equal(automaticPreview.affectedCount, 1);
    assert.equal(automaticPreview.previewToken.length, 64);
    assert.equal(await prisma.settingsOperation.count({ where: { storeId } }), operationsBeforePreview);
    assert.equal(
      (await prisma.product.findUniqueOrThrow({ where: { id: ids.auto } })).minimumPrice,
      null,
      "Preview must not mutate products"
    );
    const automaticApply = await apply(automaticPayload, automaticPreview);
    assert.equal(automaticApply.priceChangesCreated, 0);
    assert.equal(
      (await prisma.product.findUniqueOrThrow({ where: { id: ids.auto } })).minimumPrice?.toFixed(2),
      "90.00"
    );

    const adjustPayload = {
      operation: "ADJUST_PRICES_TO_MINIMUM",
      percentage: "5"
    };
    const zeroAdjustPreview = (await preview({
      operation: "ADJUST_PRICES_TO_MINIMUM",
      percentage: "0"
    })).json<PreviewResponse>().data;
    assert.equal(
      zeroAdjustPreview.changes.find((change) => change.externalId === externalId("adjust"))?.newPrice,
      "90.00",
      "A zero percentage must set a below-limit price exactly to its lower limit"
    );
    const adjustPreview = (await preview(adjustPayload)).json<PreviewResponse>().data;
    const adjustChange = adjustPreview.changes.find((change) => change.externalId === externalId("adjust"));
    assert.equal(adjustChange?.oldPrice, "80.00");
    assert.equal(adjustChange?.newPrice, "94.50");
    const adjustApply = await apply(adjustPayload, adjustPreview);
    assert.equal(adjustApply.priceChangesCreated, 1);

    const upperPayload = {
      operation: "SET_PRICES_TO_MAXIMUM",
      selection: "ABOVE_UPPER"
    };
    const upperPreview = (await preview(upperPayload)).json<PreviewResponse>().data;
    assert.equal(upperPreview.affectedCount, 1);
    const upperApply = await apply(upperPayload, upperPreview);
    assert.equal(upperApply.priceChangesCreated, 1);
    assert.equal(
      (await prisma.product.findUniqueOrThrow({ where: { id: ids.upper } })).currentPrice?.toFixed(2),
      "120.00"
    );

    const increasePayload = { operation: "INCREASE_PRICES", percentage: "20" };
    const increasePreview = (await preview(increasePayload)).json<PreviewResponse>().data;
    assert.equal(increasePreview.matchedCount, 4);
    assert.equal(increasePreview.affectedCount, 3);
    assert.equal(increasePreview.unchangedCount, 1);
    assert.equal(increasePreview.constrainedCount, 1);
    const increaseApply = await apply(increasePayload, increasePreview);
    assert.equal(increaseApply.priceChangesCreated, 3);
    assert.equal(increaseApply.constrainedCount, 1);
    assert.equal(
      (await prisma.product.findUniqueOrThrow({ where: { id: ids.increase } })).currentPrice?.toFixed(2),
      "55.00",
      "Price increases must respect the configured upper limit"
    );

    const importPayload = {
      operation: "IMPORT_LIMITS",
      rows: [{
        externalId: externalId("import"),
        minimumPrice: "10.1",
        maximumPrice: "60"
      }]
    };
    const importPreview = (await preview(importPayload)).json<PreviewResponse>().data;
    assert.equal(importPreview.changes[0]?.newMinimumPrice, "10.10");
    assert.equal(importPreview.changes[0]?.newMaximumPrice, "60.00");
    const importApply = await apply(importPayload, importPreview);
    assert.equal(importApply.priceChangesCreated, 0);

    const badImport = await preview({
      operation: "IMPORT_LIMITS",
      rows: [{ externalId: externalId("import"), minimumPrice: "70", maximumPrice: "60" }]
    }, 422);
    assert.equal(badImport.json<ErrorResponse>().error.code, "INVALID_PRICE_BOUNDS");

    const numericPercentage = await preview({
      operation: "INCREASE_PRICES",
      percentage: 10
    }, 400);
    assert.equal(numericPercentage.json<ErrorResponse>().error.code, "VALIDATION_ERROR");

    const stalePreview = (await preview(increasePayload)).json<PreviewResponse>().data;
    await prisma.product.update({
      where: { id: ids.auto },
      data: { name: "Disposable automatic-limit product touched after preview" }
    });
    const staleApply = await app.inject({
      method: "POST",
      url: "/api/settings/operations/apply",
      payload: {
        ...increasePayload,
        previewToken: stalePreview.previewToken,
        expectedAffectedCount: stalePreview.affectedCount
      }
    });
    assert.equal(staleApply.statusCode, 409);
    assert.equal(staleApply.json<ErrorResponse>().error.code, "PREVIEW_STALE");

    assert.equal(await prisma.settingsOperation.count({ where: { storeId } }), 5);
    assert.equal(
      await prisma.priceChange.count({
        where: { product: { storeId }, settingsOperationId: { not: null } }
      }),
      5
    );
    const preservedSourceFields = await prisma.product.findUniqueOrThrow({ where: { id: ids.adjust } });
    assert.equal(preservedSourceFields.marketplacePrice?.toFixed(2), "79.00");
    assert.equal(preservedSourceFields.sourceUpdatedAt?.toISOString(), sourceUpdatedAt.toISOString());

    const summaryResponse = await app.inject({
      method: "GET",
      url: "/api/settings/management-summary"
    });
    assert.equal(summaryResponse.statusCode, 200);
    assert.equal(summaryResponse.json<{ data: { store: { id: string }; totalProducts: number } }>().data.store.id, storeId);
    assert.equal(summaryResponse.json<{ data: { totalProducts: number } }>().data.totalProducts, 5);

    const historyResponse = await app.inject({
      method: "GET",
      url: "/api/settings/history?page=1&pageSize=100"
    });
    assert.equal(historyResponse.statusCode, 200);
    const history = historyResponse.json<{
      data: Array<{ id: string; type: string; operation?: string }>;
      summary: { settingsOperations: { affectedCount: number } };
    }>();
    assert.ok(history.data.some((event) =>
      event.type === "SETTINGS_OPERATION" && event.id === `settings-operation:${importApply.id}`
    ));
    assert.ok(history.summary.settingsOperations.affectedCount >= 7);

    const searchHistoryResponse = await app.inject({
      method: "GET",
      url: `/api/settings/history?page=1&pageSize=20&search=${encodeURIComponent(externalId("adjust"))}`
    });
    assert.equal(searchHistoryResponse.statusCode, 200);
    assert.ok(searchHistoryResponse.json<{ data: Array<{ type: string }> }>().data.length > 0);

    console.log(
      "Settings operations test passed: previews, atomic writes, audits, decimal math, stale confirmation, history, and source-field preservation verified."
    );
  } finally {
    await prisma.settingsOperation.deleteMany({ where: { storeId } });
    await prisma.store.deleteMany({ where: { id: storeId } });
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
