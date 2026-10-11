import { useEffect, useState, type KeyboardEvent } from "react";
import { ApiRequestError, fetchOrders, fetchSettingsManagementSummary } from "../../api";
import type { OrdersResponse, SettingsManagementSummary } from "../../types";
import { Icon, type IconName } from "../Icon";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { OrderListDialog } from "./OrderListDialog";
import { OrdersDashboard } from "./OrdersDashboard";
import { PickupPointsDashboard } from "./PickupPointsDashboard";
import { ORDER_STATUS_OPTIONS } from "./orderStatus";

type ManagementTab = "overview" | "orders" | "pickup" | "analytics" | "formula" | "productAnalytics" | "reports";

interface ManagementDashboardProps {
  onBack: () => void;
}

const tabs: Array<{ id: ManagementTab; label: string; icon: IconName }> = [
  { id: "overview", label: "Ümumi", icon: "grid" },
  { id: "orders", label: "Sifarişlər", icon: "bag" },
  { id: "pickup", label: "Götürülmə nöqtələri", icon: "truck" },
  { id: "analytics", label: "Analitika", icon: "sliders" },
  { id: "formula", label: "Qiymət düsturu", icon: "filter" },
  { id: "productAnalytics", label: "Məhsul analitikası", icon: "arrowUp" },
  { id: "reports", label: "Hesabat", icon: "columns" }
];

function messageForError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return null;
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof TypeError) return "Lokal API ilə əlaqə yaratmaq mümkün olmadı.";
  return "İdarəetmə məlumatlarını yükləmək mümkün olmadı.";
}

