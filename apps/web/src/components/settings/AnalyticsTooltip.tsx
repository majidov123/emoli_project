import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface AnalyticsTooltipProps {
  label: string;
  text: string;
  triggerClassName?: string;
  triggerContent?: ReactNode;
}

interface TooltipPosition {
  left: number;
  top: number;
  arrowLeft: number;
  placement: "above" | "below";
}

export function AnalyticsTooltip({ label, text, triggerClassName = "", triggerContent = "?" }: AnalyticsTooltipProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ left: 12, top: 12, arrowLeft: 24, placement: "above" });
  const visible = pinned || hovered || focused;

  function clearCloseTimer() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleHoverClose() {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setHovered(false), 100);
  }

  useLayoutEffect(() => {
    if (!visible) return;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      const tooltip = tooltipRef.current;
      if (!trigger || !tooltip) return;
      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const gutter = 12;
      const center = triggerRect.left + triggerRect.width / 2;
      const left = Math.max(gutter, Math.min(center - tooltipRect.width / 2, window.innerWidth - tooltipRect.width - gutter));
      const fitsAbove = triggerRect.top - tooltipRect.height - gutter >= gutter;
      const top = fitsAbove
        ? triggerRect.top - tooltipRect.height - gutter
        : Math.min(triggerRect.bottom + gutter, window.innerHeight - tooltipRect.height - gutter);
      const arrowLeft = Math.max(18, Math.min(center - left, tooltipRect.width - 18));
      setPosition({ left, top, arrowLeft, placement: fitsAbove ? "above" : "below" });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [visible, text]);

  useEffect(() => {
    if (!visible) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !tooltipRef.current?.contains(target)) {
        setPinned(false);
        setHovered(false);
        setFocused(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPinned(false);
        setHovered(false);
        setFocused(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible]);

  useEffect(() => () => clearCloseTimer(), []);

  const tooltipStyle = {
    left: position.left,
    top: position.top,
    "--analytics-tooltip-arrow-left": `${position.arrowLeft}px`
  } as CSSProperties;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`analytics-help-trigger ${triggerClassName}`.trim()}
        aria-label={`${label} izahı`}
        aria-expanded={visible}
        onClick={() => setPinned((value) => !value)}
        onMouseEnter={() => { clearCloseTimer(); setHovered(true); }}
        onMouseLeave={scheduleHoverClose}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >{triggerContent}</button>
      {visible ? createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          className="analytics-tooltip"
          data-placement={position.placement}
          style={tooltipStyle}
          onMouseEnter={() => { clearCloseTimer(); setHovered(true); }}
          onMouseLeave={scheduleHoverClose}
        >
          {text}
        </div>,
        document.body
      ) : null}
    </>
  );
}
