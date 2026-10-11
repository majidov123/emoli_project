import { useMemo, useState } from "react";
import type { IconName } from "../Icon";
import { Icon } from "../Icon";
import type { LocalOrder, SettingsManagementSummary } from "../../types";
import { formatAznDecimal } from "./orderStatus";
import { AnalyticsTooltip } from "./AnalyticsTooltip";
import {
  ANALYTICS_TOOLTIPS,
  calculateAnalyticsMetrics,
  calculateTopProducts,
  currentMonthPeriod,
  ordersInPeriod
} from "./managementData";

interface AnalyticsDashboardProps {
  orders: readonly LocalOrder[];
  summary: SettingsManagementSummary | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}

const metricCards: Array<{
  key: keyof typeof ANALYTICS_TOOLTIPS;
  label: string;
  icon: IconName;
  tone: string;
  note: string;
}> = [
  { key: "turnover", label: "Alış dövriyyəsi", icon: "draft", tone: "violet", note: "Cari ay" },
  { key: "orders", label: "Sifarişlərin sayı", icon: "bag", tone: "green", note: "Cari ay" },
  { key: "sales", label: "Satışların sayı", icon: "box", tone: "blue", note: "Çatdırılan · Cari ay" },
  { key: "deliveryRate", label: "Satış/Sifariş", icon: "sliders", tone: "orange", note: "ODR · Cari ay" },
  { key: "averageReceipt", label: "Orta Qəbz", icon: "edit", tone: "purple", note: "Ortalama · Cari ay" },
  { key: "rating", label: "Reytinq", icon: "checkCircle", tone: "orange", note: "Məlumat mənbəyi yoxdur" },
  { key: "products", label: "Məhsul sayı", icon: "box", tone: "cyan", note: "Ümumi" },
  { key: "activeProducts", label: "Aktiv məhsullar", icon: "arrowUp", tone: "green", note: "Aktiv offerlər" }
];

const settlementMetrics = [
  ["Sifariş məbləği", "draft", "violet"],
  ["Çatdırılmış məbləğ", "draft", "green"],
  ["Çatdırılma %", "sliders", "blue"],
  ["Satışlar", "draft", "green"],
  ["Bank komissiyası", "draft", "red"],
  ["Komissiya %", "sliders", "orange"],
  ["Lokal TR", "draft", "purple"],
  ["TR + ƏDV", "draft", "purple"],
  ["TR %", "sliders", "blue"],
  ["Taksit komissiyası", "draft", "orange"],
  ["Xalis gəlir", "draft", "green"],
  ["Gəlir %", "sliders", "cyan"]
] as const satisfies ReadonlyArray<readonly [string, IconName, string]>;

function formatCount(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("az-AZ").format(value);
}

function formatRefreshTime(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(value);
}

