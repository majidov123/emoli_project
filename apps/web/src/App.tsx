import { useEffect, useMemo, useRef, useState } from "react";
import { fetchProducts } from "./api";
import { AddProductDialog } from "./components/AddProductDialog";
import { BbuProductsTable } from "./components/BbuProductsTable";
import { BotFilterDrawer, DEFAULT_BOT_FILTERS } from "./components/BotFilterDrawer";
import {
  BotFilterToolbar,
  clearBotFilter,
  countBotFilters,
  type BotFilterKey
} from "./components/BotFilterToolbar";
import { BotProductsTable } from "./components/BotProductsTable";
import { ColumnManager, ColumnsButton } from "./components/ColumnManager";
import { LimitDialog } from "./components/LimitDialog";
import { Pagination } from "./components/Pagination";
import { ProductTabs } from "./components/ProductTabs";
import { StatusCards } from "./components/StatusCards";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { ExcelLimitPanel } from "./components/settings/ExcelLimitPanel";
import { ManagementDashboard } from "./components/settings/ManagementDashboard";
import { StoreHeader } from "./components/StoreHeader";
import { TableState } from "./components/TableState";
import { createProductFilters, reloadDashboardData } from "./dashboardState";
import { useColumnPreferences } from "./hooks/useColumnPreferences";
import {
  useDebouncedValue,
  useProductCategories,
  useProducts,
  useStores
} from "./hooks/useDashboardData";
import {
  BBU_COLUMNS,
  BBU_DEFAULT_VISIBLE,
  BOT_COLUMNS,
  BOT_DEFAULT_VISIBLE
} from "./tableColumns";
import type {
  AddProductsFromCatalogResponse,
  BotProductFilters,
  Product,
  ProductExportScope,
  ProductFilters,
  ProductSource,
  ProductStatus
} from "./types";
import {
  downloadProductsWorkbook,
  productMatchesExportScope
} from "./lib/productExcel";

const DEFAULT_PAGE_SIZE = 5;
const BBU_COLUMNS_STORAGE_KEY = "birmarket.dashboard.columns.bbu.v1";
const BOT_COLUMNS_STORAGE_KEY = "birmarket.dashboard.columns.bot.v1";

interface DashboardFeedback {
  tone: "success" | "error";
  message: string;
}

