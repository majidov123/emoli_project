import { OrderStatus, Prisma, type PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import {
  serializeOrder,
  serializeOrderItem,
  serializeOrderStatusHistory
} from "./serializers.js";

const orderStatuses = Object.values(OrderStatus);

export function registerOrderRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/api/orders", async (_request, reply) => {
    const result = await prisma.$transaction(async (tx) => {
      const store = await tx.store.findFirst({
        where: { active: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true }
      });
      if (!store) return null;

      const where = { storeId: store.id };
      const orders = await tx.order.findMany({
        where,
        include: {
          items: { orderBy: { id: "asc" } },
          statusHistory: { orderBy: [{ occurredAt: "asc" }, { id: "asc" }] }
        },
        orderBy: [{ orderedAt: "desc" }, { id: "desc" }]
      });
      const aggregate = await tx.order.aggregate({
        where,
        _count: { _all: true },
        _sum: { totalAmount: true },
        _min: { orderedAt: true },
        _max: { orderedAt: true, loadedAt: true }
      });
      const statusGroups = await tx.order.groupBy({
        by: ["currentStatus"],
        where,
        orderBy: { currentStatus: "asc" },
        _count: { _all: true }
      });

      return { orders, aggregate, statusGroups };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

    if (!result) {
      return reply.code(404).send({
        error: { code: "ACTIVE_STORE_NOT_FOUND", message: "Active store not found" }
      });
    }

    const statusCounts = Object.fromEntries(
      orderStatuses.map((status) => [status, 0])
    ) as Record<OrderStatus, number>;
    for (const group of result.statusGroups) {
      statusCounts[group.currentStatus] = group._count._all;
    }

    return {
      data: result.orders.map(({ items, statusHistory, ...order }) => ({
        ...serializeOrder(order),
        items: items.map(serializeOrderItem),
        statusHistory: statusHistory.map(serializeOrderStatusHistory)
      })),
      summary: {
        total: result.aggregate._count._all,
        totalAmount: result.aggregate._sum.totalAmount?.toFixed(2) ?? "0.00",
        oldestOrderedAt: result.aggregate._min.orderedAt?.toISOString() ?? null,
        newestOrderedAt: result.aggregate._max.orderedAt?.toISOString() ?? null,
        lastLoadedAt: result.aggregate._max.loadedAt?.toISOString() ?? null,
        statusCounts
      }
    };
  });
}
