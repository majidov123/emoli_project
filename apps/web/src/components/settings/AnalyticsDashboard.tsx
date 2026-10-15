import { useEffect, useMemo, useState } from "react";
import type { IconName } from "../Icon";
import { Icon } from "../Icon";
import type { LocalOrder, SettingsManagementSummary } from "../../types";
import { formatAznDecimal } from "./orderStatus";
import { AnalyticsTooltip } from "./AnalyticsTooltip";
import {
  ANALYTICS_PERIOD_STORAGE_KEY,
  ANALYTICS_PERIOD_TOOLTIP,
  ANALYTICS_SECTION_TOOLTIPS,
  ANALYTICS_TOOLTIPS,
  PRICE_COMPARISON_COLUMN_TOOLTIPS,
  RANKING_TOOLTIPS,
  SETTLEMENT_TOOLTIPS,
  calculateAnalyticsMetrics,
  calculateTopProducts,
  currentMonthPeriod,
  ordersInPeriod,
  parseAnalyticsPeriod
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
  ["orderAmount", "SİFARİŞ MƏBLƏĞİ", "draft", "violet"],
  ["deliveredAmount", "ÇATDIRILMIŞ MƏBLƏĞ", "draft", "green"],
  ["deliveryPercentage", "ÇATDIRILMA %", "sliders", "blue"],
  ["sales", "SATIŞLAR", "draft", "green"],
  ["bankCommission", "BANK KOMİSSİYASI", "draft", "red"],
  ["commissionPercentage", "KOMİSSİYA %", "sliders", "orange"],
  ["umicoTr", "UMİCO TR", "draft", "purple"],
  ["trWithVat", "TR + ƏDV", "draft", "purple"],
  ["trPercentage", "TR %", "sliders", "blue"],
  ["installmentCommission", "TAKSİT KOMİSSİYASI", "draft", "orange"],
  ["netIncome", "XALİS GƏLİR", "draft", "green"],
  ["incomePercentage", "GƏLİR %", "sliders", "cyan"]
] as const satisfies ReadonlyArray<readonly [keyof typeof SETTLEMENT_TOOLTIPS, string, IconName, string]>;

const rankingCards = [
  { key: "top20Amount", title: "Top 20 məhsul", subtitle: "Dövriyyəyə görə", icon: "draft", mode: "amount", source: "local" },
  { key: "top20Quantity", title: "Top 20 məhsul", subtitle: "Miqdara görə", icon: "box", mode: "quantity", source: "local" },
  { key: "top100Amount", title: "Top 100 Birmarket", subtitle: "Məbləğə görə (marketplace)", icon: "draft", mode: "amount", source: "marketplace" },
  { key: "top100Quantity", title: "Top 100 Birmarket", subtitle: "Miqdara görə (marketplace)", icon: "box", mode: "quantity", source: "marketplace" }
] as const satisfies ReadonlyArray<{
  key: keyof typeof RANKING_TOOLTIPS;
  title: string;
  subtitle: string;
  icon: IconName;
  mode: "amount" | "quantity";
  source: "local" | "marketplace";
}>;

const comparisonColumns = [
  ["code", "KOD"],
  ["productName", "MƏHSUL ADI"],
  ["category", "KATEQORİYA"],
  ["brand", "BREND"],
  ["yourPrice", "SİZİN QİYMƏT"],
  ["minimumPrice", "MIN QİYMƏT"],
  ["difference", "FƏRQ %"],
  ["minimumSeller", "MIN SATICI"],
  ["sellerCount", "SATICI SAYI"],
  ["link", "LINK"]
] as const satisfies ReadonlyArray<readonly [keyof typeof PRICE_COMPARISON_COLUMN_TOOLTIPS, string]>;

function formatCount(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("az-AZ").format(value);
}

function formatRefreshTime(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(value);
}