export function App() {
  const refreshingRef = useRef(false);
  const previousViewRef = useRef<"products" | "management">("products");
  const [source, setSource] = useState<ProductSource>("bbu");
  const [searchInput, setSearchInput] = useState("");
  const [bbuStatus, setBbuStatus] = useState<ProductStatus | undefined>();
  const [bbuPage, setBbuPage] = useState(1);
  const [bbuPageSize, setBbuPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [botFilters, setBotFilters] = useState<BotProductFilters>(DEFAULT_BOT_FILTERS);
  const [botPage, setBotPage] = useState(1);
  const [botPageSize, setBotPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [limitProduct, setLimitProduct] = useState<Product | null>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [columnManagerSource, setColumnManagerSource] = useState<ProductSource | null>(null);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<"products" | "management">("products");
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    window.localStorage.getItem("birmarket.dashboard.theme.v1") === "light" ? "light" : "dark"
  );
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<DashboardFeedback | null>(null);

  const search = useDebouncedValue(searchInput.trim(), 300);
  const stores = useStores();
  const categories = useProductCategories();

  const bbuColumns = useColumnPreferences(
    BBU_COLUMNS_STORAGE_KEY,
    BBU_COLUMNS,
    BBU_DEFAULT_VISIBLE
  );
  const botColumns = useColumnPreferences(
    BOT_COLUMNS_STORAGE_KEY,
    BOT_COLUMNS,
    BOT_DEFAULT_VISIBLE
  );

  const productFilters = useMemo<ProductFilters>(() => createProductFilters({
    source,
    search,
    bbuPage,
    bbuPageSize,
    bbuStatus,
    botPage,
    botPageSize,
    botFilters
  }), [
    bbuPage,
    bbuPageSize,
    bbuStatus,
    botFilters,
    botPage,
    botPageSize,
    search,
    source
  ]);

  const products = useProducts(productFilters);
  const activeStore = stores.data?.find((store) => store.active) ?? stores.data?.[0] ?? null;
  const productRows = products.data?.data ?? [];
  const pagination = products.data?.pagination;
  const botFilterCount = countBotFilters(botFilters);
  const hasActiveFilters = Boolean(search)
    || (source === "bbu" ? Boolean(bbuStatus) : botFilterCount > 0);

  useEffect(() => {
    if (!pagination || pagination.totalPages === 0) return;

    if (source === "bbu" && bbuPage > pagination.totalPages) {
      setBbuPage(pagination.totalPages);
    } else if (source === "bot" && botPage > pagination.totalPages) {
      setBotPage(pagination.totalPages);
    }
  }, [bbuPage, botPage, pagination, source]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [
    search,
    botFilters.botEnabled,
    botFilters.category,
    botFilters.minimumPrice,
    botFilters.stockBucket
  ]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("birmarket.dashboard.theme.v1", theme);
  }, [theme]);

  useEffect(() => {
    const previousView = previousViewRef.current;
    previousViewRef.current = view;

    if (previousView === "management" && view === "products") {
      window.requestAnimationFrame(() => {
        document.getElementById(`products-heading-${source}`)?.focus();
      });
    }
  }, [source, view]);

  function updateSearch(value: string) {
    setSearchInput(value);
    setBbuPage(1);
    setBotPage(1);
    setSelectedIds(new Set());
  }

  function updateBbuStatus(status?: ProductStatus) {
    setBbuStatus(status);
    setBbuPage(1);
  }

  function updateBbuPageSize(pageSize: number) {
    setBbuPageSize(pageSize);
    setBbuPage(1);
  }

  function updateBotPageSize(pageSize: number) {
    setBotPageSize(pageSize);
    setBotPage(1);
  }

  function applyBotFilters(filters: BotProductFilters) {
    setBotFilters(filters);
    setBotPage(1);
    setFilterDrawerOpen(false);
  }

  function removeBotFilter(key: BotFilterKey) {
    setBotFilters((current) => clearBotFilter(current, key));
    setBotPage(1);
  }

  function clearBotFilters() {
    setBotFilters(DEFAULT_BOT_FILTERS);
    setBotPage(1);
  }

  function clearCurrentFilters() {
    setSearchInput("");
    setBbuPage(1);
    setBotPage(1);
    if (source === "bbu") setBbuStatus(undefined);
    else setBotFilters(DEFAULT_BOT_FILTERS);
  }

  function toggleProduct(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePageSelection() {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = productRows.length > 0
        && productRows.every((product) => next.has(product.id));
      productRows.forEach((product) => {
        if (allSelected) next.delete(product.id);
        else next.add(product.id);
      });
      return next;
    });
  }

  async function reloadLocalData() {
    await reloadDashboardData([
      stores.refresh,
      products.refresh,
      categories.refresh
    ]);
  }

  async function refreshProducts() {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setFeedback(null);
    try {
      await reloadLocalData();
      setFeedback({ tone: "success", message: "Məhsullar yenidən yükləndi" });
    } catch (error: unknown) {
      setFeedback({
        tone: "error",
        message: error instanceof Error
          ? error.message
          : "Yerli məhsul məlumatlarını yenidən yükləmək mümkün olmadı."
      });
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }

  async function handleCatalogProductsAdded(result: AddProductsFromCatalogResponse) {
    const refreshResults = await Promise.allSettled([
      stores.refresh(),
      products.refresh(),
      categories.refresh()
    ]);
    setAddProductOpen(false);

    if (refreshResults.some((item) => item.status === "rejected")) {
      setFeedback({
        tone: "error",
        message: `${result.addedCount} məhsul əlavə edildi, lakin siyahını yeniləmək mümkün olmadı.`
      });
      return;
    }

    setFeedback({
      tone: "success",
      message: result.addedCount === 1
        ? "Məhsul yerli mağazaya əlavə edildi."
        : `${result.addedCount} məhsul yerli mağazaya əlavə edildi.`
    });
  }

  async function exportLocalProducts(scope: ProductExportScope = "ALL") {
    const controller = new AbortController();
    const rows: Product[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await fetchProducts({
        page,
        pageSize: 100,
        search: "",
        category: "",
        botEnabled: "all"
      }, controller.signal);
      rows.push(...response.data);
      totalPages = response.pagination.totalPages;
      page += 1;
    } while (page <= totalPages);

    const storeRows = activeStore
      ? rows.filter((product) => product.storeId === activeStore.id)
      : rows;
    await downloadProductsWorkbook(storeRows.filter((product) => productMatchesExportScope(product, scope)));
  }

  const tableState = products.loading ? (
    <TableState kind="loading" />
  ) : products.error ? (
    <TableState kind="error" message={products.error} onRetry={products.retry} />
  ) : productRows.length === 0 ? (
    <TableState kind="empty" hasActiveFilters={hasActiveFilters} onClear={clearCurrentFilters} />
  ) : null;

  if (view === "management") {
    return (
      <div className="app-shell app-shell--management">
        <ManagementDashboard onBack={() => setView("products")} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <StoreHeader
        store={activeStore}
        loading={stores.loading}
        error={stores.error}
        search={searchInput}
        refreshing={refreshing}
        onSearchChange={updateSearch}
        onRetry={stores.retry}
        onAddProduct={() => setAddProductOpen(true)}
        onRefreshProducts={() => void refreshProducts()}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {feedback && (
        <div
          className={`dashboard-feedback dashboard-feedback--${feedback.tone}`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Bildirişi bağla">×</button>
        </div>
      )}

      <main className="dashboard-content">
        <div className="source-switcher">
          <ProductTabs value={source} onChange={setSource} />
        </div>

        <div id="products-panel-bbu" role="tabpanel" aria-labelledby="tab-bbu" hidden={source !== "bbu"}>
          {source === "bbu" && (
            <>
              <StatusCards value={bbuStatus} onChange={updateBbuStatus} />

              <section className="products-section" aria-labelledby="products-heading-bbu">
                <div className="products-section__heading">
                  <div>
                    <span className="section-kicker">Məhsul idarəetməsi</span>
                    <h2 id="products-heading-bbu" tabIndex={-1}>BBU məhsulları</h2>
                    <p>{products.loading ? "Məlumatlar yenilənir…" : `${pagination?.total ?? 0} uyğun məhsul tapıldı`}</p>
                  </div>
                  <ColumnsButton count={bbuColumns.visibleCount} onClick={() => setColumnManagerSource("bbu")} />
                </div>

                <div className="products-panel" aria-busy={products.loading}>
                  {tableState ?? (
                    <>
                      <BbuProductsTable
                        products={productRows}
                        page={pagination?.page ?? bbuPage}
                        pageSize={pagination?.pageSize ?? bbuPageSize}
                        columns={bbuColumns.visibleColumns}
                        onEditLimits={setLimitProduct}
                      />
                      {pagination && (
                        <Pagination
                          pagination={pagination}
                          onPageChange={setBbuPage}
                          onPageSizeChange={updateBbuPageSize}
                        />
                      )}
                    </>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        <div id="products-panel-bot" role="tabpanel" aria-labelledby="tab-bot" hidden={source !== "bot"}>
          {source === "bot" && (
            <section className="products-section" aria-labelledby="products-heading-bot">
              <div className="products-section__heading">
                <div>
                  <span className="section-kicker">Məhsul idarəetməsi</span>
                  <h2 id="products-heading-bot" tabIndex={-1}>Bot məhsulları</h2>
                  <p>{products.loading ? "Məlumatlar yenilənir…" : `${pagination?.total ?? 0} uyğun məhsul tapıldı`}</p>
                </div>
              </div>

              <BotFilterToolbar
                filters={botFilters}
                visibleColumnCount={botColumns.visibleCount}
                onOpenFilters={() => setFilterDrawerOpen(true)}
                onOpenColumns={() => setColumnManagerSource("bot")}
                onRemoveFilter={removeBotFilter}
                onClearFilters={clearBotFilters}
              />

              {selectedIds.size > 0 && (
                <div className="selection-notice" role="status">
                  {selectedIds.size} məhsul lokal olaraq seçilib. Bu mərhələdə toplu əməliyyat yoxdur.
                </div>
              )}

              <div className="products-panel" aria-busy={products.loading}>
                {tableState ?? (
                  <>
                    <BotProductsTable
                      products={productRows}
                      columns={botColumns.visibleColumns}
                      selectedIds={selectedIds}
                      onToggleProduct={toggleProduct}
                      onTogglePage={togglePageSelection}
                      onEditLimits={setLimitProduct}
                    />
                    {pagination && (
                      <Pagination
                        pagination={pagination}
                        onPageChange={setBotPage}
                        onPageSizeChange={updateBotPageSize}
                      />
                    )}
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      <BotFilterDrawer
        open={filterDrawerOpen}
        value={botFilters}
        categories={categories.data ?? []}
        categoriesLoading={categories.loading}
        categoriesError={categories.error}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={applyBotFilters}
      />

      <ColumnManager
        open={columnManagerSource === "bbu"}
        dialogId="bbu"
        tableLabel="BBU məhsulları"
        columns={BBU_COLUMNS}
        order={bbuColumns.order}
        visibleIds={bbuColumns.visibleIds}
        onClose={() => setColumnManagerSource(null)}
        onToggle={bbuColumns.toggleVisibility}
        onMove={bbuColumns.moveColumn}
        onReset={bbuColumns.reset}
      />

      <ColumnManager
        open={columnManagerSource === "bot"}
        dialogId="bot"
        tableLabel="Bot məhsulları"
        columns={BOT_COLUMNS}
        order={botColumns.order}
        visibleIds={botColumns.visibleIds}
        onClose={() => setColumnManagerSource(null)}
        onToggle={botColumns.toggleVisibility}
        onMove={botColumns.moveColumn}
        onReset={botColumns.reset}
      />

      <LimitDialog product={limitProduct} onClose={() => setLimitProduct(null)} />

      <AddProductDialog
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        onAdded={handleCatalogProductsAdded}
      />

      <SettingsDrawer
        open={settingsOpen}
        storeName={activeStore?.name}
        storeUsername={activeStore?.externalId ?? activeStore?.platform}
        onClose={() => setSettingsOpen(false)}
        onExportProducts={exportLocalProducts}
        excelPanel={<ExcelLimitPanel onApplied={reloadLocalData} />}
        onOperationApplied={async () => {
          await reloadLocalData();
        }}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
        onOpenManagement={() => {
          setSettingsOpen(false);
          setView("management");
        }}
      />
    </div>
  );
}
