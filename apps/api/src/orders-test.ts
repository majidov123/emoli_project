import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { OrderStatus, Prisma, PrismaClient } from "@prisma/client";
import { buildApp } from "./app.js";

interface OrderItemDto {
  id: string;
  productExternalId: string | null;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: string;
}

interface OrderStatusHistoryDto {
  id: string;
  status: OrderStatus;
  occurredAt: string;
}

interface OrderDto {
  id: string;
  externalId: string;
  customerName: string | null;
  totalAmount: string;
  orderedAt: string;
  currentStatus: OrderStatus;
  loadedAt: string;
  items: OrderItemDto[];
  statusHistory: OrderStatusHistoryDto[];
}

interface OrdersResponse {
  data: OrderDto[];
  summary: {
    total: number;
    totalAmount: string;
    oldestOrderedAt: string | null;
    newestOrderedAt: string | null;
    lastLoadedAt: string | null;
    statusCounts: Record<OrderStatus, number>;
  };
}

const moneyPattern = /^\d+\.\d{2}$/;

function moneyToCents(value: string): bigint {
  assert.match(value, moneyPattern);
  const [whole, fraction] = value.split(".");
  return BigInt(whole!) * 100n + BigInt(fraction!);
}

function centsToMoney(value: bigint): string {
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

async function main() {
  const prisma = new PrismaClient();
  const token = randomUUID();
  const fixtureOrderId = randomUUID();
  const itemIds = [randomUUID(), randomUUID()].sort();
  const historyIds = [randomUUID(), randomUUID()];
  const orderedAt = new Date("2026-09-02T13:14:15.000Z");
  const loadedAt = new Date("2026-09-03T09:45:00.000Z");
  let app: ReturnType<typeof buildApp> | undefined;
  let fixtureCreated = false;

  try {
    const activeStore = await prisma.store.findFirst({
      where: { active: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true }
    });
    assert.ok(activeStore, "Orders test requires an active local store");

    await prisma.order.create({
      data: {
        id: fixtureOrderId,
        storeId: activeStore.id,
        externalId: `TEST-ORDER-${token}`,
        customerName: `Disposable customer ${token}`,
        totalAmount: new Prisma.Decimal("123.45"),
        orderedAt,
        currentStatus: OrderStatus.CUSTOMER_CONFIRMED,
        loadedAt,
        items: {
          create: [
            {
              id: itemIds[1]!,
              productExternalId: `TEST-PRODUCT-${token}-2`,
              productName: "Disposable order probe B",
              imageUrl: null,
              quantity: 1,
              unitPrice: new Prisma.Decimal("100.00")
            },
            {
              id: itemIds[0]!,
              productExternalId: `TEST-PRODUCT-${token}-1`,
              productName: "Disposable order probe A",
              imageUrl: null,
              quantity: 1,
              unitPrice: new Prisma.Decimal("23.45")
            }
          ]
        },
        statusHistory: {
          create: [
            {
              id: historyIds[1]!,
              status: OrderStatus.CUSTOMER_CONFIRMED,
              occurredAt: new Date("2026-09-02T13:30:00.000Z")
            },
            {
              id: historyIds[0]!,
              status: OrderStatus.NEW,
              occurredAt: orderedAt
            }
          ]
        }
      }
    });
    fixtureCreated = true;

    app = buildApp({ logger: false, prisma });
    await app.ready();

    const response = await app.inject({ method: "GET", url: "/api/orders" });
    assert.equal(response.statusCode, 200);
    const body = response.json<OrdersResponse>();
    const fixture = body.data.find((order) => order.id === fixtureOrderId);
    assert.ok(fixture, "Orders response must include the local fixture order");
    assert.equal(fixture.externalId, `TEST-ORDER-${token}`);
    assert.equal(fixture.customerName, `Disposable customer ${token}`);
    assert.equal(fixture.totalAmount, "123.45");
    assert.equal(fixture.orderedAt, orderedAt.toISOString());
    assert.equal(fixture.loadedAt, loadedAt.toISOString());
    assert.equal(fixture.currentStatus, OrderStatus.CUSTOMER_CONFIRMED);
    assert.deepEqual(fixture.items.map((item) => item.id), itemIds);
    assert.deepEqual(fixture.items.map((item) => item.unitPrice), ["23.45", "100.00"]);
    assert.deepEqual(
      fixture.statusHistory.map((entry) => [entry.status, entry.occurredAt]),
      [
        [OrderStatus.NEW, orderedAt.toISOString()],
        [OrderStatus.CUSTOMER_CONFIRMED, "2026-09-02T13:30:00.000Z"]
      ]
    );

    for (let index = 1; index < body.data.length; index += 1) {
      const previous = body.data[index - 1]!;
      const current = body.data[index]!;
      const previousTimestamp = Date.parse(previous.orderedAt);
      const currentTimestamp = Date.parse(current.orderedAt);
      assert.ok(
        previousTimestamp > currentTimestamp ||
          (previousTimestamp === currentTimestamp && previous.id > current.id),
        "Orders must be sorted by order date and id descending"
      );
    }

    assert.equal(body.summary.total, body.data.length);
    const expectedTotal = body.data.reduce(
      (sum, order) => sum + moneyToCents(order.totalAmount),
      0n
    );
    assert.equal(body.summary.totalAmount, centsToMoney(expectedTotal));

    const orderedDates = body.data.map((order) => order.orderedAt).sort();
    const loadedDates = body.data.map((order) => order.loadedAt).sort();
    assert.equal(body.summary.oldestOrderedAt, orderedDates[0] ?? null);
    assert.equal(body.summary.newestOrderedAt, orderedDates.at(-1) ?? null);
    assert.equal(body.summary.lastLoadedAt, loadedDates.at(-1) ?? null);

    for (const status of Object.values(OrderStatus)) {
      assert.equal(
        body.summary.statusCounts[status],
        body.data.filter((order) => order.currentStatus === status).length,
        `Status count mismatch for ${status}`
      );
    }
    assert.deepEqual(Object.keys(body.summary.statusCounts).sort(), Object.values(OrderStatus).sort());

    console.log(
      "Orders API test passed: local scope, nested records, ordering, status counts, and exact decimal/date summaries verified."
    );
  } finally {
    if (fixtureCreated) {
      await prisma.order.deleteMany({ where: { id: fixtureOrderId } });
    }
    if (app) {
      await app.close();
    } else {
      await prisma.$disconnect();
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