function loadSavedPeriod() {
  if (typeof window === "undefined") return null;
  try {
    return parseAnalyticsPeriod(window.localStorage.getItem(ANALYTICS_PERIOD_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function AnalyticsDashboard({ orders, summary, loading, error, onRefresh }: AnalyticsDashboardProps) {
  const currentPeriod = useMemo(() => currentMonthPeriod(), []);
  const savedPeriod = useMemo(loadSavedPeriod, []);
  const [from, setFrom] = useState(savedPeriod?.from ?? currentPeriod.from);
  const [to, setTo] = useState(savedPeriod?.to ?? currentPeriod.to);
  const [mode, setMode] = useState<"current" | "custom">(savedPeriod ? "custom" : "current");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const period = mode === "current" ? currentPeriod : { from, to };
  const periodOrders = useMemo(() => ordersInPeriod(orders, period), [orders, period.from, period.to]);
  const metrics = useMemo(() => calculateAnalyticsMetrics(periodOrders, summary), [periodOrders, summary]);
  const topProductsByAmount = useMemo(() => calculateTopProducts(periodOrders, "amount"), [periodOrders]);
  const topProductsByQuantity = useMemo(() => calculateTopProducts(periodOrders, "quantity"), [periodOrders]);

  useEffect(() => {
    try {
      if (mode === "custom") {
        window.localStorage.setItem(ANALYTICS_PERIOD_STORAGE_KEY, JSON.stringify({ from, to }));
      } else {
        window.localStorage.removeItem(ANALYTICS_PERIOD_STORAGE_KEY);
      }
    } catch {
      // The dashboard remains usable if browser storage is unavailable.
    }
  }, [from, mode, to]);

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
            <AnalyticsTooltip label="Dövr seçimi" text={ANALYTICS_PERIOD_TOOLTIP} triggerClassName="analytics-static-info" triggerContent={<Icon name="info" />} />
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
          {settlementMetrics.map(([key, label, icon, tone]) => <article className="analytics-metric-card analytics-metric-card--compact" key={key}><span className="analytics-metric-card__icon" data-tone={tone}><Icon name={icon} /></span><div className="analytics-metric-card__label"><span>{label}</span><AnalyticsTooltip label={label} text={SETTLEMENT_TOOLTIPS[key]} /></div><strong>—</strong></article>)}
        </div>
      </section>

      <section className="analytics-section analytics-empty-chart" aria-labelledby="analytics-daily-heading">
        <header className="analytics-section__heading"><span className="analytics-section__icon"><Icon name="columns" /></span><div><h2 id="analytics-daily-heading">Günlük dinamika <AnalyticsTooltip label="Günlük dinamika" text={ANALYTICS_SECTION_TOOLTIPS.daily} /></h2><p>{mode === "current" ? "Cari ay" : "Seçilmiş dövr"} · Dövriyyə, sifariş, satış</p></div></header>
        <p>{periodOrders.length === 0 ? "Günlük məlumat yoxdur" : `${periodOrders.length} sifariş üzrə lokal dinamika mövcuddur`}</p>
      </section>

      <section className="analytics-top-grid" aria-label="Top məhsullar">
        {rankingCards.map((card) => {
          const products = card.source === "marketplace"
            ? []
            : card.mode === "amount" ? topProductsByAmount : topProductsByQuantity;
          const subtitle = card.source === "local"
            ? `${card.subtitle} · ${mode === "current" ? "Cari ay" : "Seçilmiş dövr"}`
            : card.subtitle;
          return <article className="analytics-table-panel" key={card.key}><header className="analytics-section__heading"><span className="analytics-section__icon"><Icon name={card.icon} /></span><div><h2>{card.title} <AnalyticsTooltip label={`${card.title} — ${card.subtitle}`} text={RANKING_TOOLTIPS[card.key]} /></h2><p>{subtitle}</p></div></header><AnalyticsProductTable products={products} mode={card.mode} emptyText={card.source === "marketplace" ? "Məlumat yoxdur — \"Yenilə\" basın" : "Məlumat yoxdur"} /></article>;
        })}
      </section>

      <section className="analytics-section analytics-table-panel" aria-labelledby="analytics-category-heading">
        <header className="analytics-section__heading"><span className="analytics-section__icon"><Icon name="edit" /></span><div><h2 id="analytics-category-heading">Kateqoriya üzrə satışlar <AnalyticsTooltip label="Kateqoriya üzrə satışlar" text={ANALYTICS_SECTION_TOOLTIPS.category} /></h2><p>{mode === "current" ? "Cari ay" : "Seçilmiş dövr"}</p></div></header>
        <div className="analytics-table-wrap"><table><thead><tr><th>Kateqoriya</th><th>Satış</th><th>Dövriyyə</th></tr></thead><tbody><tr><td colSpan={3}>Kateqoriya məlumatı mövcud deyil</td></tr></tbody></table></div>
      </section>

      <section className="analytics-section" aria-labelledby="analytics-price-heading">
        <header className="analytics-section__heading"><span className="analytics-section__icon"><Icon name="columns" /></span><div><h2 id="analytics-price-heading">Qiymət müqayisəsi <AnalyticsTooltip label="Qiymət müqayisəsi" text={ANALYTICS_SECTION_TOOLTIPS.priceComparison} /></h2><p>Lokal minimum qiymətlərlə müqayisə</p></div></header>
        <div className="analytics-comparison-grid"><article className="analytics-metric-card"><span className="analytics-metric-card__icon" data-tone="violet"><Icon name="edit" /></span><div className="analytics-metric-card__label"><span>Aktiv offer sayı</span></div><strong>{formatCount(metrics.activeProductCount)}</strong></article><article className="analytics-metric-card"><span className="analytics-metric-card__icon" data-tone="green"><Icon name="sliders" /></span><div className="analytics-metric-card__label"><span>Min. qiymətli olmaq</span></div><strong>—</strong><p>Müqayisə üçün lokal məlumat yoxdur</p></article></div>
        <div className="analytics-table-wrap analytics-comparison-table"><table><thead><tr>{comparisonColumns.map(([key, label]) => <th key={key}><span className="analytics-table-heading"><span>{label}</span><AnalyticsTooltip label={label} text={PRICE_COMPARISON_COLUMN_TOOLTIPS[key]} /></span></th>)}</tr></thead><tbody><tr><td colSpan={10}>Məlumat yoxdur</td></tr></tbody></table></div>
      </section>
    </div>
  );
}

function AnalyticsProductTable({ products, mode, emptyText }: { products: ReturnType<typeof calculateTopProducts>; mode: "amount" | "quantity"; emptyText: string }) {
  return <div className="analytics-table-wrap"><table><thead><tr><th>#</th><th>MƏHSUL</th><th>{mode === "amount" ? "MƏBLƏĞ" : "MİQDAR"}</th></tr></thead><tbody>{products.length === 0 ? <tr><td colSpan={3}>{emptyText}</td></tr> : products.map((product, index) => <tr key={product.name}><td>{index + 1}</td><td>{product.name}</td><td>{mode === "amount" ? formatAznDecimal(product.amount) : product.quantity}</td></tr>)}</tbody></table></div>;
}
