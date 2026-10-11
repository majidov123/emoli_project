import { useEffect, useRef, useState } from "react";
import { ApiRequestError, fetchSettingsHistory } from "../../api";
import { formatMoney } from "../../formatters";
import type { Pagination, SettingsHistoryEvent } from "../../types";
import { Icon } from "../Icon";

const HISTORY_PAGE_SIZE = 5;

interface PriceHistoryDialogProps {
  open: boolean;
  onClose: () => void;
}

function errorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return null;
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof TypeError) return "Lokal API ilə əlaqə yaratmaq mümkün olmadı.";
  return "Tarixçəni yükləmək mümkün olmadı.";
}

const operationLabels = {
  AUTO_ASSIGN_MINIMUM_LIMITS: "Məhsullara avtomatik limit təyin edildi",
  ADJUST_PRICES_TO_MINIMUM: "Qiymətlər limitə uyğun tənzimləndi",
  SET_PRICES_TO_MAXIMUM: "Qiymətlər üst limitə bərabərləşdirildi",
  INCREASE_PRICES: "Məhsul qiymətləri qaldırıldı",
  IMPORT_LIMITS: "Excel vasitəsilə limitlər əlavə edildi"
} as const;

const botRunLabels = {
  RUNNING: "Bot yoxlaması başladıldı",
  SUCCESS: "Bot yoxlaması tamamlandı",
  PARTIAL: "Bot yoxlaması qismən tamamlandı",
  FAILED: "Bot yoxlaması uğursuz oldu"
} as const;

const priceChangeLabels = {
  DECREASE: "Məhsulun qiyməti endirildi",
  INCREASE: "Məhsulun qiyməti artırıldı",
  UPPER_LIMIT: "Məhsulun qiyməti üst limitə bərabərləşdirildi",
  UNCHANGED: "Məhsulun qiyməti dəyişmədi"
} as const;

function eventTitle(event: SettingsHistoryEvent) {
  if (event.type === "BOT_RUN") {
    return event.status ? botRunLabels[event.status] : "Bot yoxlaması";
  }
  if (event.type === "PRICE_CHANGE") {
    return event.direction ? priceChangeLabels[event.direction] : "Qiymət dəyişikliyi";
  }
  const operation = event.operation ?? event.operationType;
  return operation ? operationLabels[operation] : "Parametr əməliyyatı";
}

function eventDetails(event: SettingsHistoryEvent) {
  if (event.type === "BOT_RUN") {
    return `${event.productsChecked ?? 0} məhsul yoxlanılıb · ${event.errorsCount ?? 0} xəta`;
  }
  if (event.type === "PRICE_CHANGE") {
    const productName = event.product?.name ?? event.productName ?? "Məhsul";
    const externalId = event.product?.externalId ?? event.productExternalId;
    const productLabel = externalId ? `${productName} · ${externalId}` : productName;
    return `${productLabel}: ${formatMoney(event.oldPrice ?? null)} → ${formatMoney(event.newPrice ?? null)}`;
  }
  return `${event.affectedCount ?? 0} məhsul dəyişdirilib · ${event.matchedCount ?? 0} məhsul yoxlanılıb · ${event.skippedCount ?? 0} məhsul keçilib`;
}

function formatHistoryDate(value: string | undefined) {
  if (!value) return "Tarix məlum deyil";
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

export function PriceHistoryDialog({ open, onClose }: PriceHistoryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<SettingsHistoryEvent[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setPage(1);
      setSearchInput("");
      setSearch("");
      setEvents([]);
      setPagination(null);
      setError(null);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      const next = searchInput.trim();
      setSearch((current) => {
        if (current === next) return current;
        setPage(1);
        setEvents([]);
        setPagination(null);
        return next;
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [open, searchInput]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetchSettingsHistory(page, HISTORY_PAGE_SIZE, search, controller.signal)
      .then((response) => {
        setEvents((current) => page === 1
          ? response.data
          : [...current, ...response.data.filter((event) => !current.some((item) => item.id === event.id))]);
        setPagination(response.pagination);
      })
      .catch((reason: unknown) => {
        const message = errorMessage(reason);
        if (message) setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, page, reloadKey, search]);

  function handleClose() {
    window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    if (open) onClose();
  }

  return (
    <dialog ref={dialogRef} className="settings-history-dialog" aria-labelledby="settings-history-title" onClose={handleClose}>
      <header className="settings-modal__header settings-history-dialog__header">
        <h2 id="settings-history-title">İstifadəçi keçmişi</h2>
        <button type="button" className="settings-icon-button" onClick={onClose} aria-label="İstifadəçi keçmişini bağla"><Icon name="x" /></button>
      </header>

      <div className="settings-modal__body settings-history-dialog__body" aria-busy={loading}>
        <label className="settings-history-search">
          <span className="sr-only">Tarixçə axtarın</span>
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tarixçə axtarın" autoComplete="off" />
        </label>
        <div className="settings-history-tabs" role="tablist" aria-label="Tarixçə görünüşü">
          <button type="button" role="tab" aria-selected="true">Ətraflı</button>
        </div>

        {loading && events.length === 0 ? (
          <div className="settings-loading" role="status"><span className="loading-spinner" />Tarixçə yüklənir…</div>
        ) : error && events.length === 0 ? (
          <div className="settings-load-error" role="alert"><Icon name="alert" /><p>{error}</p><button type="button" className="button button--secondary" onClick={() => setReloadKey((value) => value + 1)}>Yenidən yoxla</button></div>
        ) : events.length === 0 ? (
          <div className="settings-empty"><Icon name="refresh" /><p>{search ? "Axtarışa uyğun tarixçə qeydi tapılmadı." : "Tarixçə qeydi tapılmadı."}</p></div>
        ) : (
          <ol className="settings-history-feed">
            {events.map((event, index) => {
              const occurredAt = event.createdAt ?? event.occurredAt;
              return (
                <li key={event.id} className="settings-history-feed__item">
                  <div className="settings-history-feed__heading">
                    <h3>{eventTitle(event)}</h3>
                    <Icon name="chevronRight" className="settings-history-feed__chevron" />
                  </div>
                  <div className="settings-history-feed__activity">
                    <span className="settings-history-feed__icon" aria-hidden="true"><Icon name="refresh" /></span>
                    <div className="settings-history-feed__content">
                      <p>{eventDetails(event)}</p>
                      <time dateTime={occurredAt}>Tarix: {formatHistoryDate(occurredAt)}</time>
                    </div>
                  </div>
                  {index < events.length - 1 && <span className="settings-history-feed__separator" aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        )}

        {error && events.length > 0 && (
          <div className="settings-history-feed__error" role="alert">
            <p>{error}</p>
            <button type="button" className="button button--secondary" onClick={() => setReloadKey((value) => value + 1)}>Yenidən yoxla</button>
          </div>
        )}
        {!error && pagination && pagination.page < pagination.totalPages && (
          <div className="settings-history-more">
            <button type="button" className="button button--secondary" onClick={() => setPage(pagination.page + 1)} disabled={loading} aria-busy={loading}>
              {loading ? "Yüklənir…" : "Daha çox"}
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
