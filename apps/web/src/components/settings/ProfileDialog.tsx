import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";

interface ProfileDialogProps {
  open: boolean;
  storeName?: string | null;
  username?: string | null;
  initials: string;
  settingsLoaded: boolean;
  allowProductsWithoutMinimumPrice: boolean;
  saving: boolean;
  feedback?: { tone: "success" | "error"; message: string } | null;
  onClose: () => void;
  onToggleProductsWithoutMinimumPrice: (enabled: boolean) => void | Promise<void>;
}

export function ProfileDialog({
  open,
  storeName,
  username,
  initials,
  settingsLoaded,
  allowProductsWithoutMinimumPrice,
  saving,
  feedback,
  onClose,
  onToggleProductsWithoutMinimumPrice
}: ProfileDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [placeholderMessage, setPlaceholderMessage] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setPlaceholderMessage(null);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    }
  }, [open]);

  function handleNativeClose() {
    window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    if (open) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="settings-profile-dialog"
      aria-labelledby="settings-profile-title"
      onClose={handleNativeClose}
    >
      <header className="settings-profile-dialog__header">
        <span className="settings-profile-dialog__avatar" aria-hidden="true">{initials}</span>
        <div>
          <h2 id="settings-profile-title">{storeName?.trim() || "Aktiv mağaza"}</h2>
          <p>{username?.trim() || "Lokal hesab"}</p>
        </div>
        <button
          type="button"
          className="settings-icon-button"
          onClick={onClose}
          aria-label="Profil pəncərəsini bağla"
        >
          <Icon name="x" />
        </button>
      </header>

      <div className="settings-profile-dialog__body">
        <section className="settings-profile-card" aria-labelledby="profile-telegram-heading">
          <div className="settings-profile-card__title">
            <span className="settings-profile-card__icon is-telegram"><Icon name="send" /></span>
            <h3 id="profile-telegram-heading">Telegram</h3>
          </div>
          <p>Sifariş bildirişlərini Telegram-da almaq üçün bağlayın.</p>
          <button
            type="button"
            className="settings-profile-card__telegram-button"
            onClick={() => setPlaceholderMessage("Telegram bağlantısı növbəti mərhələdə aktiv olacaq.")}
          >
            Telegram ilə bağla
          </button>
        </section>

        <section className="settings-profile-card settings-profile-card--compact" aria-labelledby="profile-whatsapp-heading">
          <div className="settings-profile-card__title">
            <span className="settings-profile-card__icon is-whatsapp"><Icon name="message" /></span>
            <h3 id="profile-whatsapp-heading">WhatsApp</h3>
            <span className="settings-profile-card__badge">Tezliklə</span>
          </div>
          <p>WhatsApp inteqrasiyası hazırlanır.</p>
        </section>

        <section className="settings-profile-card" aria-labelledby="profile-bot-settings-heading">
          <div className="settings-profile-card__title">
            <span className="settings-profile-card__icon"><Icon name="sliders" /></span>
            <h3 id="profile-bot-settings-heading">Bot Ayarları</h3>
          </div>
          <div className="settings-profile-toggle-row">
            <span className="settings-profile-card__icon is-limit"><Icon name="arrowDown" /></span>
            <div>
              <strong>Alt limitsiz məhsulların qiymət dəyişimi</strong>
              <small>Alt limiti olmayan məhsulların da qiyməti endirilir</small>
            </div>
            <button
              type="button"
              className="settings-profile-switch"
              role="switch"
              aria-checked={allowProductsWithoutMinimumPrice}
              aria-label={`Alt limitsiz məhsulların qiymət dəyişimini ${allowProductsWithoutMinimumPrice ? "deaktiv et" : "aktiv et"}`}
              aria-busy={saving}
              disabled={saving || !settingsLoaded}
              onClick={() => {
                setPlaceholderMessage(null);
                void onToggleProductsWithoutMinimumPrice(!allowProductsWithoutMinimumPrice);
              }}
            >
              <span aria-hidden="true" />
            </button>
          </div>
        </section>

        {(placeholderMessage || feedback) && (
          <p
            className={`settings-profile-dialog__feedback ${!placeholderMessage && feedback?.tone === "error" ? "is-error" : ""}`}
            role={!placeholderMessage && feedback?.tone === "error" ? "alert" : "status"}
          >
            {placeholderMessage ?? feedback?.message}
          </p>
        )}

        <button
          type="button"
          className="settings-profile-logout"
          onClick={() => setPlaceholderMessage("Çıxış autentifikasiya əlavə edildikdə aktiv olacaq.")}
        >
          <Icon name="logout" />
          <span>Çıxış</span>
        </button>
      </div>
    </dialog>
  );
}
