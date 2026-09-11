import { Prisma, ProductStatus, type PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import {
  serializeBotRun,
  serializeBotSettings,
  serializeCompetitorOffer,
  serializePriceChange,
  serializeProduct,
  serializeStore
} from "./serializers.js";

const productStatuses = Object.values(ProductStatus);
const stockBuckets = ["OUT", "LOW", "IN_STOCK"] as const;

type StockBucket = (typeof stockBuckets)[number];

const stockFilters: Record<StockBucket, Prisma.IntFilter> = {
  OUT: { equals: 0 },
  LOW: { gte: 1, lte: 5 },
  IN_STOCK: { gt: 5 }
};

interface ProductsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ProductStatus;
  category?: string;
  botEnabled?: boolean;
  stockBucket?: StockBucket;
  hasMinimumPrice?: boolean;
}

interface ProductParams {
  id: string;
}

const productsQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    page: { type: "integer", minimum: 1, maximum: 100000, default: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    search: { type: "string", minLength: 1, maxLength: 200 },
    status: { type: "string", enum: productStatuses },
    category: { type: "string", minLength: 1, maxLength: 100 },
    botEnabled: { type: "boolean" },
    stockBucket: { type: "string", enum: stockBuckets },
    hasMinimumPrice: { type: "boolean" }
  }
} as const;

const productParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: {
    id: { type: "string", format: "uuid" }
  }
} as const;

export function registerReadRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/api/stores", async () => {
    const stores = await prisma.store.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: [{ name: "asc" }, { id: "asc" }]
    });

    return {
      data: stores.map(({ _count, ...store }) => ({
        ...serializeStore(store),
        productCount: _count.products
      }))
    };
  });

  app.get<{ Querystring: ProductsQuery }>(
    "/api/products",
    { schema: { querystring: productsQuerySchema } },
    async (request) => {
      const page = request.query.page ?? 1;
      const pageSize = request.query.pageSize ?? 20;
      const search = request.query.search?.trim();
      const category = request.query.category?.trim();

      const where: Prisma.ProductWhereInput = {
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
                { externalId: { contains: search, mode: "insensitive" } }
              ]
            }
          : {}),
        ...(request.query.status ? { normalizedStatus: request.query.status } : {}),
        ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
        ...(request.query.botEnabled === undefined ? {} : { botEnabled: request.query.botEnabled }),
        ...(request.query.stockBucket ? { stock: stockFilters[request.query.stockBucket] } : {}),
        ...(request.query.hasMinimumPrice === undefined
          ? {}
          : request.query.hasMinimumPrice
            ? { minimumPrice: { not: null } }
            : { minimumPrice: null })
      };

      const [total, products] = await prisma.$transaction([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          include: { store: true },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return {
        data: products.map(({ store, ...product }) => ({
          ...serializeProduct(product),
          store: serializeStore(store)
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    }
  );

  app.get("/api/products/categories", async () => {
    const categories = await prisma.product.groupBy({
      by: ["category"],
      where: { category: { not: null } },
      orderBy: { category: "asc" }
    });

    return {
      data: categories.flatMap(({ category }) => category === null ? [] : [category])
    };
  });

  app.get<{ Params: ProductParams }>(
    "/api/products/:id",
    { schema: { params: productParamsSchema } },
    async (request, reply) => {
      const result = await prisma.product.findUnique({
        where: { id: request.params.id },
        include: {
          store: true,
          competitorOffers: { orderBy: [{ observedAt: "desc" }, { id: "desc" }] },
          priceChanges: { orderBy: [{ createdAt: "desc" }, { id: "desc" }] }
        }
      });

      if (!result) {
        return reply.code(404).send({
          error: { code: "PRODUCT_NOT_FOUND", message: "Product not found" }
        });
      }

      const { store, competitorOffers, priceChanges, ...product } = result;
      return {
        data: {
          ...serializeProduct(product),
          store: serializeStore(store),
          competitorOffers: competitorOffers.map(serializeCompetitorOffer),
          priceChanges: priceChanges.map(serializePriceChange)
        }
      };
    }
  );

  app.get("/api/settings", async (_request, reply) => {
    const settings = await prisma.botSettings.findFirst({ orderBy: { createdAt: "asc" } });

    if (!settings) {
      return reply.code(404).send({
        error: { code: "SETTINGS_NOT_FOUND", message: "Bot settings not found" }
      });
    }

    return { data: serializeBotSettings(settings) };
  });

  app.get("/api/bot-runs", async () => {
    const runs = await prisma.botRun.findMany({
      orderBy: [{ startedAt: "desc" }, { id: "desc" }]
    });
    return { data: runs.map(serializeBotRun) };
  });

  app.get("/api/price-changes", async () => {
    const changes = await prisma.priceChange.findMany({
      include: {
        product: { select: { id: true, externalId: true, sku: true, name: true } }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    });

    return {
      data: changes.map(({ product, ...change }) => ({
        ...serializePriceChange(change),
        product
      }))
    };
  });
}
