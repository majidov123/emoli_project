import { Icon } from "./Icon";
import { EXTERNAL_STATUS_LABELS, STATUS_LABELS, STATUS_TONES } from "../statuses";
import type { Product, ProductStatus } from "../types";

export function ProductImagePlaceholder({ name }: { name: string }) {
  return (
    <span className="product-image" role="img" aria-label={`${name} üçün şəkil yoxdur`}>
      <Icon name="image" />
    </span>
  );
}

export function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span className={`status-badge status-badge--${STATUS_TONES[status]}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function MarketplaceStatus({ product }: { product: Product }) {
  const label = product.externalStatus
    ? EXTERNAL_STATUS_LABELS[product.externalStatus] ?? product.externalStatus.replaceAll("_", " ")
    : "Məlumat yoxdur";

  return (
    <span className={`status-badge status-badge--${STATUS_TONES[product.normalizedStatus]}`}>
      {label}
    </span>
  );
}

export function ReadOnlySwitch({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className="readonly-switch"
      role="switch"
      aria-checked={enabled}
      aria-readonly="true"
      aria-label={label}
      tabIndex={0}
      title="Dəyişiklik növbəti mərhələdə aktiv olacaq"
    >
      <span className="readonly-switch__track" aria-hidden="true" />
      <small>{enabled ? "Aktiv" : "Deaktiv"}</small>
    </span>
  );
}
