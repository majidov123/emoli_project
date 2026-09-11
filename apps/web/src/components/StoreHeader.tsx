import { Icon } from "./Icon";
import type { Store } from "../types";

interface StoreHeaderProps {
  store: Store | null;
  loading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onRetry: () => void;
}

export function StoreHeader({
  store,
  loading,
  error,
  search,
  onSearchChange,
  onRetry
}: StoreHeaderProps) {
  return (
    <header className="dashboard-header">
      <div className={`store-banner ${store?.active ? "store-banner--active" : ""}`} role="status">
        <span className="store-banner__icon" aria-hidden="true">
          <Icon name={error ? "alert" : "checkCircle"} />
        </span>
        <div>
          {loading ? (
            <p className="store-banner__title">Mağaza məlumatı yüklənir…</p>
          ) : error ? (
            <>
              <p className="store-banner__title">Mağaza məlumatı yüklənmədi</p>
              <button className="text-button" type="button" onClick={onRetry}>Yenidən yoxla</button>
            </>
          ) : store ? (
            <>
              <p className="store-banner__title">
                {store.active ? "Mağazanız idarəetmə panelində aktivdir" : "Mağaza hazırda deaktivdir"}
              </p>
              <p className="store-banner__meta">Sistemdə məhsul sayı: {store.productCount}</p>
            </>
          ) : (
            <p className="store-banner__title">Aktiv mağaza tapılmadı</p>
          )}
        </div>
      </div>

      <section className="store-panel" aria-labelledby="store-title">
        <div className="store-panel__identity">
          <span className="section-kicker">Aktiv mağaza</span>
          <h1 id="store-title">{store?.name ?? (loading ? "Yüklənir…" : "Mağaza yoxdur")}</h1>
          <p>{store ? `${store.productCount} məhsulun ümumi siyahısı` : "Məhsul idarəetməsi"}</p>
        </div>

        <div className="store-panel__actions" aria-label="Mağaza əməliyyatları">
          <button type="button" className="button button--primary" disabled title="Növbəti mərhələdə aktiv olacaq">
            <Icon name="plus" />
            Məhsul əlavə et
          </button>
          <button type="button" className="button button--secondary" disabled title="Növbəti mərhələdə aktiv olacaq">
            <Icon name="refresh" />
            Məhsulları yenilə
          </button>
          <button type="button" className="button button--primary" disabled title="Növbəti mərhələdə aktiv olacaq">
            <Icon name="sliders" />
            Parametrlər
          </button>
        </div>

        <label className="search-field">
          <span className="sr-only">Məhsul axtar</span>
          <Icon name="search" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Ad, SKU və ya kod axtar…"
            autoComplete="off"
          />
        </label>

        <p className="store-panel__notice">
          Əlavə etmə, yeniləmə və parametrlər növbəti mərhələlərdə aktiv olacaq.
        </p>
      </section>
    </header>
  );
}
