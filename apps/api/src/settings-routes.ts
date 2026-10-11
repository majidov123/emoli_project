import { BotPriceSource, Prisma, type PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { serializeBotSettings } from "./serializers.js";
import { registerSettingsOperationRoutes } from "./settings-operation-routes.js";

interface SettingsPatchBody {
  botEnabled?: boolean;
  botPriceSource?: BotPriceSource;
  checkIntervalMinutes?: number;
  undercutAmount?: string;
  allowProductsWithoutMinimumPrice?: boolean;
  friendStoreExternalId?: string | null;
}

const decimalStringPattern = "^(?:0|[1-9]\\d{0,9})(?:\\.\\d{1,2})?$";
const settingsFields = new Set([
  "botEnabled",
  "botPriceSource",
  "checkIntervalMinutes",
  "undercutAmount",
  "allowProductsWithoutMinimumPrice",
  "friendStoreExternalId"
]);

const settingsFieldRequirements = [...settingsFields].map((field) => ({ required: [field] }));

const settingsPatchSchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  anyOf: settingsFieldRequirements,
  properties: {
    botEnabled: { type: "boolean" },
    botPriceSource: { type: "string", enum: Object.values(BotPriceSource) },
    checkIntervalMinutes: { type: "integer", minimum: 1, maximum: 10_080 },
    undercutAmount: {
      type: "string",
      pattern: decimalStringPattern
    },
    allowProductsWithoutMinimumPrice: { type: "boolean" },
    friendStoreExternalId: {
      anyOf: [
        { type: "string", maxLength: 200 },
        { type: "null" }
      ]
    }
  }
} as const;

export function registerSettingsRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.patch<{ Body: SettingsPatchBody }>(
    "/api/settings",
    {
      schema: { body: settingsPatchSchema },
      preValidation: async (request, reply) => {
        const body = request.body as unknown;
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
          return;
        }

        const values = body as Record<string, unknown>;
        const hasUnexpectedField = Object.keys(values).some((field) => !settingsFields.has(field));
        const hasInvalidType =
          ("botEnabled" in values && typeof values.botEnabled !== "boolean") ||
          ("botPriceSource" in values &&
            (typeof values.botPriceSource !== "string" ||
              !Object.values(BotPriceSource).includes(values.botPriceSource as BotPriceSource))) ||
          ("checkIntervalMinutes" in values && typeof values.checkIntervalMinutes !== "number") ||
          ("undercutAmount" in values && typeof values.undercutAmount !== "string") ||
          ("allowProductsWithoutMinimumPrice" in values &&
            typeof values.allowProductsWithoutMinimumPrice !== "boolean") ||
          ("friendStoreExternalId" in values &&
            values.friendStoreExternalId !== null &&
            typeof values.friendStoreExternalId !== "string");

        if (hasUnexpectedField || hasInvalidType) {
          await reply.code(400).send({
            error: { code: "VALIDATION_ERROR", message: "Invalid request" }
          });
        }
      }
    },
    async (request, reply) => {
      let normalizedFriendStoreExternalId: string | null | undefined;
      if (request.body.friendStoreExternalId !== undefined) {
        try {
          normalizedFriendStoreExternalId = normalizeFriendStoreExternalId(
            request.body.friendStoreExternalId
          );
        } catch {
          return reply.code(400).send({
            error: {
              code: "INVALID_FRIEND_STORE",
              message: "Friend store must be a valid external ID or birmarket.az URL"
            }
          });
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        const settings = await tx.botSettings.findFirst({
          orderBy: { createdAt: "asc" }
        });
        if (!settings) return null;

        const data: Prisma.BotSettingsUpdateInput = {};

        if (request.body.botEnabled !== undefined) {
          data.botEnabled = request.body.botEnabled;
        }
        if (request.body.botPriceSource !== undefined) {
          data.botPriceSource = request.body.botPriceSource;
        }
        if (request.body.checkIntervalMinutes !== undefined) {
          data.checkIntervalMinutes = request.body.checkIntervalMinutes;
        }
        if (request.body.undercutAmount !== undefined) {
          data.undercutAmount = new Prisma.Decimal(request.body.undercutAmount);
        }
        if (request.body.allowProductsWithoutMinimumPrice !== undefined) {
          data.allowProductsWithoutMinimumPrice = request.body.allowProductsWithoutMinimumPrice;
        }
        if (request.body.friendStoreExternalId !== undefined) {
          data.friendStoreExternalId = normalizedFriendStoreExternalId ?? null;
        }

        const result = await tx.botSettings.update({
          where: { id: settings.id },
          data
        });

        if (request.body.friendStoreExternalId !== undefined) {
          const store = await tx.store.findFirst({
            where: { active: true },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: { id: true }
          });
          if (store) {
            await tx.competitorOffer.updateMany({
              where: { product: { storeId: store.id } },
              data: { excludedAsFriendStore: false }
            });
            if (normalizedFriendStoreExternalId) {
              await tx.competitorOffer.updateMany({
                where: {
                  product: { storeId: store.id },
                  sellerExternalId: {
                    equals: normalizedFriendStoreExternalId,
                    mode: "insensitive"
                  }
                },
                data: { excludedAsFriendStore: true }
              });
            }
          }
        }

        return result;
      });

      if (!updated) {
        return reply.code(404).send({
          error: { code: "SETTINGS_NOT_FOUND", message: "Bot settings not found" }
        });
      }

      return { data: serializeBotSettings(updated) };
    }
  );

  registerSettingsOperationRoutes(app, prisma);
}

export function normalizeFriendStoreExternalId(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  let externalId = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
    if (url.protocol !== "https:" || hostname !== "birmarket.az") throw new Error("Invalid host");
    const queryId = ["sellerId", "storeId", "merchantId", "shopId"]
      .map((key) => url.searchParams.get(key)?.trim())
      .find(Boolean);
    const segments = url.pathname.split("/").filter(Boolean);
    externalId = queryId ?? decodeURIComponent(segments.at(-1) ?? "").trim();
  }

  if (
    externalId.length < 1 ||
    externalId.length > 200 ||
    !/^[^\s/?#]+$/.test(externalId)
  ) {
    throw new Error("Invalid external ID");
  }
  return externalId;
}
