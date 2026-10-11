import { useEffect, useMemo, useState } from "react";
import type { OrderStatus, OrdersResponse } from "../../types";
import { Icon, type IconName } from "../Icon";
import { OrderListDialog } from "./OrderListDialog";
import {
  EMPTY_ORDER_FILTERS,
  orderGroupCount,
  orderMatchesFilters,
  type OrderFilterValues,
  type OrderQuickFilter
} from "./orderFilters";
import {
  CANCELLED_ORDER_STATUSES,
  DELIVERED_ORDER_STATUSES,
  IN_DELIVERY_ORDER_STATUSES,
  NEW_ORDER_STATUSES,
  ORDER_STATUS_OPTIONS,
  centsToDecimalString,
  decimalStringToCents,
  formatAznDecimal,
  formatOrderId,
  orderStatusLabel,
  orderStatusTone
} from "./orderStatus";

type ModalKind = "new" | "delivered" | "inDelivery" | "cancelled" | null;

export interface OrdersDashboardProps {
  response: OrdersResponse | null;
  loading: boolean;
  error: string | null;
  onReload: () => Promise<void>;
}

const kpiCards: Array<{
  id: Exclude<ModalKind, null>;
  label: string;
  icon: IconName;
  statuses: readonly OrderStatus[];
}> = [
  { id: "new", label: "Yeni sifarişlər", icon: "refresh", statuses: NEW_ORDER_STATUSES },
  { id: "delivered", label: "Çatdırıldı", icon: "send", statuses: DELIVERED_ORDER_STATUSES },
  { id: "inDelivery", label: "Çatdırılmada", icon: "truck", statuses: IN_DELIVERY_ORDER_STATUSES },
  { id: "cancelled", label: "Ləğv edildi", icon: "ban", statuses: CANCELLED_ORDER_STATUSES }
];

const modalConfiguration: Record<Exclude<ModalKind, null>, { title: string; statuses: readonly OrderStatus[] }> = {
  new: { title: "Yeni sifarişlər", statuses: NEW_ORDER_STATUSES },
  delivered: { title: "Çatdırılan sifarişlər", statuses: DELIVERED_ORDER_STATUSES },
  inDelivery: { title: "Çatdırılmada olanlar", statuses: IN_DELIVERY_ORDER_STATUSES },
  cancelled: { title: "Ləğv edilən sifarişlər", statuses: CANCELLED_ORDER_STATUSES }
};

