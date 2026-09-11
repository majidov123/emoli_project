import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { TableColumn } from "../tableColumns";
import { Icon } from "./Icon";

interface ColumnsButtonProps {
  count: number;
  onClick: () => void;
}

export function ColumnsButton({ count, onClick }: ColumnsButtonProps) {
  return (
    <button type="button" className="columns-button" onClick={onClick} aria-haspopup="dialog">
      <Icon name="columns" />
      Sütunlar
      <span className="control-badge" aria-label={`${count} görünən sütun`}>{count}</span>
    </button>
  );
}

interface ColumnManagerProps<Id extends string> {
  open: boolean;
  dialogId: string;
  tableLabel: string;
  columns: readonly TableColumn<Id>[];
  order: readonly Id[];
  visibleIds: readonly Id[];
  onClose: () => void;
  onToggle: (id: Id) => void;
  onMove: (id: Id, targetIndex: number) => void;
  onReset: () => void;
}

type DropPlacement = "before" | "after";

export function ColumnManager<Id extends string>({
  open,
  dialogId,
  tableLabel,
  columns,
  order,
  visibleIds,
  onClose,
  onToggle,
  onMove,
  onReset
}: ColumnManagerProps<Id>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [draggedId, setDraggedId] = useState<Id | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: Id; placement: DropPlacement } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const columnsById = new Map(columns.map((column) => [column.id, column] as const));
  const visibleSet = new Set(visibleIds);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      previousFocusRef.current?.focus();
    }
  }, [open]);

  function announceMove(id: Id, targetIndex: number) {
    const label = columnsById.get(id)?.label ?? id;
    setAnnouncement(`${label} ${targetIndex + 1}-ci mövqeyə keçirildi.`);
  }

  function handleMove(id: Id, targetIndex: number) {
    onMove(id, targetIndex);
    announceMove(id, targetIndex);
  }

  function handleDialogClose() {
    previousFocusRef.current?.focus();
    if (open) onClose();
  }

  function handleDragStart(event: DragEvent<HTMLSpanElement>, id: Id) {
    setDraggedId(id);
    setDropTarget(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function placementFor(event: DragEvent<HTMLLIElement>): DropPlacement {
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
  }

  function handleDragOver(event: DragEvent<HTMLLIElement>, targetId: Id) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget({ id: targetId, placement: placementFor(event) });
  }

  function handleDrop(event: DragEvent<HTMLLIElement>, targetId: Id) {
    event.preventDefault();
    const transferredId = event.dataTransfer.getData("text/plain") as Id;
    const sourceId = draggedId ?? (order.includes(transferredId) ? transferredId : null);
    const placement = placementFor(event);
    setDraggedId(null);
    setDropTarget(null);
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = order.indexOf(sourceId);
    const targetIndex = order.indexOf(targetId);
    const destinationIndex = placement === "before"
      ? targetIndex - Number(sourceIndex < targetIndex)
      : targetIndex + Number(sourceIndex > targetIndex);
    onMove(sourceId, destinationIndex);
    announceMove(sourceId, destinationIndex);
  }

  return (
    <dialog
      ref={dialogRef}
      className="column-dialog"
      aria-labelledby={`column-dialog-title-${dialogId}`}
      aria-describedby={`column-dialog-help-${dialogId}`}
      onClose={handleDialogClose}
    >
      <header className="column-dialog__header">
        <div>
          <div className="column-dialog__title-row">
            <h2 id={`column-dialog-title-${dialogId}`}>Sütun parametrləri</h2>
            <span className="column-counter">{visibleIds.length}/{columns.length}</span>
          </div>
          <p id={`column-dialog-help-${dialogId}`}>
            {tableLabel}: sürükləyin və ya ox düymələri ilə sıralayın.
          </p>
        </div>
        <button type="button" className="icon-button column-dialog__close" onClick={onClose} aria-label="Sütun parametrlərini bağla">
          <Icon name="x" />
        </button>
      </header>

      <ul className="column-list" aria-label={`${tableLabel} sütunlarının sırası`}>
        {order.map((id, index) => {
          const column = columnsById.get(id);
          if (!column) return null;
          const isVisible = visibleSet.has(id);
          const isOnlyVisible = isVisible && visibleIds.length === 1;
          const dropClass = dropTarget?.id === id ? `is-drop-${dropTarget.placement}` : "";

          return (
            <li
              key={id}
              className={`column-list__item ${isVisible ? "is-visible" : "is-hidden"} ${draggedId === id ? "is-dragging" : ""} ${dropClass}`}
              onDragOver={(event) => handleDragOver(event, id)}
              onDrop={(event) => handleDrop(event, id)}
            >
              <span
                className="drag-handle"
                draggable
                aria-hidden="true"
                onDragStart={(event) => handleDragStart(event, id)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDropTarget(null);
                }}
              >
                <Icon name="grip" />
              </span>
              <span className="column-list__position">{index + 1}</span>
              <span className="column-list__label">{column.label}</span>
              <span className="column-list__move-actions">
                <button
                  type="button"
                  className="mini-icon-button"
                  onClick={() => handleMove(id, index - 1)}
                  disabled={index === 0}
                  aria-label={`${column.label} sütununu yuxarı keçir`}
                >
                  <Icon name="arrowUp" />
                </button>
                <button
                  type="button"
                  className="mini-icon-button"
                  onClick={() => handleMove(id, index + 1)}
                  disabled={index === order.length - 1}
                  aria-label={`${column.label} sütununu aşağı keçir`}
                >
                  <Icon name="arrowDown" />
                </button>
              </span>
              <button
                type="button"
                className="visibility-button"
                aria-pressed={isVisible}
                aria-label={`${column.label} sütununu ${isVisible ? "gizlət" : "göstər"}`}
                onClick={() => onToggle(id)}
                disabled={isOnlyVisible}
                title={isOnlyVisible ? "Ən azı bir sütun görünməlidir" : undefined}
              >
                <Icon name={isVisible ? "eye" : "eyeOff"} />
              </button>
            </li>
          );
        })}
      </ul>

      <p className="sr-only" aria-live="polite">{announcement}</p>

      <footer className="column-dialog__footer">
        <button type="button" className="button button--secondary" onClick={onReset}>Standarta sıfırla</button>
        <button type="button" className="button button--primary" onClick={onClose}>Hazırdır</button>
      </footer>
    </dialog>
  );
}
