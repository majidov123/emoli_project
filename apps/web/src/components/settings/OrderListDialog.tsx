import { useEffect, useId, useRef, useState } from "react";
import type { LocalOrder, OrderStatus } from "../../types";
import { Icon } from "../Icon";
import {
  ORDER_STATUS_OPTIONS,
  formatAznDecimal,
  formatOrderId,
  orderStatusLabel,
  orderStatusTone,
  type OrderDialogStatusOption
} from "./orderStatus";

export interface OrderListDialogProps {
  open: boolean;
  title: string;
  orders: readonly LocalOrder[];
  statuses?: readonly OrderStatus[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onClose: () => void;
}

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarix məlum deyil";
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function safeLocalImageSource(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (value.startsWith("data:image/") || value.startsWith("blob:")) return value;
  return null;
}

function OrderItemImage({ source }: { source: string | null }) {
  const [failed, setFailed] = useState(false);
  const safeSource = safeLocalImageSource(source);

  useEffect(() => setFailed(false), [safeSource]);

  if (!safeSource || failed) {
    return <span className="settings-order-card__placeholder" aria-hidden="true"><Icon name="image" /></span>;
  }

  return (
    <span className="settings-order-card__image" aria-hidden="true">
      <img src={safeSource} alt="" onError={() => setFailed(true)} />
    </span>
  );
}

export function OrderListDialog({
  open,
  title,
  orders,
  statuses,
  loading = false,
  error = null,
  onRetry,
  onClose
}: OrderListDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const statusSelectRef = useRef<HTMLSelectElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [selectedStatus, setSelectedStatus] = useState<OrderDialogStatusOption>("ALL");
  const statusesKey = statuses?.join("|") ?? "ALL";

  const availableStatusOptions = !statuses || statuses.length === 0
    ? ORDER_STATUS_OPTIONS
    : statuses.flatMap((status) => {
      const option = ORDER_STATUS_OPTIONS.find((candidate) => candidate.value === status);
      return option ? [option] : [];
    });
  const scopedOrders = !statuses || statuses.length === 0
    ? orders
    : orders.filter((order) => statuses.includes(order.currentStatus));
  const visibleOrders = selectedStatus === "ALL"
    ? scopedOrders
    : scopedOrders.filter((order) => order.currentStatus === selectedStatus);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setSelectedStatus("ALL");
      dialog.showModal();
      window.requestAnimationFrame(() => {
        if (statusSelectRef.current && !statusSelectRef.current.disabled) statusSelectRef.current.focus();
        else closeButtonRef.current?.focus();
      });
    } else if (!open && dialog.open) {
      dialog.close();
      previousFocusRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (open) setSelectedStatus("ALL");
  }, [open, statusesKey]);

  function handleNativeClose() {
    previousFocusRef.current?.focus();
    if (open) onClose();
  }

  function requestClose() {
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className="settings-order-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={handleNativeClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <header className="settings-order-dialog__header">
        <div>
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId} className="sr-only">Yalnız lokal verilənlər bazasına yüklənmiş sifarişlər göstərilir.</p>
        </div>
        <div className="settings-order-dialog__header-actions">
          <label className="settings-order-dialog__status-field">
            <span className="sr-only">Status</span>
            <select
              ref={statusSelectRef}
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as OrderDialogStatusOption)}
              disabled={loading}
            >
              <option value="ALL">Hamısı</option>
              {availableStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button
            ref={closeButtonRef}
            type="button"
            className="settings-icon-button"
            onClick={requestClose}
            aria-label="Sifariş siyahısını bağla"
          >
            <Icon name="x" />
          </button>
        </div>
      </header>

      <p className="sr-only" role="status" aria-live="polite">
        {loading ? "Sifarişlər yüklənir…" : `${visibleOrders.length} sifariş göstərilir`}
      </p>

      <div className="settings-order-dialog__content" aria-busy={loading}>
        {loading && orders.length === 0 ? (
          <div className="settings-order-dialog__state" role="status">
            <span className="loading-spinner" aria-hidden="true" />
            <p>Sifarişlər yüklənir…</p>
          </div>
        ) : error && orders.length === 0 ? (
          <div className="settings-order-dialog__state is-error" role="alert">
            <Icon name="alert" />
            <p>{error}</p>
            {onRetry && <button type="button" className="button button--secondary" onClick={onRetry}>Yenidən yoxla</button>}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="settings-order-dialog__state">
            <Icon name="bag" />
            <p>{selectedStatus === "ALL" ? "Sifariş tapılmadı." : "Seçilən statusda sifariş tapılmadı."}</p>
          </div>
        ) : (
          <ol className="settings-order-dialog__list">
            {visibleOrders.map((order) => {
              const representativeItem = order.items[0] ?? null;
              const additionalItemCount = Math.max(0, order.items.length - 1);

              return (
                <li key={order.id}>
                  <article className="settings-order-card">
                    <OrderItemImage source={representativeItem?.imageUrl ?? null} />
                    <div className="settings-order-card__body">
                      <header className="settings-order-card__header">
                        <div>
                          <span>Sifariş nömrəsi</span>
                          <h3>{formatOrderId(order.externalId)}</h3>
                        </div>
                        <span className="settings-order-card__status" data-tone={orderStatusTone(order.currentStatus)}>
                          {orderStatusLabel(order.currentStatus)}
                        </span>
                      </header>

                      <div className="settings-order-card__product">
                        <strong>{representativeItem?.productName ?? "Məhsul məlumatı yoxdur"}</strong>
                        {additionalItemCount > 0 ? <span>+{additionalItemCount} məhsul</span> : null}
                      </div>

                      <dl className="settings-order-card__meta">
                        <div><dt>Müştəri</dt><dd>{order.customerName ?? "—"}</dd></div>
                        <div><dt>Ümumi məbləğ</dt><dd>{formatAznDecimal(order.totalAmount)}</dd></div>
                        <div><dt>Sifariş tarixi</dt><dd><time dateTime={order.orderedAt}>{formatOrderDate(order.orderedAt)}</time></dd></div>
                      </dl>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        )}

        {error && orders.length > 0 && (
          <div className="settings-order-dialog__inline-error" role="alert">
            <p>{error}</p>
            {onRetry && <button type="button" className="button button--secondary" onClick={onRetry}>Yenidən yoxla</button>}
          </div>
        )}
      </div>
    </dialog>
  );
}
