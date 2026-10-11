import type { LocalOrder, OrderStatus } from "../../types";
import {
  CANCELLED_ORDER_STATUSES,
  DELIVERED_ORDER_STATUSES,
  LOST_ORDER_STATUSES
} from "./orderStatus";

export type OrderQuickFilter = "lost" | "success" | "cancelled" | null;

export interface OrderFilterValues {
  initialStatus: "" | OrderStatus;
  nextStatus: "" | OrderStatus;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_ORDER_FILTERS: OrderFilterValues = {
  initialStatus: "",
  nextStatus: "",
  dateFrom: "",
  dateTo: ""
};

export function firstOrderStatus(order: LocalOrder): OrderStatus {
  if (!order.statusHistory.length) return order.currentStatus;

  return order.statusHistory.reduce((earliest, candidate) => (
    candidate.occurredAt < earliest.occurredAt ? candidate : earliest
  )).status;
}

export function laterOrderStatuses(order: LocalOrder): OrderStatus[] {
  return [...order.statusHistory]
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
    .slice(1)
    .map(({ status }) => status);
}

export function orderMatchesQuickFilter(order: LocalOrder, filter: OrderQuickFilter): boolean {
  if (filter === "lost") return LOST_ORDER_STATUSES.includes(order.currentStatus);
  if (filter === "success") return DELIVERED_ORDER_STATUSES.includes(order.currentStatus);
  if (filter === "cancelled") return CANCELLED_ORDER_STATUSES.includes(order.currentStatus);
  return true;
}

export function orderMatchesFilters(
  order: LocalOrder,
  filters: OrderFilterValues,
  quickFilter: OrderQuickFilter
): boolean {
  if (!orderMatchesQuickFilter(order, quickFilter)) return false;
  if (filters.initialStatus && firstOrderStatus(order) !== filters.initialStatus) return false;
  if (filters.nextStatus && !laterOrderStatuses(order).includes(filters.nextStatus)) return false;

  const orderedDate = order.orderedAt.slice(0, 10);
  if (filters.dateFrom && orderedDate < filters.dateFrom) return false;
  if (filters.dateTo && orderedDate > filters.dateTo) return false;
  return true;
}

export function orderGroupCount(orders: readonly LocalOrder[], statuses: readonly OrderStatus[]): number {
  return orders.reduce(
    (total, order) => total + (statuses.includes(order.currentStatus) ? 1 : 0),
    0
  );
}
