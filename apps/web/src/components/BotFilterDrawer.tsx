import { useEffect, useRef, useState } from "react";
import type {
  BotEnabledFilter,
  BotProductFilters,
  MinimumPriceFilter,
  StockBucketFilter
} from "../types";
import { Icon } from "./Icon";

export const DEFAULT_BOT_FILTERS: BotProductFilters = {
  botEnabled: "all",
  stockBucket: "all",
  minimumPrice: "all",
  category: ""
};

interface BotFilterDrawerProps {
  open: boolean;
  value: BotProductFilters;
  categories: string[];
  categoriesLoading: boolean;
  categoriesError: string | null;
  onClose: () => void;
  onApply: (filters: BotProductFilters) => void;
}

interface Choice<T extends string> {
  value: T;
  label: string;
}

function ChoicePill<T extends string>({
  choice,
  selected,
  onSelect,
  disabled = false
}: {
  choice: Choice<T>;
  selected: boolean;
  onSelect: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="choice-pill"
      aria-pressed={selected}
      onClick={() => onSelect(choice.value)}
      disabled={disabled}
    >
      {choice.label}
    </button>
  );
}

const botStatusChoices: Choice<Exclude<BotEnabledFilter, "all">>[] = [
  { value: "enabled", label: "Aktiv" },
  { value: "disabled", label: "Deaktiv" }
];

const stockChoices: Choice<Exclude<StockBucketFilter, "all">>[] = [
  { value: "OUT", label: "Bitmişdir (0)" },
  { value: "LOW", label: "Azdır (1–5)" },
  { value: "IN_STOCK", label: "Stokdadır (>5)" }
];

const limitChoices: Choice<Exclude<MinimumPriceFilter, "all">>[] = [
  { value: "unlimited", label: "Limitsiz" },
  { value: "limited", label: "Limitli" }
];

export function BotFilterDrawer({
  open,
  value,
  categories,
  categoriesLoading,
  categoriesError,
  onClose,
  onApply
}: BotFilterDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<BotProductFilters>(value);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setDraft(value);
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      previousFocusRef.current?.focus();
    }
  }, [open, value]);

  function toggleBotStatus(next: Exclude<BotEnabledFilter, "all">) {
    setDraft((current) => ({
      ...current,
      botEnabled: current.botEnabled === next ? "all" : next
    }));
  }

  function toggleStock(next: Exclude<StockBucketFilter, "all">) {
    setDraft((current) => ({
      ...current,
      stockBucket: current.stockBucket === next ? "all" : next
    }));
  }

  function toggleLimit(next: Exclude<MinimumPriceFilter, "all">) {
    setDraft((current) => ({
      ...current,
      minimumPrice: current.minimumPrice === next ? "all" : next
    }));
  }

  function applyFilters() {
    onApply(draft);
  }

  function handleDialogClose() {
    previousFocusRef.current?.focus();
    if (open) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="bot-filter-drawer"
      aria-labelledby="bot-filter-title"
      aria-describedby="bot-filter-description"
      onClose={handleDialogClose}
    >
      <header className="drawer-header">
        <span className="drawer-header__icon"><Icon name="sliders" /></span>
        <div>
          <h2 id="bot-filter-title">Məhsul filtri</h2>
          <p id="bot-filter-description">Tətbiq edilən seçimlər API sorğusuna əlavə olunur.</p>
        </div>
        <button type="button" className="icon-button drawer-header__close" onClick={onClose} aria-label="Filtr panelini bağla">
          <Icon name="x" />
        </button>
      </header>

      <div className="drawer-content">
        <fieldset className="filter-group">
          <legend>Botdakı statusu</legend>
          <div className="choice-list">
            {botStatusChoices.map((choice) => (
              <ChoicePill
                key={choice.value}
                choice={choice}
                selected={draft.botEnabled === choice.value}
                onSelect={toggleBotStatus}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="filter-group filter-group--unavailable" aria-describedby="bbu-status-note">
          <legend>BBU-dakı statusu</legend>
          <div className="choice-list">
            <ChoicePill choice={{ value: "active", label: "Aktiv" }} selected={false} onSelect={() => undefined} disabled />
            <ChoicePill choice={{ value: "inactive", label: "Deaktiv" }} selected={false} onSelect={() => undefined} disabled />
          </div>
          <p id="bbu-status-note">Növbəti mərhələdə — API-də etibarlı aktivlik sahəsi yoxdur.</p>
        </fieldset>

        <fieldset className="filter-group filter-group--unavailable" aria-describedby="catalog-status-note">
          <legend>BBU Kataloqu</legend>
          <div className="choice-list">
            <ChoicePill choice={{ value: "found", label: "Son yeniləmədə tapıldı" }} selected={false} onSelect={() => undefined} disabled />
            <ChoicePill choice={{ value: "missing", label: "Son yeniləmədə tapılmadı" }} selected={false} onSelect={() => undefined} disabled />
          </div>
          <p id="catalog-status-note">Növbəti mərhələdə — son kataloq yeniləməsinin identifikatoru saxlanmır.</p>
        </fieldset>

        <fieldset className="filter-group">
          <legend>Miqdar</legend>
          <div className="choice-list">
            {stockChoices.map((choice) => (
              <ChoicePill
                key={choice.value}
                choice={choice}
                selected={draft.stockBucket === choice.value}
                onSelect={toggleStock}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="filter-group">
          <legend>Limit</legend>
          <div className="choice-list">
            {limitChoices.map((choice) => (
              <ChoicePill
                key={choice.value}
                choice={choice}
                selected={draft.minimumPrice === choice.value}
                onSelect={toggleLimit}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="filter-group">
          <legend>Kateqoriyalar</legend>
          {categoriesLoading ? (
            <p className="filter-group__message" role="status">Kateqoriyalar yüklənir…</p>
          ) : categoriesError ? (
            <p className="filter-group__message filter-group__message--error">{categoriesError}</p>
          ) : categories.length === 0 ? (
            <p className="filter-group__message">Kateqoriya tapılmadı.</p>
          ) : (
            <div className="choice-list choice-list--categories">
              {categories.map((category) => (
                <ChoicePill
                  key={category}
                  choice={{ value: category, label: category }}
                  selected={draft.category === category}
                  onSelect={(next) => setDraft((current) => ({
                    ...current,
                    category: current.category === next ? "" : next
                  }))}
                />
              ))}
            </div>
          )}
        </fieldset>
      </div>

      <footer className="drawer-footer">
        <button type="button" className="button button--secondary" onClick={() => setDraft(DEFAULT_BOT_FILTERS)}>
          Sıfırla
        </button>
        <button type="button" className="button button--primary" onClick={applyFilters}>
          Tətbiq et
        </button>
      </footer>
    </dialog>
  );
}
