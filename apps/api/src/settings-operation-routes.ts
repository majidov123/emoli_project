import { createHash } from "node:crypto";
import {
  PriceChangeDirection,
  Prisma,
  SettingsOperationType,
  type PrismaClient,
  type Product
} from "@prisma/client";
import type { FastifyInstance, FastifyReply } from "fastify";
import { serializeBotRun, serializePriceChange } from "./serializers.js";

const operationNames = [
  "AUTO_ASSIGN_MINIMUM_LIMITS",
  "ADJUST_PRICES_TO_MINIMUM",
  "SET_PRICES_TO_MAXIMUM",
  "INCREASE_PRICES",
  "IMPORT_LIMITS"
] as const;
const autoLimitSelections = ["ALL", "WITHOUT_LIMIT"] as const;
const upperLimitSelections = ["ALL", "ABOVE_UPPER"] as const;
const decimalStringPattern = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const previewTokenPattern = /^[a-f0-9]{64}$/;
const maxMoney = new Prisma.Decimal("9999999999.99");
const oneHundred = new Prisma.Decimal(100);
const maxPreviewChanges = 100;

type OperationName = (typeof operationNames)[number];
type AutoLimitSelection = (typeof autoLimitSelections)[number];
type UpperLimitSelection = (typeof upperLimitSelections)[number];

interface AutoMinimumInput {
  operation: "AUTO_ASSIGN_MINIMUM_LIMITS";
  selection: AutoLimitSelection;
  percentage: string;
}

interface AdjustMinimumInput {
  operation: "ADJUST_PRICES_TO_MINIMUM";
  percentage: string;
}

interface SetMaximumInput {
  operation: "SET_PRICES_TO_MAXIMUM";
  selection: UpperLimitSelection;
}

interface IncreasePricesInput {
  operation: "INCREASE_PRICES";
  percentage: string;
}

interface ImportLimitRow {
  externalId: string;
  minimumPrice?: string;
  maximumPrice?: string;
}

interface ImportLimitsInput {
  operation: "IMPORT_LIMITS";
  rows: ImportLimitRow[];
}

type OperationInput =
  | AutoMinimumInput
  | AdjustMinimumInput
  | SetMaximumInput
  | IncreasePricesInput
  | ImportLimitsInput;

interface ApplyConfirmation {
  previewToken: string;
  expectedAffectedCount: number;
}

type OperationProduct = Pick<
  Product,
  | "id"
  | "externalId"
  | "name"
  | "currentPrice"
  | "minimumPrice"
  | "maximumPrice"
  | "competitorLowestPrice"
  | "normalizedStatus"
  | "updatedAt"
>;

interface PlannedChange {
  product: OperationProduct;
  oldPrice: Prisma.Decimal | null;
  newPrice: Prisma.Decimal | null;
  oldMinimumPrice: Prisma.Decimal | null;
  newMinimumPrice: Prisma.Decimal | null;
  oldMaximumPrice: Prisma.Decimal | null;
  newMaximumPrice: Prisma.Decimal | null;
  priceChanged: boolean;
  minimumChanged: boolean;
  maximumChanged: boolean;
}

interface OperationPlan {
  matchedCount: number;
  affectedCount: number;
  unchangedCount: number;
  skippedCount: number;
  constrainedCount: number;
  changes: PlannedChange[];
  previewToken: string;
}

