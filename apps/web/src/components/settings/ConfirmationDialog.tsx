import { useEffect, useId, useRef } from "react";
import { formatMoney } from "../../formatters";
import type { SettingsOperationPreview } from "../../types";
import { Icon } from "../Icon";

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: string;
  preview: SettingsOperationPreview | null;
  busy: boolean;
  tone?: "default" | "danger";
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

function valueChange(oldValue: string | null, newValue: string | null) {
  if (oldValue === newValue) return formatMoney(newValue);
  return `${formatMoney(oldValue)} → ${formatMoney(newValue)}`;
}

export function ConfirmationDialog({
  open,
  title,
  description,
  preview,
  busy,
  tone = "default",
  onClose,
  onConfirm
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      previousFocusRef.current?.focus();
    }
  }, [open]);

  function handleClose() {
    previousFocusRef.current?.focus();
    if (open) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="settings-confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={handleClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <header className="settings-modal__header">
        <div>
          <p className="settings-eyebrow">Təsdiq</p>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button type="button" className="settings-icon-button" onClick={onClose} disabled={busy} aria-label="Təsdiq pəncərəsini bağla">
          <Icon name="x" />
        </button>
      </header>

      <div className="settings-modal__body">
        <p id={descriptionId} className="settings-muted">{description}</p>
        {preview && (
          <>
            <dl className="settings-preview-counts">
              <div><dt>Uyğun</dt><dd>{preview.matchedCount}</dd></div>
              <div><dt>Dəyişəcək</dt><dd>{preview.affectedCount}</dd></div>
              <div><dt>Dəyişməyəcək</dt><dd>{preview.unchangedCount}</dd></div>
              <div><dt>Keçildi</dt><dd>{preview.skippedCount}</dd></div>
              <div><dt>Üst limitlə məhdudlaşdırıldı</dt><dd>{preview.constrainedCount}</dd></div>
            </dl>

            {preview.changes.length > 0 && (
              <div className="settings-preview-table-wrap">
                <table className="settings-preview-table">
                  <thead>
                    <tr><th>Məhsul</th><th>Qiymət</th><th>Alt limit</th><th>Üst limit</th></tr>
                  </thead>
                  <tbody>
                    {preview.changes.map((change) => (
                      <tr key={change.productId}>
                        <td><strong>{change.name}</strong><small>{change.externalId}</small></td>
                        <td>{valueChange(change.oldPrice, change.newPrice)}</td>
                        <td>{valueChange(change.oldMinimumPrice, change.newMinimumPrice)}</td>
                        <td>{valueChange(change.oldMaximumPrice, change.newMaximumPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {preview.truncated && <p className="settings-muted">Önizləmədə dəyişikliklərin yalnız bir hissəsi göstərilir.</p>}
          </>
        )}
      </div>

      <footer className="settings-modal__footer">
        <button type="button" className="button button--secondary" onClick={onClose} disabled={busy}>Ləğv et</button>
        <button
          type="button"
          className={`button ${tone === "danger" ? "settings-button--danger" : "button--primary"}`}
          onClick={() => void onConfirm()}
          disabled={busy || !preview || preview.affectedCount === 0}
          aria-busy={busy}
        >
          {busy ? "Tətbiq edilir…" : "Təsdiqlə və tətbiq et"}
        </button>
      </footer>
    </dialog>
  );
}
