import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../Icon";

interface InfoPopoverProps {
  label: string;
  children: ReactNode;
}

interface PopoverPosition {
  left: number;
  top: number;
  placement: "top" | "bottom";
  arrowLeft: number;
}

export function InfoPopover({ label, children }: InfoPopoverProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const pointerFocusRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({ left: 12, top: 12, placement: "bottom", arrowLeft: 24 });

  useLayoutEffect(() => {
    if (!open) return;

    function placePopover() {
      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (!trigger || !popover) return;

      const triggerBox = trigger.getBoundingClientRect();
      const popoverBox = popover.getBoundingClientRect();
      const edge = 12;
      const gap = 9;
      const fitsBelow = triggerBox.bottom + gap + popoverBox.height <= window.innerHeight - edge;
      const top = fitsBelow
        ? triggerBox.bottom + gap
        : Math.max(edge, triggerBox.top - popoverBox.height - gap);
      const left = Math.min(
        window.innerWidth - popoverBox.width - edge,
        Math.max(edge, triggerBox.left + triggerBox.width / 2 - popoverBox.width / 2)
      );

      const arrowLeft = Math.min(
        popoverBox.width - 22,
        Math.max(22, triggerBox.left + triggerBox.width / 2 - left)
      );

      setPosition({ left, top, placement: fitsBelow ? "bottom" : "top", arrowLeft });
    }

    placePopover();
    window.addEventListener("resize", placePopover);
    window.addEventListener("scroll", placePopover, true);
    return () => {
      window.removeEventListener("resize", placePopover);
      window.removeEventListener("scroll", placePopover, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="settings-info-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-describedby={open ? id : undefined}
        onPointerDown={() => { pointerFocusRef.current = true; }}
        onClick={() => setOpen((current) => !current)}
        onFocus={() => {
          if (!pointerFocusRef.current) setOpen(true);
          pointerFocusRef.current = false;
        }}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => {
          if (document.activeElement !== triggerRef.current) setOpen(false);
        }}
      >
        <Icon name="info" />
      </button>
      {open && createPortal(
        <div
          ref={popoverRef}
          id={id}
          className="settings-info-popover"
          data-placement={position.placement}
          role="tooltip"
          style={{
            left: position.left,
            top: position.top,
            "--settings-popover-arrow-left": `${position.arrowLeft}px`
          } as CSSProperties}
        >
          {children}
        </div>,
        triggerRef.current?.closest("dialog") ?? document.body
      )}
    </>
  );
}