class SettingsOperationError extends Error {
  constructor(
    readonly statusCode: 400 | 404 | 409 | 422,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SettingsOperationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: Set<string>) {
  return Object.keys(value).every((key) => allowed.has(key));
}

function isOperationName(value: unknown): value is OperationName {
  return typeof value === "string" && operationNames.includes(value as OperationName);
}

function parsePercentage(value: unknown) {
  if (typeof value !== "string" || !decimalStringPattern.test(value)) return null;
  const percentage = new Prisma.Decimal(value);
  return percentage.gte(0) && percentage.lte(100) ? percentage.toFixed(2) : null;
}

function parseMoney(value: unknown) {
  if (typeof value !== "string" || !decimalStringPattern.test(value)) return null;
  const money = new Prisma.Decimal(value);
  return money.lte(maxMoney) ? money.toFixed(2) : null;
}

function parseOperationBody(
  value: unknown,
  confirmationRequired: boolean
): { operation: OperationInput; confirmation?: ApplyConfirmation } {
  if (!isRecord(value) || !isOperationName(value.operation)) {
    throw new SettingsOperationError(400, "VALIDATION_ERROR", "Invalid request");
  }

  const confirmationKeys = confirmationRequired
    ? ["previewToken", "expectedAffectedCount"]
    : [];
  let operation: OperationInput;

  if (value.operation === "AUTO_ASSIGN_MINIMUM_LIMITS") {
    const allowed = new Set(["operation", "selection", "percentage", ...confirmationKeys]);
    const percentage = parsePercentage(value.percentage);
    if (
      !hasOnlyKeys(value, allowed) ||
      !autoLimitSelections.includes(value.selection as AutoLimitSelection) ||
      percentage === null
    ) {
      throw new SettingsOperationError(400, "VALIDATION_ERROR", "Invalid request");
    }
    operation = {
      operation: value.operation,
      selection: value.selection as AutoLimitSelection,
      percentage
    };
  } else if (value.operation === "ADJUST_PRICES_TO_MINIMUM") {
    const allowed = new Set(["operation", "percentage", ...confirmationKeys]);
    const percentage = parsePercentage(value.percentage);
    if (!hasOnlyKeys(value, allowed) || percentage === null) {
      throw new SettingsOperationError(400, "VALIDATION_ERROR", "Invalid request");
    }
    operation = { operation: value.operation, percentage };
  } else if (value.operation === "SET_PRICES_TO_MAXIMUM") {
    const allowed = new Set(["operation", "selection", ...confirmationKeys]);
    if (
      !hasOnlyKeys(value, allowed) ||
      !upperLimitSelections.includes(value.selection as UpperLimitSelection)
    ) {
      throw new SettingsOperationError(400, "VALIDATION_ERROR", "Invalid request");
    }
    operation = {
      operation: value.operation,
      selection: value.selection as UpperLimitSelection
    };
  } else if (value.operation === "INCREASE_PRICES") {
    const allowed = new Set(["operation", "percentage", ...confirmationKeys]);
    const percentage = parsePercentage(value.percentage);
    if (!hasOnlyKeys(value, allowed) || percentage === null) {
      throw new SettingsOperationError(400, "VALIDATION_ERROR", "Invalid request");
    }
    operation = { operation: value.operation, percentage };
  } else {
    const allowed = new Set(["operation", "rows", ...confirmationKeys]);
    if (!hasOnlyKeys(value, allowed) || !Array.isArray(value.rows) || value.rows.length < 1 || value.rows.length > 1000) {
      throw new SettingsOperationError(400, "VALIDATION_ERROR", "Invalid request");
    }

    const seenExternalIds = new Set<string>();
    const rows = value.rows.map((row, index): ImportLimitRow => {
      if (!isRecord(row) || !hasOnlyKeys(row, new Set(["externalId", "minimumPrice", "maximumPrice"]))) {
        throw new SettingsOperationError(400, "VALIDATION_ERROR", "Invalid request", { row: index + 1 });
      }
      const externalId = typeof row.externalId === "string" ? row.externalId.trim() : "";
      const hasMinimum = Object.hasOwn(row, "minimumPrice");
      const hasMaximum = Object.hasOwn(row, "maximumPrice");
      const minimumPrice = hasMinimum ? parseMoney(row.minimumPrice) : undefined;
      const maximumPrice = hasMaximum ? parseMoney(row.maximumPrice) : undefined;
      const duplicateKey = externalId.toLocaleLowerCase("en-US");

      if (
        externalId.length < 1 ||
        externalId.length > 200 ||
        (!hasMinimum && !hasMaximum) ||
        (hasMinimum && minimumPrice === null) ||
        (hasMaximum && maximumPrice === null) ||
        seenExternalIds.has(duplicateKey)
      ) {
        throw new SettingsOperationError(400, "VALIDATION_ERROR", "Invalid request", { row: index + 1 });
      }
      seenExternalIds.add(duplicateKey);
      return {
        externalId,
        ...(minimumPrice === undefined ? {} : { minimumPrice: minimumPrice as string }),
        ...(maximumPrice === undefined ? {} : { maximumPrice: maximumPrice as string })
      };
    });
    operation = { operation: value.operation, rows };
  }

  if (!confirmationRequired) return { operation };
  if (
    typeof value.previewToken !== "string" ||
    !previewTokenPattern.test(value.previewToken) ||
    typeof value.expectedAffectedCount !== "number" ||
    !Number.isSafeInteger(value.expectedAffectedCount) ||
    value.expectedAffectedCount < 0 ||
    value.expectedAffectedCount > 1_000_000
  ) {
    throw new SettingsOperationError(400, "VALIDATION_ERROR", "Invalid request");
  }

  return {
    operation,
    confirmation: {
      previewToken: value.previewToken,
      expectedAffectedCount: value.expectedAffectedCount
    }
  };
}

function serializeMoney(value: Prisma.Decimal | null) {
  return value === null ? null : value.toFixed(2);
}

function roundMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function changed(left: Prisma.Decimal | null, right: Prisma.Decimal | null) {
  if (left === null || right === null) return left !== right;
  return !left.equals(right);
}

function planChange(
  product: OperationProduct,
  values: {
    price?: Prisma.Decimal | null;
    minimum?: Prisma.Decimal | null;
    maximum?: Prisma.Decimal | null;
  }
): PlannedChange {
  const newPrice = values.price === undefined ? product.currentPrice : values.price;
  const newMinimumPrice = values.minimum === undefined ? product.minimumPrice : values.minimum;
  const newMaximumPrice = values.maximum === undefined ? product.maximumPrice : values.maximum;
  return {
    product,
    oldPrice: product.currentPrice,
    newPrice,
    oldMinimumPrice: product.minimumPrice,
    newMinimumPrice,
    oldMaximumPrice: product.maximumPrice,
    newMaximumPrice,
    priceChanged: changed(product.currentPrice, newPrice),
    minimumChanged: changed(product.minimumPrice, newMinimumPrice),
    maximumChanged: changed(product.maximumPrice, newMaximumPrice)
  };
}

function operationParameters(input: OperationInput): Prisma.InputJsonObject {
  if (input.operation === "IMPORT_LIMITS") {
    return {
      rowCount: input.rows.length
    };
  }
  if (input.operation === "SET_PRICES_TO_MAXIMUM") {
    return { selection: input.selection };
  }
  if (input.operation === "AUTO_ASSIGN_MINIMUM_LIMITS") {
    return { selection: input.selection, percentage: input.percentage };
  }
  return { percentage: input.percentage };
}

function previewToken(input: OperationInput, products: OperationProduct[]) {
  const state = products.map((product) => ({
    id: product.id,
    externalId: product.externalId,
    currentPrice: serializeMoney(product.currentPrice),
    minimumPrice: serializeMoney(product.minimumPrice),
    maximumPrice: serializeMoney(product.maximumPrice),
    normalizedStatus: product.normalizedStatus,
    updatedAt: product.updatedAt.toISOString()
  }));
  return createHash("sha256")
    .update(JSON.stringify({ input, state }))
    .digest("hex");
}

async function buildOperationPlan(
  tx: Prisma.TransactionClient,
  storeId: string,
  input: OperationInput
): Promise<OperationPlan> {
  const products = await tx.product.findMany({
    where: { storeId },
    select: {
      id: true,
      externalId: true,
      name: true,
      currentPrice: true,
      minimumPrice: true,
      maximumPrice: true,
      competitorLowestPrice: true,
      normalizedStatus: true,
      updatedAt: true
    },
    orderBy: [{ externalId: "asc" }, { id: "asc" }]
  });
  const changes: PlannedChange[] = [];
  let matchedCount = 0;
  let unchangedCount = 0;
  let skippedCount = 0;
  let constrainedCount = 0;

  if (input.operation === "AUTO_ASSIGN_MINIMUM_LIMITS") {
    const percentage = new Prisma.Decimal(input.percentage);
    const factor = oneHundred.minus(percentage).div(oneHundred);
    for (const product of products) {
      if (product.normalizedStatus !== "ACTIVE") continue;
      if (input.selection === "WITHOUT_LIMIT" && product.minimumPrice !== null) continue;
      matchedCount += 1;
      if (product.currentPrice === null) {
        skippedCount += 1;
        continue;
      }
      const minimum = roundMoney(product.currentPrice.mul(factor));
      if (product.maximumPrice !== null && minimum.gt(product.maximumPrice)) {
        skippedCount += 1;
        continue;
      }
      const change = planChange(product, { minimum });
      if (!change.minimumChanged) unchangedCount += 1;
      else changes.push(change);
    }
  } else if (input.operation === "ADJUST_PRICES_TO_MINIMUM") {
    const percentage = new Prisma.Decimal(input.percentage);
    const factor = oneHundred.plus(percentage).div(oneHundred);
    for (const product of products) {
      if (
        product.normalizedStatus !== "ACTIVE" ||
        product.currentPrice === null ||
        product.minimumPrice === null ||
        !product.currentPrice.lt(product.minimumPrice)
      ) continue;
      matchedCount += 1;
      let price = roundMoney(product.minimumPrice.mul(factor));
      let constrainedByMaximum = false;
      if (product.maximumPrice !== null && price.gt(product.maximumPrice)) {
        price = product.maximumPrice;
        constrainedByMaximum = true;
      }
      const change = planChange(product, { price });
      if (!change.priceChanged) unchangedCount += 1;
      else {
        changes.push(change);
        if (constrainedByMaximum) constrainedCount += 1;
      }
    }
  } else if (input.operation === "SET_PRICES_TO_MAXIMUM") {
    for (const product of products) {
      if (product.currentPrice === null || product.maximumPrice === null) continue;
      if (input.selection === "ABOVE_UPPER" && !product.currentPrice.gt(product.maximumPrice)) continue;
      matchedCount += 1;
      const change = planChange(product, { price: product.maximumPrice });
      if (!change.priceChanged) unchangedCount += 1;
      else changes.push(change);
    }
  } else if (input.operation === "INCREASE_PRICES") {
    const percentage = new Prisma.Decimal(input.percentage);
    const factor = oneHundred.plus(percentage).div(oneHundred);
    for (const product of products) {
      if (product.normalizedStatus !== "ACTIVE" || product.currentPrice === null) continue;
      matchedCount += 1;
      if (product.maximumPrice !== null && product.currentPrice.gte(product.maximumPrice)) {
        unchangedCount += 1;
        continue;
      }
      let price = roundMoney(product.currentPrice.mul(factor));
      let constrainedByMaximum = false;
      if (product.maximumPrice !== null && price.gt(product.maximumPrice)) {
        price = product.maximumPrice;
        constrainedByMaximum = true;
      }
      if (price.gt(maxMoney)) {
        skippedCount += 1;
        continue;
      }
      const change = planChange(product, { price });
      if (!change.priceChanged) unchangedCount += 1;
      else {
        changes.push(change);
        if (constrainedByMaximum) constrainedCount += 1;
      }
    }
  } else {
    const productByExternalId = new Map(products.map((product) => [product.externalId, product]));
    const unavailableExternalIds = input.rows
      .filter((row) => !productByExternalId.has(row.externalId))
      .map((row) => row.externalId);
    if (unavailableExternalIds.length > 0) {
      throw new SettingsOperationError(
        422,
        "IMPORT_PRODUCTS_NOT_FOUND",
        "One or more products were not found in the active store",
        { externalIds: unavailableExternalIds }
      );
    }
    for (const row of input.rows) {
      const product = productByExternalId.get(row.externalId)!;
      matchedCount += 1;
      const minimum = row.minimumPrice === undefined
        ? product.minimumPrice
        : new Prisma.Decimal(row.minimumPrice);
      const maximum = row.maximumPrice === undefined
        ? product.maximumPrice
        : new Prisma.Decimal(row.maximumPrice);
      if (minimum !== null && maximum !== null && minimum.gt(maximum)) {
        throw new SettingsOperationError(
          422,
          "INVALID_PRICE_BOUNDS",
          "Minimum price cannot be greater than maximum price",
          { externalId: row.externalId }
        );
      }
      const change = planChange(product, { minimum, maximum });
      if (!change.minimumChanged && !change.maximumChanged) unchangedCount += 1;
      else changes.push(change);
    }
  }

  const affectedCount = changes.length;
  return {
    matchedCount,
    affectedCount,
    unchangedCount,
    skippedCount,
    constrainedCount,
    changes,
    previewToken: previewToken(input, products)
  };
}

function serializePlannedChange(change: PlannedChange) {
  return {
    productId: change.product.id,
    externalId: change.product.externalId,
    name: change.product.name,
    oldPrice: serializeMoney(change.oldPrice),
    newPrice: serializeMoney(change.newPrice),
    oldMinimumPrice: serializeMoney(change.oldMinimumPrice),
    newMinimumPrice: serializeMoney(change.newMinimumPrice),
    oldMaximumPrice: serializeMoney(change.oldMaximumPrice),
    newMaximumPrice: serializeMoney(change.newMaximumPrice)
  };
}

function sendOperationError(reply: FastifyReply, error: SettingsOperationError) {
  return reply.code(error.statusCode).send({
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {})
    }
  });
}

