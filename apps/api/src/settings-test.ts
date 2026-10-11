import assert from "node:assert/strict";
import { Prisma, PrismaClient } from "@prisma/client";
import { buildApp } from "./app.js";

interface SettingsDto {
  id: string;
  botEnabled: boolean;
  botPriceSource: "BBU" | "SITE";
  checkIntervalMinutes: number;
  undercutAmount: string;
  allowProductsWithoutMinimumPrice: boolean;
  friendStoreExternalId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SettingsResponse {
  data: SettingsDto;
}

const mutableFields = (settings: SettingsDto) => ({
  botEnabled: settings.botEnabled,
  botPriceSource: settings.botPriceSource,
  checkIntervalMinutes: settings.checkIntervalMinutes,
  undercutAmount: settings.undercutAmount,
  allowProductsWithoutMinimumPrice: settings.allowProductsWithoutMinimumPrice,
  friendStoreExternalId: settings.friendStoreExternalId
});

async function main() {
  const prisma = new PrismaClient();
  const app = buildApp({ logger: false, prisma });
  let original: SettingsDto | undefined;
  let originalOfferFlags: Array<{ id: string; excludedAsFriendStore: boolean }> = [];

  try {
    await app.ready();

    const initialResponse = await app.inject({ method: "GET", url: "/api/settings" });
    assert.equal(initialResponse.statusCode, 200);
    original = initialResponse.json<SettingsResponse>().data;
    const activeStore = await prisma.store.findFirst({
      where: { active: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true }
    });
    if (activeStore) {
      originalOfferFlags = await prisma.competitorOffer.findMany({
        where: { product: { storeId: activeStore.id } },
        select: { id: true, excludedAsFriendStore: true }
      });
    }
    const friendCandidate = activeStore
      ? await prisma.competitorOffer.findFirst({
          where: {
            product: { storeId: activeStore.id },
            sellerExternalId: { not: null }
          },
          orderBy: [{ observedAt: "desc" }, { id: "asc" }],
          select: { id: true, sellerExternalId: true }
        })
      : null;
    assert.ok(friendCandidate?.sellerExternalId, "Settings test requires a fictional seller offer");

    const fullUpdateResponse = await app.inject({
      method: "PATCH",
      url: "/api/settings",
      payload: {
        botEnabled: !original.botEnabled,
        botPriceSource: original.botPriceSource === "BBU" ? "SITE" : "BBU",
        checkIntervalMinutes: original.checkIntervalMinutes === 30 ? 45 : 30,
        undercutAmount: "0.1",
        allowProductsWithoutMinimumPrice: !original.allowProductsWithoutMinimumPrice,
        friendStoreExternalId: `https://birmarket.az/store/${encodeURIComponent(friendCandidate.sellerExternalId)}/`
      }
    });
    assert.equal(fullUpdateResponse.statusCode, 200);

    const fullUpdate = fullUpdateResponse.json<SettingsResponse>().data;
    assert.equal(fullUpdate.botEnabled, !original.botEnabled);
    assert.equal(fullUpdate.botPriceSource, original.botPriceSource === "BBU" ? "SITE" : "BBU");
    assert.equal(fullUpdate.checkIntervalMinutes, original.checkIntervalMinutes === 30 ? 45 : 30);
    assert.equal(fullUpdate.undercutAmount, "0.10");
    assert.equal(
      fullUpdate.allowProductsWithoutMinimumPrice,
      !original.allowProductsWithoutMinimumPrice
    );
    assert.equal(fullUpdate.friendStoreExternalId, friendCandidate.sellerExternalId);
    assert.equal(
      (await prisma.competitorOffer.findUnique({ where: { id: friendCandidate.id } }))
        ?.excludedAsFriendStore,
      true
    );

    const partialUpdateResponse = await app.inject({
      method: "PATCH",
      url: "/api/settings",
      payload: { undercutAmount: "12.3" }
    });
    assert.equal(partialUpdateResponse.statusCode, 200);

    const partialUpdate = partialUpdateResponse.json<SettingsResponse>().data;
    assert.equal(partialUpdate.undercutAmount, "12.30");
    assert.equal(partialUpdate.botEnabled, fullUpdate.botEnabled);
    assert.equal(partialUpdate.botPriceSource, fullUpdate.botPriceSource);
    assert.equal(partialUpdate.checkIntervalMinutes, fullUpdate.checkIntervalMinutes);
    assert.equal(
      partialUpdate.allowProductsWithoutMinimumPrice,
      fullUpdate.allowProductsWithoutMinimumPrice
    );
    assert.equal(partialUpdate.friendStoreExternalId, fullUpdate.friendStoreExternalId);

    const clearFriendStoreResponse = await app.inject({
      method: "PATCH",
      url: "/api/settings",
      payload: { friendStoreExternalId: "   " }
    });
    assert.equal(clearFriendStoreResponse.statusCode, 200);
    const lastValidSettings = clearFriendStoreResponse.json<SettingsResponse>().data;
    assert.equal(lastValidSettings.friendStoreExternalId, null);
    assert.equal(
      await prisma.competitorOffer.count({
        where: {
          excludedAsFriendStore: true,
          ...(activeStore ? { product: { storeId: activeStore.id } } : {})
        }
      }),
      0
    );

    const invalidPayloads: Record<string, unknown>[] = [
      {},
      { unexpectedField: true },
      { botEnabled: true, unexpectedField: true },
      { botEnabled: "true" },
      { botPriceSource: "MARKETPLACE" },
      { checkIntervalMinutes: 0 },
      { checkIntervalMinutes: "30" },
      { checkIntervalMinutes: 1.5 },
      { checkIntervalMinutes: 10_081 },
      { undercutAmount: 0.01 },
      { undercutAmount: "-0.01" },
      { undercutAmount: "0.001" },
      { undercutAmount: "1e-2" },
      { undercutAmount: "10000000000.00" },
      { allowProductsWithoutMinimumPrice: "false" },
      { friendStoreExternalId: 123 },
      { friendStoreExternalId: "x".repeat(201) }
    ];

    for (const payload of invalidPayloads) {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/settings",
        payload
      });
      assert.equal(
        response.statusCode,
        400,
        `Expected validation failure for ${JSON.stringify(payload)}, received ${response.statusCode}`
      );
      assert.equal(response.json<{ error: { code: string } }>().error.code, "VALIDATION_ERROR");
    }

    const afterInvalidResponses = await app.inject({ method: "GET", url: "/api/settings" });
    assert.equal(afterInvalidResponses.statusCode, 200);
    assert.deepEqual(
      mutableFields(afterInvalidResponses.json<SettingsResponse>().data),
      mutableFields(lastValidSettings),
      "Rejected requests must not mutate settings"
    );

    console.log("Settings API test passed: partial updates, validation, and decimal strings verified.");
  } finally {
    if (original) {
      const originalSettings = original;
      await prisma.$transaction(async (tx) => {
        await tx.botSettings.update({
          where: { id: originalSettings.id },
          data: {
            ...mutableFields(originalSettings),
            undercutAmount: new Prisma.Decimal(originalSettings.undercutAmount),
            updatedAt: new Date(originalSettings.updatedAt)
          }
        });
        for (const offer of originalOfferFlags) {
          await tx.competitorOffer.update({
            where: { id: offer.id },
            data: { excludedAsFriendStore: offer.excludedAsFriendStore }
          });
        }
      });
    }
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
