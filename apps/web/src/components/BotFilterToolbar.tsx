import type { BotProductFilters } from "../types";
import { DEFAULT_BOT_FILTERS } from "./BotFilterDrawer";
import { ColumnsButton } from "./ColumnManager";
import { Icon } from "./Icon";

export type BotFilterKey = keyof BotProductFilters;

interface BotFilterToolbarProps {
  filters: BotProductFilters;
  visibleColumnCount: number;
  onOpenFilters: () => void;
  onOpenColumns: () => void;
  onRemoveFilter: (key: BotFilterKey) => void;
  onClearFilters: () => void;
}

const botLabels = {
  enabled: "Bot: Aktiv",
  disabled: "Bot: Deaktiv"
} as const;

const stockLabels = {
  OUT: "Miqdar: Bitmişdir (0)",
  LOW: "Miqdar: Azdır (1–5)",
  IN_STOCK: "Miqdar: Stokdadır (>5)"
} as const;

const limitLabels = {
  limited: "Limit: Limitli",
  unlimited: "Limit: Limitsiz"
} as const;

export function countBotFilters(filters: BotProductFilters) {
  return Number(filters.botEnabled !== "all")
    + Number(filters.stockBucket !== "all")
    + Number(filters.minimumPrice !== "all")
    + Number(Boolean(filters.category));
}

export function clearBotFilter(filters: BotProductFilters, key: BotFilterKey): BotProductFilters {
  return { ...filters, [key]: DEFAULT_BOT_FILTERS[key] };
}

export function BotFilterToolbar({
  filters,
  visibleColumnCount,
  onOpenFilters,
  onOpenColumns,
  onRemoveFilter,
  onClearFilters
}: BotFilterToolbarProps) {
  const chips: Array<{ key: BotFilterKey; label: string }> = [];
  if (filters.botEnabled !== "all") chips.push({ key: "botEnabled", label: botLabels[filters.botEnabled] });
  if (filters.stockBucket !== "all") chips.push({ key: "stockBucket", label: stockLabels[filters.stockBucket] });
  if (filters.minimumPrice !== "all") chips.push({ key: "minimumPrice", label: limitLabels[filters.minimumPrice] });
  if (filters.category) chips.push({ key: "category", label: `Kateqoriya: ${filters.category}` });

  return (
    <div className="table-toolbar table-toolbar--bot">
      <div className="filter-toolbar">
        <button type="button" className="filter-button" onClick={onOpenFilters} aria-haspopup="dialog">
          <Icon name="sliders" />
          Filtr
          {chips.length > 0 && <span className="control-badge" aria-label={`${chips.length} aktiv filtr`}>{chips.length}</span>}
        </button>

        <div className="filter-chips" aria-label="Aktiv filtrlər">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="filter-chip"
              onClick={() => onRemoveFilter(chip.key)}
              aria-label={`${chip.label} filtrini sil`}
            >
              {chip.label}
              <Icon name="x" />
            </button>
          ))}
          {chips.length > 0 && (
            <button type="button" className="clear-filter-button" onClick={onClearFilters}>
              Hamısını təmizlə
            </button>
          )}
        </div>
      </div>

      <ColumnsButton count={visibleColumnCount} onClick={onOpenColumns} />
    </div>
  );
}
