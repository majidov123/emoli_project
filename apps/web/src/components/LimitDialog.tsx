import { useEffect, useRef } from "react";
import type { Product } from "../types";
import { Icon } from "./Icon";

interface LimitDialogProps {
  product: Product | null;
  onClose: () => void;
}

export function LimitDialog({ product, onClose }: LimitDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (product && !dialog.open) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!product && dialog.open) {
      dialog.close();
      previousFocusRef.current?.focus();
    }
  }, [product]);

  function handleDialogClose() {
    previousFocusRef.current?.focus();
    if (product) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="limit-dialog"
      aria-labelledby="limit-dialog-title"
      aria-describedby="limit-dialog-message"
      onClose={handleDialogClose}
    >
      <div className="limit-dialog__header">
        <span className="limit-dialog__header-icon"><Icon name="sliders" /></span>
        <div>
          <h2 id="limit-dialog-title">Limitlərə baxış</h2>
          <p>{product?.name ?? "Məhsul limitləri"}</p>
        </div>
        <button type="button" className="icon-button limit-dialog__close" onClick={onClose} aria-label="Dialoqu bağla">
          <Icon name="x" />
        </button>
      </div>

      <div className="limit-box limit-box--lower">
        <div className="limit-box__heading">
          <span><Icon name="chevronRight" /></span>
          <div>
            <label htmlFor="minimum-price">Alt limit</label>
            <p>Bot heç vaxt bu qiymətdən aşağı düşməməlidir.</p>
          </div>
        </div>
        <div className="currency-input">
          <input
            id="minimum-price"
            value={product?.minimumPrice ?? ""}
            placeholder="Təyin edilməyib"
            readOnly
          />
          <span>₼</span>
        </div>
      </div>

      <div className="limit-box limit-box--upper">
        <div className="limit-box__heading">
          <span><Icon name="chevronRight" /></span>
          <div>
            <label htmlFor="maximum-price">Üst limit</label>
            <p>Mağaza yeganə satıcı olduqda bot qiyməti bu məbləğə qədər qaldıra bilər.</p>
          </div>
        </div>
        <div className="currency-input">
          <input
            id="maximum-price"
            value={product?.maximumPrice ?? ""}
            placeholder="Təyin edilməyib"
            readOnly
          />
          <span>₼</span>
        </div>
      </div>

      <div className="milestone-message" id="limit-dialog-message">
        <Icon name="info" />
        <p><strong>Yalnız baxış rejimi.</strong> Redaktə növbəti mərhələdə aktiv olacaq.</p>
      </div>

      <div className="limit-dialog__footer">
        <button type="button" className="button button--primary" onClick={onClose}>Bağla</button>
      </div>
    </dialog>
  );
}