export function ManagementDashboard({ onBack }: ManagementDashboardProps) {
  const [activeTab, setActiveTab] = useState<ManagementTab>("overview");
  const [summary, setSummary] = useState<SettingsManagementSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersResponse, setOrdersResponse] = useState<OrdersResponse | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [allOrdersOpen, setAllOrdersOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = tabs[nextIndex];
    if (!next) return;
    setActiveTab(next.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`management-tab-${next.id}`)?.focus();
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    setSummaryLoading(true);
    setError(null);
    void fetchSettingsManagementSummary(controller.signal)
      .then((response) => setSummary(response.data))
      .catch((reason: unknown) => {
        const message = messageForError(reason);
        if (message) setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSummaryLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    setOrdersLoading(true);
    setOrdersError(null);
    void fetchOrders(controller.signal)
      .then(setOrdersResponse)
      .catch((reason: unknown) => {
        const message = messageForError(reason);
        if (message) setOrdersError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setOrdersLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function reloadOrders() {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const response = await fetchOrders();
      setOrdersResponse(response);
    } catch (reason) {
      const message = messageForError(reason) ?? "Lokal sifariş məlumatlarını yeniləmək mümkün olmadı.";
      setOrdersError(message);
      throw new Error(message);
    } finally {
      setOrdersLoading(false);
    }
  }

  async function reloadSummary() {
    setSummaryLoading(true);
    setError(null);
    try {
      const response = await fetchSettingsManagementSummary();
      setSummary(response.data);
    } catch (reason) {
      const message = messageForError(reason) ?? "Lokal göstəriciləri yeniləmək mümkün olmadı.";
      setError(message);
      throw new Error(message);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function reloadAnalytics() {
    await Promise.all([reloadOrders(), reloadSummary()]);
  }

  return (
    <main className="management-page">
      <nav className="management-breadcrumb" aria-label="Səhifə yolu">
        <button type="button" onClick={onBack}><Icon name="chevronLeft" />Məhsullar</button>
        <span aria-hidden="true">/</span>
        <span>İdarəetmə paneli</span>
      </nav>

      <div className="management-tabs" role="tablist" aria-label="İdarəetmə bölmələri">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`management-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`management-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => moveTab(event, index)}
          >
            <Icon name={tab.icon} />{tab.label}
          </button>
        ))}
      </div>

      <section id={`management-panel-${activeTab}`} role="tabpanel" aria-labelledby={`management-tab-${activeTab}`}>
        {activeTab === "orders" ? (
          <OrdersDashboard
            response={ordersResponse}
            loading={ordersLoading}
            error={ordersError}
            onReload={reloadOrders}
          />
        ) : activeTab === "pickup" ? (
          <PickupPointsDashboard storeId={summary?.store.id} />
        ) : activeTab === "analytics" ? (
          <AnalyticsDashboard
            orders={ordersResponse?.data ?? []}
            summary={summary}
            loading={ordersLoading || summaryLoading}
            error={ordersError || error}
            onRefresh={reloadAnalytics}
          />
        ) : summaryLoading && !summary ? (
          <div className="management-state" role="status"><span className="loading-spinner" />Lokal göstəricilər yüklənir…</div>
        ) : error ? (
          <div className="management-state management-state--error" role="alert">
            <Icon name="alert" /><p>{error}</p>
            <button type="button" className="button button--secondary" onClick={() => setReloadKey((value) => value + 1)}>Yenidən yoxla</button>
          </div>
        ) : activeTab !== "overview" ? (
          <div className="management-empty">
            <Icon name={tabs.find((tab) => tab.id === activeTab)?.icon ?? "grid"} />
            <h1>{tabs.find((tab) => tab.id === activeTab)?.label}</h1>
            <p>Bu bölmə üçün lokal məlumat yoxdur.</p>
            <span>Növbəti mərhələdə</span>
          </div>
        ) : summary ? (
          <>
            <div className="management-stat-grid">
              <article className="management-stat-card">
                <span><Icon name="box" /></span>
                <strong>{summary.activeProducts}</strong>
                <h2>Aktiv məhsullar</h2>
                <p>{summary.totalProducts} lokal məhsulun normallaşdırılmış statusuna əsaslanır</p>
              </article>
              <button
                type="button"
                className="management-stat-card management-stat-card--action"
                onClick={() => setAllOrdersOpen(true)}
                aria-label={ordersLoading && !ordersResponse
                  ? "Bütün lokal sifarişləri aç. Sifarişlər yüklənir"
                  : `Bütün lokal sifarişləri aç. ${ordersResponse?.summary.total ?? 0} sifariş`}
              >
                <span><Icon name="bag" /></span>
                <Icon name="chevronRight" className="management-stat-card__chevron" />
                <strong>{ordersLoading && !ordersResponse ? "…" : ordersResponse?.summary.total ?? "—"}</strong>
                <h2>Ümumi sifarişlər</h2>
                <p>{ordersError ? "Lokal sifarişləri oxumaq mümkün olmadı" : "Lokal sifariş siyahısına keç"}</p>
              </button>
              <article className="management-stat-card">
                <span><Icon name="bolt" /></span>
                <strong>{summary.botEnabled ? "Aktiv" : "Deaktiv"}</strong>
                <h2>Avtomatik yenilənmə</h2>
                <p>{summary.botEnabledProducts} məhsulda bot lokal olaraq aktivdir</p>
              </article>
              <article className="management-stat-card">
                <span><Icon name="draft" /></span>
                <strong aria-label="Qayda sayı mövcud deyil">—</strong>
                <h2>Fəal qaydalar</h2>
                <p>Qayda sayı üçün ayrıca məlumat mənbəyi yoxdur</p>
              </article>
            </div>

            <section className="management-system" aria-labelledby="system-status-heading">
              <h2 id="system-status-heading"><Icon name="refresh" />Sistem vəziyyəti</h2>
              <div className="management-system__grid">
                <div>
                  <span>Qiymət izləmə</span>
                  <strong className={summary.botEnabled ? "is-ok" : "is-idle"}>
                    {summary.botEnabled ? "Lokal olaraq aktiv" : "Deaktiv"}
                  </strong>
                </div>
                <div><span>Birmarket əlaqəsi</span><strong className="is-idle">Qoşulmayıb</strong></div>
                <div><span>Hesab vəziyyəti</span><strong className="is-ok">Lokal aktiv</strong></div>
              </div>
              <p>{summary.store.name} lokal aktiv mağaza kimi seçilib. Xarici marketplace bağlantısı yoxdur.</p>
            </section>
          </>
        ) : null}
      </section>

      {allOrdersOpen ? (
        <OrderListDialog
          open
          title="Bütün sifarişlər"
          orders={ordersResponse?.data ?? []}
          statuses={ORDER_STATUS_OPTIONS.map(({ value }) => value)}
          loading={ordersLoading}
          error={ordersError}
          onRetry={() => { void reloadOrders().catch(() => undefined); }}
          onClose={() => setAllOrdersOpen(false)}
        />
      ) : null}
    </main>
  );
}