function formatDate(value: string | null | undefined, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("az-AZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(date);
}

function formatMinorUnits(value: bigint) {
  return formatAznDecimal(centsToDecimalString(value));
}

export function OrdersDashboard({ response, loading, error, onReload }: OrdersDashboardProps) {
  const orders = response?.data ?? [];
  const initialLoading = loading && !response;
  const ordersUnavailable = Boolean(error && !response);
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [draftFilters, setDraftFilters] = useState<OrderFilterValues>(EMPTY_ORDER_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<OrderFilterValues>(EMPTY_ORDER_FILTERS);
  const [quickFilter, setQuickFilter] = useState<OrderQuickFilter>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reloading, setReloading] = useState(false);
  const [reloadFeedback, setReloadFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const filteredOrders = useMemo(
    () => orders.filter((order) => orderMatchesFilters(order, appliedFilters, quickFilter)),
    [appliedFilters, orders, quickFilter]
  );
  const filteredTotal = useMemo(
    () => filteredOrders.reduce((total, order) => total + (decimalStringToCents(order.totalAmount) ?? 0n), 0n),
    [filteredOrders]
  );
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const visibleOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  async function reloadOrders() {
    setReloading(true);
    setReloadFeedback(null);
    try {
      await onReload();
      setReloadFeedback({ kind: "success", text: "Lokal sifariş məlumatları yenidən oxundu." });
    } catch (reason) {
      setReloadFeedback({
        kind: "error",
        text: reason instanceof Error ? reason.message : "Lokal sifariş məlumatlarını yeniləmək mümkün olmadı."
      });
    } finally {
      setReloading(false);
    }
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
    setPage(1);
  }

  function resetFilters() {
    setDraftFilters(EMPTY_ORDER_FILTERS);
    setAppliedFilters(EMPTY_ORDER_FILTERS);
    setQuickFilter(null);
    setPage(1);
  }

  function toggleQuickFilter(next: Exclude<OrderQuickFilter, null>) {
    setQuickFilter((current) => current === next ? null : next);
    setPage(1);
  }

  const activeModal = modalKind ? modalConfiguration[modalKind] : null;
  const modalOrders = activeModal
    ? orders.filter((order) => activeModal.statuses.includes(order.currentStatus))
    : [];

  return (
    <div className="orders-dashboard">
      <section className="orders-kpi-grid" aria-label="Sifariş göstəriciləri">
        {kpiCards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`orders-kpi-card orders-kpi-card--${card.id}`}
            onClick={() => setModalKind(card.id)}
            aria-label={`${card.label}: ${initialLoading ? "yüklənir" : ordersUnavailable ? "məlum deyil" : orderGroupCount(orders, card.statuses)}. Siyahını aç`}
          >
            <span className="orders-kpi-card__icon"><Icon name={card.icon} /></span>
            <Icon name="chevronRight" className="orders-kpi-card__chevron" />
            <strong>{initialLoading ? "…" : ordersUnavailable ? "—" : orderGroupCount(orders, card.statuses)}</strong>
            <span className="orders-kpi-card__label">{card.label}</span>
          </button>
        ))}
      </section>

      <section className="orders-load-panel" aria-labelledby="orders-load-heading">
        <header className="orders-section-heading">
          <span><Icon name="box" /></span>
          <div>
            <h2 id="orders-load-heading">Sifarişlərin yüklənməsi</h2>
            <p>Mağazanın bütün sifarişləri və hər birinin status tarixçəsi bota yüklənir.</p>
          </div>
        </header>

        <div className="orders-load-summary">
          <div><span>Yüklənmiş sifarişlər</span><strong>{initialLoading ? "…" : ordersUnavailable ? "—" : response?.summary.total ?? 0}</strong></div>
          <div><span>Son yenilənmə</span><strong>{formatDate(response?.summary.lastLoadedAt, true)}</strong></div>
          <div><span>Ən köhnə sifariş</span><strong>{formatDate(response?.summary.oldestOrderedAt)}</strong></div>
          <div><span>Ən yeni sifariş</span><strong>{formatDate(response?.summary.newestOrderedAt)}</strong></div>
        </div>

        {error ? <p className="orders-inline-feedback is-error" role="alert">{error}</p> : null}
        {reloadFeedback ? (
          <p className={`orders-inline-feedback is-${reloadFeedback.kind}`} role={reloadFeedback.kind === "error" ? "alert" : "status"}>
            {reloadFeedback.text}
          </p>
        ) : null}
        <button
          type="button"
          className="orders-load-button"
          onClick={() => void reloadOrders()}
          disabled={loading || reloading}
          aria-busy={reloading}
        >
          {reloading ? <span className="loading-spinner" /> : <Icon name="refresh" />}
          {reloading ? "Lokal məlumatlar oxunur…" : "Sifarişləri yüklə"}
        </button>
      </section>

      <section className="orders-search-panel" aria-labelledby="orders-search-heading">
        <header className="orders-search-panel__header">
          <div className="orders-section-heading">
            <span><Icon name="search" /></span>
            <div>
              <h2 id="orders-search-heading">Sifariş Axtarışı</h2>
              <p>Filtri təyin edib ya qısayoldan istifadə edin</p>
            </div>
          </div>
          <div className="orders-search-summary" aria-live="polite">
            <div><span>Cəmi sifariş</span><strong>{initialLoading ? "…" : ordersUnavailable ? "—" : filteredOrders.length}</strong></div>
            <div><span>Ümumi məbləğ</span><strong>{initialLoading || ordersUnavailable ? "—" : formatMinorUnits(filteredTotal)}</strong></div>
          </div>
        </header>

        <div className="orders-quick-filters" aria-label="Sifariş qısayolları">
          <span><Icon name="bolt" />Qısayollar</span>
          <button type="button" aria-pressed={quickFilter === "lost"} onClick={() => toggleQuickFilter("lost")}>
            <Icon name="alert" />İtmiş sifarişlər
          </button>
          <button type="button" aria-pressed={quickFilter === "success"} onClick={() => toggleQuickFilter("success")}>
            <Icon name="checkCircle" />Uğurlu sifarişlər
          </button>
          <button type="button" aria-pressed={quickFilter === "cancelled"} onClick={() => toggleQuickFilter("cancelled")}>
            <Icon name="ban" />Ləğv edilən sifarişlər
          </button>
        </div>

        <div className="orders-filter-grid">
          <label>
            <span>İlk status</span>
            <select
              value={draftFilters.initialStatus}
              onChange={(event) => setDraftFilters((current) => ({ ...current, initialStatus: event.target.value as "" | OrderStatus }))}
            >
              <option value="">— Heçbiri —</option>
              {ORDER_STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </label>
          <label>
            <span>Sonrakı status</span>
            <select
              value={draftFilters.nextStatus}
              onChange={(event) => setDraftFilters((current) => ({ ...current, nextStatus: event.target.value as "" | OrderStatus }))}
            >
              <option value="">— Heçbiri —</option>
              {ORDER_STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </label>
          <label>
            <span>Tarixdən</span>
            <input
              type="date"
              value={draftFilters.dateFrom}
              max={draftFilters.dateTo || undefined}
              onChange={(event) => setDraftFilters((current) => ({ ...current, dateFrom: event.target.value }))}
            />
          </label>
          <label>
            <span>Tarixə</span>
            <input
              type="date"
              value={draftFilters.dateTo}
              min={draftFilters.dateFrom || undefined}
              onChange={(event) => setDraftFilters((current) => ({ ...current, dateTo: event.target.value }))}
            />
          </label>
          <button type="button" className="orders-filter-apply" onClick={applyFilters}><Icon name="filter" />Tətbiq et</button>
          <button type="button" className="orders-filter-reset" onClick={resetFilters}>Sıfırla</button>
        </div>

        <div className="orders-table-scroll">
          <table className="orders-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">ORDER ID</th>
                <th scope="col">MÜŞTƏRİ</th>
                <th scope="col">CARİ STATUS</th>
                <th scope="col">SİFARİŞ TARİXİ</th>
                <th scope="col">ÜMUMİ MƏBLƏĞ</th>
                <th scope="col">STATUS SAYI</th>
              </tr>
            </thead>
            <tbody>
              {initialLoading ? (
                <tr><td colSpan={7} className="orders-table__empty"><span className="loading-spinner" /> Sifarişlər yüklənir…</td></tr>
              ) : ordersUnavailable ? (
                <tr><td colSpan={7} className="orders-table__empty">Sifariş məlumatlarını yükləmək mümkün olmadı</td></tr>
              ) : visibleOrders.length ? visibleOrders.map((order, index) => (
                <tr key={order.id}>
                  <td>{(page - 1) * pageSize + index + 1}</td>
                  <td><strong>{formatOrderId(order.externalId)}</strong></td>
                  <td>{order.customerName ?? "—"}</td>
                  <td><span className={`order-status-badge is-${orderStatusTone(order.currentStatus)}`}>{orderStatusLabel(order.currentStatus)}</span></td>
                  <td>{formatDate(order.orderedAt)}</td>
                  <td>{formatAznDecimal(order.totalAmount)}</td>
                  <td>{order.statusHistory.length}</td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="orders-table__empty">Nəticə tapılmadı</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="orders-pagination" aria-label="Sifariş səhifələmə">
          <span>
            {filteredOrders.length ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredOrders.length)}` : "0"}
            {` / ${filteredOrders.length}`}
          </span>
          <div>
            <button type="button" aria-label="Əvvəlki səhifə" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              <Icon name="chevronLeft" />
            </button>
            <span>Səhifə <strong>{page}</strong> / {totalPages}</span>
            <button type="button" aria-label="Növbəti səhifə" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
              <Icon name="chevronRight" />
            </button>
            <label>
              <span className="sr-only">Səhifədə sifariş sayı</span>
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                {[5, 10, 25, 50, 100].map((size) => <option key={size} value={size}>{size} / səhifə</option>)}
              </select>
            </label>
          </div>
        </footer>
      </section>

      {activeModal ? (
        <OrderListDialog
          open
          title={activeModal.title}
          orders={modalOrders}
          statuses={activeModal.statuses}
          loading={loading}
          error={error}
          onRetry={() => { void reloadOrders(); }}
          onClose={() => setModalKind(null)}
        />
      ) : null}
    </div>
  );
}