export function AnalyticsDashboard({ orders, summary, loading, error, onRefresh }: AnalyticsDashboardProps) {
  const currentPeriod = useMemo(() => currentMonthPeriod(), []);
  const [from, setFrom] = useState(currentPeriod.from);
  const [to, setTo] = useState(currentPeriod.to);
  const [mode, setMode] = useState<"current" | "custom">("current");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const period = mode === "current" ? currentPeriod : { from, to };
  const periodOrders = useMemo(() => ordersInPeriod(orders, period), [orders, period.from, period.to]);
  const metrics = useMemo(() => calculateAnalyticsMetrics(periodOrders, summary), [periodOrders, summary]);
  const topProducts = useMemo(() => calculateTopProducts(periodOrders), [periodOrders]);

  const values: Record<keyof typeof ANALYTICS_TOOLTIPS, string> = {
    turnover: formatAznDecimal(metrics.turnover),
    orders: formatCount(metrics.orderCount),
    sales: formatCount(metrics.salesCount),
    deliveryRate: metrics.deliveryRate === null ? "—" : `${metrics.deliveryRate.toLocaleString("az-AZ", { maximumFractionDigits: 1 })}%`,
    averageReceipt: formatAznDecimal(metrics.averageReceipt),
    rating: "—",
    products: formatCount(metrics.productCount),
    activeProducts: formatCount(metrics.activeProductCount)
  };

  async function refresh() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      await onRefresh();
      setLastRefresh(new Date());
    } catch (reason) {
      setRefreshError(reason instanceof Error ? reason.message : "Lokal məlumatları yeniləmək mümkün olmadı.");
    } finally {
      setRefreshing(false);
    }
  }

  function selectCurrentMonth() {
    setMode("current");
    setFrom(currentPeriod.from);
    setTo(currentPeriod.to);
  }

  return (
    <div className="analytics-dashboard">
      <section className="analytics-toolbar" aria-labelledby="analytics-heading">
        <div className="analytics-toolbar__top">
          <div className="analytics-title">
            <Icon name="arrowUp" />
            <div><h1 id="analytics-heading">Analitika</h1><p>Son yenilənmə: {formatRefreshTime(lastRefresh)} <span>Cari ay</span></p></div>
          </div>
          <div className="analytics-toolbar__actions">
            <button type="button" className="analytics-refresh" onClick={() => { void refresh(); }} disabled={refreshing || loading}>
              {refreshing ? <span className="loading-spinner" /> : <Icon name="refresh" />}Yenilə
            </button>
            <span className="analytics-static-info" aria-label="Analitika yalnız lokal məlumatlardan hesablanır" title="Analitika yalnız lokal məlumatlardan hesablanır"><Icon name="info" /></span>
          </div>
        </div>
        <div className="analytics-period">
          <span><Icon name="draft" />Dövr:</span>
          <button type="button" className={mode === "current" ? "is-active" : ""} onClick={selectCurrentMonth}>Cari ay</button>
          <div className="analytics-date-range">
            <label><span className="sr-only">Başlanğıc tarixi</span><input type="date" value={from} max={to} onChange={(event) => { setFrom(event.target.value); setMode("custom"); }} /></label>
            <span aria-hidden="true">→</span>
            <label><span className="sr-only">Son tarix</span><input type="date" value={to} min={from} onChange={(event) => { setTo(event.target.value); setMode("custom"); }} /></label>
          </div>
        </div>
        {refreshError || error ? <p className="analytics-inline-error" role="alert">{refreshError || error}</p> : null}
      </section>

      <section className="analytics-section" aria-labelledby="analytics-overview-heading">
        <header className="analytics-section__heading">
          <span className="analytics-section__icon"><Icon name="arrowUp" /></span>
          <div><h2 id="analytics-overview-heading">Ümumi göstəricilər</h2><p>{mode === "current" ? "Cari ay üzrə" : "Seçilmiş dövr üzrə"}</p></div>
        </header>
        <div className="analytics-metric-grid" aria-busy={loading}>
          {metricCards.map((card) => (
            <article className="analytics-metric-card" key={card.key}>
              <span className="analytics-metric-card__icon" data-tone={card.tone}><Icon name={card.icon} /></span>
              <div className="analytics-metric-card__label"><span>{card.label}</span><AnalyticsTooltip label={card.label} text={ANALYTICS_TOOLTIPS[card.key]} /></div>
              <strong>{loading && !summary ? "…" : values[card.key]}</strong>
              <p>{mode === "current" ? card.note : card.note.replace("Cari ay", "Seçilmiş dövr")}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="analytics-section" aria-labelledby="analytics-settlement-heading">
        <header className="analytics-section__heading"><span className="analytics-section__icon"><Icon name="draft" /></span><div><h2 id="analytics-settlement-heading">Hesablaşma məlumatları <span className="analytics-placeholder-help">?</span></h2><p>Maliyyə göstəriciləri</p></div></header>
        <div className="analytics-metric-grid analytics-metric-grid--settlement">
          {settlementMetrics.map(([label, icon, tone]) => <article className="analytics-metric-card analytics-metric-card--compact" key={label}><span className="analytics-metric-card__icon" data-tone={tone}><Icon name={icon} /></span><div className="analytics-metric-card__label"><span>{label}</span><span className="analytics-placeholder-help">?</span></div><strong>—</strong></article>)}
        </div>
      </section>

      <section className="analytics-section analytics-empty-chart" aria-labelledby="analytics-daily-heading">
        <header className="analytics-section__heading"><span className="analytics-section__icon"><Icon name="columns" /></span><div><h2 id="analytics-daily-heading">Günlük dinamika <span className="analytics-placeholder-help">?</span></h2><p>{mode === "current" ? "Cari ay" : "Seçilmiş dövr"} · Dövriyyə, sifariş, satış</p></div></header>
        <p>{periodOrders.length === 0 ? "Günlük məlumat yoxdur" : `${periodOrders.length} sifariş üzrə lokal dinamika mövcuddur`}</p>
      </section>

      <section className="analytics-top-grid" aria-label="Top məhsullar">
        <article className="analytics-table-panel"><header className="analytics-section__heading"><span className="analytics-section__icon"><Icon name="draft" /></span><div><h2>Top 20 məhsul <span className="analytics-placeholder-help">?</span></h2><p>Dövriyyəyə görə · {mode === "current" ? "Cari ay" : "Seçilmiş dövr"}</p></div></header><AnalyticsProductTable products={topProducts} mode="amount" /></article>
        <article className="analytics-table-panel"><header className="analytics-section__heading"><span className="analytics-section__icon"><Icon name="box" /></span><div><h2>Top 20 məhsul <span className="analytics-placeholder-help">?</span></h2><p>Miqdara görə · {mode === "current" ? "Cari ay" : "Seçilmiş dövr"}</p></div></header><AnalyticsProductTable products={[...topProducts].sort((a, b) => b.quantity - a.quantity)} mode="quantity" /></article>
      </section>

      <section className="analytics-section analytics-table-panel" aria-labelledby="analytics-category-heading">
        <header className="analytics-section__heading"><span className="analytics-section__icon"><Icon name="edit" /></span><div><h2 id="analytics-category-heading">Kateqoriya üzrə satışlar <span className="analytics-placeholder-help">?</span></h2><p>{mode === "current" ? "Cari ay" : "Seçilmiş dövr"}</p></div></header>
        <div className="analytics-table-wrap"><table><thead><tr><th>Kateqoriya</th><th>Satış</th><th>Dövriyyə</th></tr></thead><tbody><tr><td colSpan={3}>Kateqoriya məlumatı mövcud deyil</td></tr></tbody></table></div>
      </section>

      <section className="analytics-section" aria-labelledby="analytics-price-heading">
        <header className="analytics-section__heading"><span className="analytics-section__icon"><Icon name="columns" /></span><div><h2 id="analytics-price-heading">Qiymət müqayisəsi <span className="analytics-placeholder-help">?</span></h2><p>Lokal minimum qiymətlərlə müqayisə</p></div></header>
        <div className="analytics-comparison-grid"><article className="analytics-metric-card"><span className="analytics-metric-card__icon" data-tone="violet"><Icon name="edit" /></span><div className="analytics-metric-card__label"><span>Aktiv offer sayı</span></div><strong>{formatCount(metrics.activeProductCount)}</strong></article><article className="analytics-metric-card"><span className="analytics-metric-card__icon" data-tone="green"><Icon name="sliders" /></span><div className="analytics-metric-card__label"><span>Min. qiymətli olmaq</span></div><strong>—</strong><p>Müqayisə üçün lokal məlumat yoxdur</p></article></div>
        <div className="analytics-table-wrap analytics-comparison-table"><table><thead><tr><th>Kod</th><th>Məhsul adı</th><th>Kateqoriya</th><th>Brend</th><th>Sizin qiymət</th><th>Min qiymət</th><th>Fərq %</th><th>Min satıcı</th><th>Satıcı sayı</th><th>Link</th></tr></thead><tbody><tr><td colSpan={10}>Məlumat yoxdur</td></tr></tbody></table></div>
      </section>
    </div>
  );
}

function AnalyticsProductTable({ products, mode }: { products: ReturnType<typeof calculateTopProducts>; mode: "amount" | "quantity" }) {
  return <div className="analytics-table-wrap"><table><thead><tr><th>#</th><th>Məhsul</th><th>{mode === "amount" ? "Məbləğ" : "Miqdar"}</th></tr></thead><tbody>{products.length === 0 ? <tr><td colSpan={3}>Məlumat yoxdur</td></tr> : products.map((product, index) => <tr key={product.name}><td>{index + 1}</td><td>{product.name}</td><td>{mode === "amount" ? formatAznDecimal(product.amount) : product.quantity}</td></tr>)}</tbody></table></div>;
}
