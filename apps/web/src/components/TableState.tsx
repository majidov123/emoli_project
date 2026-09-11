import { Icon } from "./Icon";

interface TableStateProps {
  kind: "loading" | "error" | "empty";
  message?: string;
  hasActiveFilters?: boolean;
  onRetry?: () => void;
  onClear?: () => void;
}

export function TableState({ kind, message, hasActiveFilters, onRetry, onClear }: TableStateProps) {
  if (kind === "loading") {
    return (
      <div className="table-state table-state--loading" role="status" aria-live="polite">
        <span className="loading-spinner" aria-hidden="true" />
        <div>
          <strong>Məhsullar yüklənir</strong>
          <p>Seed məlumatları verilənlər bazasından alınır…</p>
        </div>
      </div>
    );
  }

  if (kind === "error") {
    return (
      <div className="table-state table-state--error" role="alert">
        <span className="table-state__icon"><Icon name="alert" /></span>
        <div>
          <strong>Məhsulları yükləmək mümkün olmadı</strong>
          <p>{message ?? "API və PostgreSQL bağlantısını yoxlayın."}</p>
          {onRetry && <button type="button" className="button button--secondary" onClick={onRetry}>Yenidən yoxla</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="table-state" role="status">
      <span className="table-state__icon"><Icon name="box" /></span>
      <div>
        <strong>{hasActiveFilters ? "Uyğun məhsul tapılmadı" : "Məhsul yoxdur"}</strong>
        <p>{hasActiveFilters ? "Axtarış və ya filtr seçimlərini dəyişin." : "Seed məlumatları əlavə edildikdən sonra məhsullar burada görünəcək."}</p>
        {hasActiveFilters && onClear && <button type="button" className="button button--secondary" onClick={onClear}>Filtrləri təmizlə</button>}
      </div>
    </div>
  );
}
