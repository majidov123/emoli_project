import { Icon, type IconName } from "./Icon";
import type { ProductStatus } from "../types";

interface StatusCardsProps {
  value?: ProductStatus;
  onChange: (status?: ProductStatus) => void;
}

const cards: Array<{
  label: string;
  status?: ProductStatus;
  icon: IconName;
  tone: string;
}> = [
  { label: "Bütün məhsullar", icon: "grid", tone: "blue" },
  { label: "Satışda olan məhsullar", status: "ACTIVE", icon: "bag", tone: "green" },
  { label: "Mağazamda bitən məhsullar", status: "OUT_OF_STOCK_STORE", icon: "box", tone: "yellow" },
  { label: "Platformada bitən məhsullar", status: "OUT_OF_STOCK_PLATFORM", icon: "truck", tone: "orange" },
  { label: "Gizli məhsullar", status: "HIDDEN", icon: "eyeOff", tone: "muted" },
  { label: "Qayda pozuntulu məhsullar", status: "INVALID", icon: "alert", tone: "red" },
  { label: "Satıla bilməyən məhsullar", status: "UNSALEABLE", icon: "ban", tone: "pink" },
  { label: "Satışa hazır məhsullar", status: "READY", icon: "checkCircle", tone: "blue" },
  { label: "Qaralama məhsullar", status: "DRAFT", icon: "draft", tone: "purple" }
];

export function StatusCards({ value, onChange }: StatusCardsProps) {
  return (
    <section className="status-section" aria-labelledby="status-heading">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Sürətli seçim</span>
          <h2 id="status-heading">Məhsul statusları</h2>
        </div>
        <p>Ümumi saylar üçün xülasə API-si hələ mövcud deyil.</p>
      </div>

      <div className="status-grid">
        {cards.map((card, index) => {
          const selected = value === card.status;
          return (
            <button
              key={card.status ?? "all"}
              type="button"
              className={`status-card status-card--${card.tone} ${index === 0 ? "status-card--all" : ""}`}
              aria-pressed={selected}
              onClick={() => onChange(card.status)}
            >
              <span className="status-card__icon"><Icon name={card.icon} /></span>
              <span>{card.label}</span>
              {selected && <Icon name="check" className="status-card__check" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
