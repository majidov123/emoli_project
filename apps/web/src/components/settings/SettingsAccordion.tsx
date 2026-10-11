import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { InfoPopover } from "./InfoPopover";

interface SettingsAccordionProps {
  id: string;
  title: string;
  icon?: IconName;
  open: boolean;
  onToggle: () => void;
  information: ReactNode;
  badge?: string;
  children: ReactNode;
}

export function SettingsAccordion({
  id,
  title,
  icon = "sliders",
  open,
  onToggle,
  information,
  badge,
  children
}: SettingsAccordionProps) {
  const panelId = `settings-panel-${id}`;
  const triggerId = `settings-trigger-${id}`;

  return (
    <section className={`settings-accordion${open ? " is-open" : ""}`}>
      <div className="settings-accordion__heading">
        <button
          id={triggerId}
          type="button"
          className="settings-accordion__trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="settings-accordion__icon" aria-hidden="true"><Icon name={icon} /></span>
          <span className="settings-accordion__title">{title}</span>
          {badge && <span className="settings-accordion__badge">{badge}</span>}
          <Icon name="chevronRight" className="settings-accordion__chevron" />
        </button>
        <InfoPopover label={`${title} haqqında məlumat`}>{information}</InfoPopover>
      </div>
      <div
        id={panelId}
        className="settings-accordion__panel"
        role="region"
        aria-labelledby={triggerId}
        hidden={!open}
      >
        {children}
      </div>
    </section>
  );
}