async function activeStore(tx: Prisma.TransactionClient) {
  const store = await tx.store.findFirst({
    where: { active: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
  });
  if (!store) {
    throw new SettingsOperationError(404, "ACTIVE_STORE_NOT_FOUND", "Active store not found");
  }
  return store;
}

const operationReason: Record<OperationName, string> = {
  AUTO_ASSIGN_MINIMUM_LIMITS: "Minimum limit assigned from the local current price",
  ADJUST_PRICES_TO_MINIMUM: "Local current price adjusted to the configured minimum",
  SET_PRICES_TO_MAXIMUM: "Local current price set to the configured maximum",
  INCREASE_PRICES: "Local current price increased by a settings operation",
  IMPORT_LIMITS: "Limits imported from a locally parsed spreadsheet"
};

function operationEnum(input: OperationInput) {
  return SettingsOperationType[input.operation];
}

const historyQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    page: { type: "integer", minimum: 1, maximum: 1000, default: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    search: { type: "string", maxLength: 100, default: "" }
  }
} as const;

interface HistoryQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function registerSettingsOperationRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.post("/api/settings/operations/preview", async (request, reply) => {
    try {
      const { operation } = parseOperationBody(request.body, false);
      const result = await prisma.$transaction(async (tx) => {
        const store = await activeStore(tx);
        return buildOperationPlan(tx, store.id, operation);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

      return {
        data: {
          operation: operation.operation,
          matchedCount: result.matchedCount,
          affectedCount: result.affectedCount,
          unchangedCount: result.unchangedCount,
          skippedCount: result.skippedCount,
          constrainedCount: result.constrainedCount,
          previewToken: result.previewToken,
          changes: result.changes.slice(0, maxPreviewChanges).map(serializePlannedChange),
          truncated: result.changes.length > maxPreviewChanges
        }
      };
    } catch (error) {
      if (error instanceof SettingsOperationError) return sendOperationError(reply, error);
      throw error;
    }
  });

  app.post("/api/settings/operations/apply", async (request, reply) => {
    try {
      const { operation, confirmation } = parseOperationBody(request.body, true);
      const applied = await prisma.$transaction(async (tx) => {
        const store = await activeStore(tx);
        const plan = await buildOperationPlan(tx, store.id, operation);

        if (
          !confirmation ||
          confirmation.previewToken !== plan.previewToken ||
          confirmation.expectedAffectedCount !== plan.affectedCount
        ) {
          throw new SettingsOperationError(
            409,
            "PREVIEW_STALE",
            "The product data changed after preview; create a new preview",
            { affectedCount: plan.affectedCount }
          );
        }
        if (plan.affectedCount === 0) {
          throw new SettingsOperationError(409, "NO_CHANGES", "No products require changes");
        }

        const audit = await tx.settingsOperation.create({
          data: {
            storeId: store.id,
            type: operationEnum(operation),
            parameters: operationParameters(operation),
            matchedCount: plan.matchedCount,
            affectedCount: plan.affectedCount,
            unchangedCount: plan.unchangedCount,
            skippedCount: plan.skippedCount
          }
        });
        let priceChangesCreated = 0;

        for (const change of plan.changes) {
          const update: Prisma.ProductUpdateInput = {};
          if (change.priceChanged) {
            update.previousPrice = change.oldPrice;
            update.currentPrice = change.newPrice;
          }
          if (change.minimumChanged) update.minimumPrice = change.newMinimumPrice;
          if (change.maximumChanged) update.maximumPrice = change.newMaximumPrice;

          await tx.product.update({ where: { id: change.product.id }, data: update });
          await tx.settingsOperationItem.create({
            data: {
              operationId: audit.id,
              productId: change.product.id,
              productExternalId: change.product.externalId,
              productName: change.product.name,
              oldPrice: change.oldPrice,
              newPrice: change.newPrice,
              oldMinimumPrice: change.oldMinimumPrice,
              newMinimumPrice: change.newMinimumPrice,
              oldMaximumPrice: change.oldMaximumPrice,
              newMaximumPrice: change.newMaximumPrice
            }
          });

          if (change.priceChanged && change.oldPrice !== null && change.newPrice !== null) {
            const direction = operation.operation === "SET_PRICES_TO_MAXIMUM"
              ? PriceChangeDirection.UPPER_LIMIT
              : change.newPrice.lt(change.oldPrice)
                ? PriceChangeDirection.DECREASE
                : PriceChangeDirection.INCREASE;
            await tx.priceChange.create({
              data: {
                productId: change.product.id,
                settingsOperationId: audit.id,
                oldPrice: change.oldPrice,
                newPrice: change.newPrice,
                competitorPrice: change.product.competitorLowestPrice,
                minimumPrice: change.newMinimumPrice,
                maximumPrice: change.newMaximumPrice,
                direction,
                reason: operationReason[operation.operation],
                source: `SETTINGS_${operation.operation}`
              }
            });
            priceChangesCreated += 1;
          }
        }

        return { audit, priceChangesCreated, constrainedCount: plan.constrainedCount };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      return reply.code(201).send({
        data: {
          id: applied.audit.id,
          type: applied.audit.type,
          matchedCount: applied.audit.matchedCount,
          affectedCount: applied.audit.affectedCount,
          unchangedCount: applied.audit.unchangedCount,
          skippedCount: applied.audit.skippedCount,
          constrainedCount: applied.constrainedCount,
          createdAt: applied.audit.createdAt.toISOString(),
          priceChangesCreated: applied.priceChangesCreated
        }
      });
    } catch (error) {
      if (error instanceof SettingsOperationError) return sendOperationError(reply, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        return reply.code(409).send({
          error: {
            code: "OPERATION_RETRY_REQUIRED",
            message: "The products changed concurrently; create a new preview"
          }
        });
      }
      throw error;
    }
  });

  app.get<{ Querystring: HistoryQuery }>(
    "/api/settings/history",
    {
      schema: { querystring: historyQuerySchema },
      preValidation: async (request, reply) => {
        const query = request.query as unknown;
        if (
          isRecord(query) &&
          Object.keys(query).some((key) => key !== "page" && key !== "pageSize" && key !== "search")
        ) {
          await reply.code(400).send({
            error: { code: "VALIDATION_ERROR", message: "Invalid request" }
          });
        }
      }
    },
    async (request) => {
      const page = request.query.page ?? 1;
      const pageSize = request.query.pageSize ?? 20;
      const search = request.query.search?.trim() ?? "";
      const take = page * pageSize;
      const textFilter = search
        ? { contains: search, mode: Prisma.QueryMode.insensitive }
        : undefined;
      const runWhere: Prisma.BotRunWhereInput = search
        ? {
            OR: [
              { errorMessage: textFilter },
              ...(["RUNNING", "SUCCESS", "PARTIAL", "FAILED"] as const)
                .filter((status) => status.toLocaleLowerCase("az").includes(search.toLocaleLowerCase("az")))
                .map((status) => ({ status })),
              ...(["MANUAL", "SCHEDULED"] as const)
                .filter((source) => source.toLocaleLowerCase("az").includes(search.toLocaleLowerCase("az")))
                .map((source) => ({ source }))
            ]
          }
        : {};
      const changeWhere: Prisma.PriceChangeWhereInput = search
        ? {
            OR: [
              { reason: textFilter },
              { source: textFilter },
              { product: { name: textFilter } },
              { product: { externalId: textFilter } },
              { product: { sku: textFilter } },
              ...Object.values(PriceChangeDirection)
                .filter((direction) =>
                  direction.toLocaleLowerCase("az").includes(search.toLocaleLowerCase("az"))
                )
                .map((direction) => ({ direction }))
            ]
          }
        : {};
      const operationWhere: Prisma.SettingsOperationWhereInput = search
        ? {
            OR: [
              { items: { some: { productName: textFilter } } },
              { items: { some: { productExternalId: textFilter } } },
              ...operationNames
                .filter((operation) => operation.toLocaleLowerCase("az").includes(search.toLocaleLowerCase("az")))
                .map((type) => ({ type: SettingsOperationType[type] }))
            ]
          }
        : {};
      const historySnapshot = await prisma.$transaction(async (tx) => {
        const runs = await tx.botRun.findMany({
          where: runWhere,
          orderBy: [{ startedAt: "desc" }, { id: "desc" }],
          take
        });
        const changes = await tx.priceChange.findMany({
          where: changeWhere,
          include: { product: { select: { id: true, externalId: true, sku: true, name: true } } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take
        });
        const operations = await tx.settingsOperation.findMany({
          where: operationWhere,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take
        });
        const runCount = await tx.botRun.count({ where: runWhere });
        const changeCount = await tx.priceChange.count({ where: changeWhere });
        const operationCount = await tx.settingsOperation.count({ where: operationWhere });
        const operationAggregate = await tx.settingsOperation.aggregate({
          where: operationWhere,
          _sum: { affectedCount: true }
        });
        const runGroups = await tx.botRun.groupBy({
          by: ["status"],
          where: runWhere,
          orderBy: { status: "asc" },
          _count: { _all: true },
          _sum: {
            productsChecked: true,
            pricesDecreased: true,
            pricesIncreased: true,
            pricesSetToUpperLimit: true,
            productsSkipped: true,
            errorsCount: true
          }
        });
        const changeGroups = await tx.priceChange.groupBy({
          by: ["direction"],
          where: changeWhere,
          orderBy: { direction: "asc" },
          _count: { _all: true }
        });

        return {
          runs,
          changes,
          operations,
          runCount,
          changeCount,
          operationCount,
          operationAggregate,
          runGroups,
          changeGroups
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
      const {
        runs,
        changes,
        operations,
        runCount,
        changeCount,
        operationCount,
        operationAggregate,
        runGroups,
        changeGroups
      } = historySnapshot;

      const events = [
        ...runs.map((run) => {
          const serialized = serializeBotRun(run);
          return {
            ...serialized,
            id: `bot-run:${run.id}`,
            type: "BOT_RUN" as const,
            createdAt: run.startedAt.toISOString(),
          };
        }),
        ...changes.map(({ product, ...change }) => {
          const serialized = serializePriceChange(change);
          return {
            ...serialized,
            id: `price-change:${change.id}`,
            type: "PRICE_CHANGE" as const,
            createdAt: change.createdAt.toISOString(),
            product
          };
        }),
        ...operations.map((operation) => ({
          id: `settings-operation:${operation.id}`,
          type: "SETTINGS_OPERATION" as const,
          createdAt: operation.createdAt.toISOString(),
          operation: operation.type,
          operationType: operation.type,
          matchedCount: operation.matchedCount,
          affectedCount: operation.affectedCount,
          unchangedCount: operation.unchangedCount,
          skippedCount: operation.skippedCount
        }))
      ].sort((left, right) => {
        const dateOrder = right.createdAt.localeCompare(left.createdAt);
        return dateOrder === 0 ? right.id.localeCompare(left.id) : dateOrder;
      });
      const start = (page - 1) * pageSize;

      const botRunSummary = {
        total: runCount,
        RUNNING: 0,
        SUCCESS: 0,
        PARTIAL: 0,
        FAILED: 0,
        productsChecked: 0,
        pricesDecreased: 0,
        pricesIncreased: 0,
        pricesSetToUpperLimit: 0,
        productsSkipped: 0,
        errorsCount: 0
      };
      for (const group of runGroups) {
        botRunSummary[group.status] = group._count._all;
        botRunSummary.productsChecked += group._sum.productsChecked ?? 0;
        botRunSummary.pricesDecreased += group._sum.pricesDecreased ?? 0;
        botRunSummary.pricesIncreased += group._sum.pricesIncreased ?? 0;
        botRunSummary.pricesSetToUpperLimit += group._sum.pricesSetToUpperLimit ?? 0;
        botRunSummary.productsSkipped += group._sum.productsSkipped ?? 0;
        botRunSummary.errorsCount += group._sum.errorsCount ?? 0;
      }
      const priceChangeSummary = {
        total: changeCount,
        DECREASE: 0,
        INCREASE: 0,
        UPPER_LIMIT: 0,
        UNCHANGED: 0
      };
      for (const group of changeGroups) priceChangeSummary[group.direction] = group._count._all;

      const total = runCount + changeCount + operationCount;
      return {
        data: events.slice(start, start + pageSize),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        },
        summary: {
          botRuns: botRunSummary,
          priceChanges: priceChangeSummary,
          settingsOperations: {
            total: operationCount,
            affectedCount: operationAggregate._sum.affectedCount ?? 0
          }
        }
      };
    }
  );

  app.get("/api/settings/management-summary", async (_request, reply) => {
    const store = await prisma.store.findFirst({
      where: { active: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });
    if (!store) {
      return reply.code(404).send({
        error: { code: "ACTIVE_STORE_NOT_FOUND", message: "Active store not found" }
      });
    }

    const [
      products,
      friendOffersExcluded,
      priceChangeCount,
      settingsOperationCount,
      botRunCount,
      settings,
      latestBotRun
    ] = await prisma.$transaction([
      prisma.product.findMany({
        where: { storeId: store.id },
        select: {
          currentPrice: true,
          minimumPrice: true,
          maximumPrice: true,
          botEnabled: true,
          normalizedStatus: true
        }
      }),
      prisma.competitorOffer.count({
        where: { excludedAsFriendStore: true, product: { storeId: store.id } }
      }),
      prisma.priceChange.count({ where: { product: { storeId: store.id } } }),
      prisma.settingsOperation.count({ where: { storeId: store.id } }),
      prisma.botRun.count(),
      prisma.botSettings.findFirst({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
      prisma.botRun.findFirst({ orderBy: [{ startedAt: "desc" }, { id: "desc" }] })
    ]);

    return {
      data: {
        store: { id: store.id, name: store.name },
        totalProducts: products.length,
        activeProducts: products.filter((product) => product.normalizedStatus === "ACTIVE").length,
        botEnabledProducts: products.filter((product) => product.botEnabled).length,
        withMinimumPrice: products.filter((product) => product.minimumPrice !== null).length,
        withoutMinimumPrice: products.filter((product) => product.minimumPrice === null).length,
        withMaximumPrice: products.filter((product) => product.maximumPrice !== null).length,
        belowMinimumPrice: products.filter((product) =>
          product.currentPrice !== null &&
          product.minimumPrice !== null &&
          product.currentPrice.lt(product.minimumPrice)
        ).length,
        aboveMaximumPrice: products.filter((product) =>
          product.currentPrice !== null &&
          product.maximumPrice !== null &&
          product.currentPrice.gt(product.maximumPrice)
        ).length,
        friendOffersExcluded,
        priceChangeCount,
        settingsOperationCount,
        botRunCount,
        botEnabled: settings?.botEnabled ?? false,
        latestBotRun: latestBotRun ? {
          status: latestBotRun.status,
          startedAt: latestBotRun.startedAt.toISOString(),
          finishedAt: latestBotRun.finishedAt?.toISOString() ?? null
        } : null,
        marketplaceConnected: false,
        orderSourceConnected: false
      }
    };
  });
}
