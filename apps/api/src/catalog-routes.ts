import { Prisma, ProductStatus, type PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import {
  serializeCatalogProduct,
  serializeProduct,
  serializeStore
} from "./serializers.js";

interface CatalogProductsQuery {
  search: string;
  page?: number;
  pageSize?: number;
}

interface AddCatalogProductsBody {
  catalogProductIds: string[];
}

const catalogProductsQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["search"],
  properties: {
    search: { type: "string", minLength: 1, maxLength: 100, pattern: "\\S" },
    page: { type: "integer", minimum: 1, maximum: 100000, default: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 50, default: 10 }
  }
} as const;

const catalogQueryFields = new Set(["search", "page", "pageSize"]);
const addCatalogProductFields = new Set(["catalogProductIds"]);

const addCatalogProductsBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["catalogProductIds"],
  properties: {
    catalogProductIds: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      uniqueItems: true,
      items: { type: "string", format: "uuid" }
    }
  }
} as const;

class CatalogRequestError extends Error {
  constructor(
    readonly statusCode: 404 | 409,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "CatalogRequestError";
  }
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

const activeStoreOrder: Prisma.StoreOrderByWithRelationInput[] = [
  { createdAt: "asc" },
  { id: "asc" }
];

export function registerCatalogRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get<{ Querystring: CatalogProductsQuery }>(
    "/api/catalog-products",
    {
      schema: { querystring: catalogProductsQuerySchema },
      preValidation: async (request, reply) => {
        const query = request.query as unknown;
        if (
          typeof query === "object" &&
          query !== null &&
          !Array.isArray(query) &&
          Object.keys(query).some((field) => !catalogQueryFields.has(field))
        ) {
          await reply.code(400).send({
            error: { code: "VALIDATION_ERROR", message: "Invalid request" }
          });
        }
      }
    },
    async (request) => {
      const search = request.query.search.trim();
      const page = request.query.page ?? 1;
      const pageSize = request.query.pageSize ?? 10;
      const where: Prisma.CatalogProductWhereInput = {
        active: true,
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { externalId: { contains: search, mode: "insensitive" } },
          { barcode: { contains: search, mode: "insensitive" } },
          { mpn: { contains: search, mode: "insensitive" } }
        ]
      };

      const result = await prisma.$transaction(async (tx) => {
        const [activeStore, total, catalogProducts] = await Promise.all([
          tx.store.findFirst({
            where: { active: true },
            orderBy: activeStoreOrder,
            select: { id: true }
          }),
          tx.catalogProduct.count({ where }),
          tx.catalogProduct.findMany({
            where,
            orderBy: [{ name: "asc" }, { externalId: "asc" }],
            skip: (page - 1) * pageSize,
            take: pageSize
          })
        ]);

        const existingProducts = activeStore && catalogProducts.length > 0
          ? await tx.product.findMany({
              where: {
                storeId: activeStore.id,
                externalId: { in: catalogProducts.map((product) => product.externalId) }
              },
              select: { externalId: true }
            })
          : [];

        return {
          total,
          catalogProducts,
          alreadyAddedExternalIds: new Set(existingProducts.map((product) => product.externalId))
        };
      });

      return {
        data: result.catalogProducts.map((product) => ({
          ...serializeCatalogProduct(product),
          alreadyAdded: result.alreadyAddedExternalIds.has(product.externalId)
        })),
        pagination: {
          page,
          pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / pageSize)
        }
      };
    }
  );

  app.post<{ Body: AddCatalogProductsBody }>(
    "/api/products/from-catalog",
    {
      schema: { body: addCatalogProductsBodySchema },
      preValidation: async (request, reply) => {
        const body = request.body as unknown;
        if (typeof body !== "object" || body === null || Array.isArray(body)) return;

        const values = body as Record<string, unknown>;
        const ids = values.catalogProductIds;
        const hasUnexpectedField = Object.keys(values).some(
          (field) => !addCatalogProductFields.has(field)
        );
        const hasInvalidItem = Array.isArray(ids) && ids.some((id) => typeof id !== "string");

        if (hasUnexpectedField || ("catalogProductIds" in values && (!Array.isArray(ids) || hasInvalidItem))) {
          await reply.code(400).send({
            error: { code: "VALIDATION_ERROR", message: "Invalid request" }
          });
        }
      }
    },
    async (request, reply) => {
      try {
        const addedProducts = await prisma.$transaction(async (tx) => {
          const activeStore = await tx.store.findFirst({
            where: { active: true },
            orderBy: activeStoreOrder
          });

          if (!activeStore) {
            throw new CatalogRequestError(
              404,
              "ACTIVE_STORE_NOT_FOUND",
              "Active store not found"
            );
          }

          const catalogProducts = await tx.catalogProduct.findMany({
            where: {
              id: { in: request.body.catalogProductIds },
              active: true
            }
          });
          const catalogProductsById = new Map(
            catalogProducts.map((catalogProduct) => [catalogProduct.id, catalogProduct])
          );
          const unavailableIds = request.body.catalogProductIds.filter(
            (id) => !catalogProductsById.has(id)
          );

          if (unavailableIds.length > 0) {
            throw new CatalogRequestError(
              404,
              "CATALOG_PRODUCT_NOT_FOUND",
              "One or more active catalog products were not found",
              { catalogProductIds: unavailableIds }
            );
          }

          const selectedCatalogProducts = request.body.catalogProductIds.map(
            (id) => catalogProductsById.get(id)!
          );
          const existingProducts = await tx.product.findMany({
            where: {
              storeId: activeStore.id,
              externalId: { in: selectedCatalogProducts.map((product) => product.externalId) }
            },
            select: { externalId: true }
          });

          if (existingProducts.length > 0) {
            throw new CatalogRequestError(
              409,
              "PRODUCT_ALREADY_ADDED",
              "One or more catalog products are already in the active store",
              { externalIds: existingProducts.map((product) => product.externalId) }
            );
          }

          const createdProducts = [];
          for (const catalogProduct of selectedCatalogProducts) {
            const createdProduct = await tx.product.create({
              data: {
                storeId: activeStore.id,
                externalId: catalogProduct.externalId,
                sku: null,
                name: catalogProduct.name,
                imageUrl: catalogProduct.imageUrl,
                category: catalogProduct.category,
                brand: null,
                stock: 0,
                previousPrice: null,
                currentPrice: catalogProduct.defaultPrice,
                marketplacePrice: null,
                competitorLowestPrice: null,
                minimumPrice: null,
                maximumPrice: null,
                botEnabled: false,
                normalizedStatus: ProductStatus.DRAFT,
                externalStatus: null,
                sourceUpdatedAt: null
              },
              include: { store: true }
            });
            createdProducts.push(createdProduct);
          }

          return createdProducts;
        });

        return reply.code(201).send({
          data: addedProducts.map(({ store, ...product }) => ({
            ...serializeProduct(product),
            store: serializeStore(store)
          })),
          addedCount: addedProducts.length
        });
      } catch (error) {
        if (error instanceof CatalogRequestError) {
          return reply.code(error.statusCode).send({
            error: {
              code: error.code,
              message: error.message,
              ...(error.details ? { details: error.details } : {})
            }
          });
        }

        if (isUniqueConstraintError(error)) {
          return reply.code(409).send({
            error: {
              code: "PRODUCT_ALREADY_ADDED",
              message: "One or more catalog products are already in the active store"
            }
          });
        }

        throw error;
      }
    }
  );
}
