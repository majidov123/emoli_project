import type { KeyboardEvent } from "react";
import type { ProductSource } from "../types";

interface ProductTabsProps {
  value: ProductSource;
  onChange: (value: ProductSource) => void;
}

const tabs: Array<{ value: ProductSource; label: string }> = [
  { value: "bbu", label: "BBU məhsulları" },
  { value: "bot", label: "Bot məhsulları" }
];

export function ProductTabs({ value, onChange }: ProductTabsProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: ProductSource) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentIndex = tabs.findIndex((tab) => tab.value === current);
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(currentIndex + step + tabs.length) % tabs.length];
    if (!next) return;
    onChange(next.value);
    window.requestAnimationFrame(() => document.getElementById(`tab-${next.value}`)?.focus());
  }

  return (
    <div className="tabs" role="tablist" aria-label="Məhsul mənbəyi">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          id={`tab-${tab.value}`}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          aria-controls={`products-panel-${tab.value}`}
          tabIndex={value === tab.value ? 0 : -1}
          className="tabs__button"
          onClick={() => onChange(tab.value)}
          onKeyDown={(event) => handleKeyDown(event, tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
