import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiRequestError, fetchSettings, updateSettings } from "../api";
import type { BotSettings, ProductExportScope, SettingsOperationResult, UpdateBotSettingsInput } from "../types";
import "../settings.css";
import { Icon, type IconName } from "./Icon";
import { ConfirmationDialog } from "./settings/ConfirmationDialog";
import { PriceHistoryDialog } from "./settings/PriceHistoryDialog";
import { ProfileDialog } from "./settings/ProfileDialog";
import { SettingsAccordion } from "./settings/SettingsAccordion";
import {
  AdjustPricesPanel,
  AutoLimitPanel,
  BotPrinciplePanel,
  DiscountPanel,
  ExcelImportPanel,
  ExportProductsPanel,
  FriendStorePanel,
  IncreasePricesPanel,
  OrderSearchPanel,
  UpperLimitPanel
} from "./settings/SettingsPanels";
import { useSettingsOperation } from "./settings/useSettingsOperation";

type SettingsSectionId =
  | "auto-limits" | "adjust-to-limits" | "upper-limits" | "export" | "excel"
  | "order-search" | "increase" | "friend-store" | "principle" | "discount";

export interface SettingsDrawerProps {
  open: boolean;
  storeName?: string | null;
  storeUsername?: string | null;
  onClose: () => void;
  onSettingsSaved?: (settings: BotSettings) => void | Promise<void>;
  onOperationApplied?: (result: SettingsOperationResult) => void | Promise<void>;
  onExportProducts: (scope?: ProductExportScope) => void | Promise<void>;
  excelPanel?: ReactNode;
  onOpenManagement?: () => void;
  onNavigateDashboard?: () => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}

interface SectionDefinition {
  id: SettingsSectionId;
  title: string;
  icon: IconName;
  information: ReactNode;
}

const sections: SectionDefinition[] = [
  { id: "auto-limits", title: "Məhsullara avtomatik limit təyin et", icon: "sliders", information: <p>Aktiv məhsullar üçün <strong>Alt limit = endirimli qiymət − (endirimli qiymət × faiz / 100)</strong>. “Bütün məhsullar” mövcud limitləri əvəz edir; “Limitsiz məhsullar” yalnız alt limiti boş olanları dəyişir.</p> },
  { id: "adjust-to-limits", title: "Qiymətləri limitə uyğun tənzimlə", icon: "arrowDown", information: <p><strong>Endirimli qiymət = alt limit + (alt limit × faiz / 100)</strong>. 0% qiyməti alt limitə bərabərləşdirir; nəticə üst limiti aşmır.</p> },
  { id: "upper-limits", title: "Qiymətləri üst limitə bərabərləşdir", icon: "arrowUp", information: <p>Uyğun məhsulların cari qiymətini üst limitə bərabərləşdirir. Üst limiti olmayan məhsullar dəyişdirilmədən keçilir.</p> },
  { id: "export", title: "Məhsulları ixrac et", icon: "columns", information: <p>Lokal bazadakı uydurma məhsulları seçilən status üzrə Excel faylına ixrac edir. Endirimli qiymət rəqib qiymətindən 20%-dən çox yuxarıdırsa, həmin sətir qırmızı işarələnir. Boş və ya sıfır rəqib qiyməti müqayisəyə daxil edilmir.</p> },
  { id: "excel", title: "Excel ilə limit əlavə et", icon: "draft", information: <p>Birinci sətir başlıqdır: A — Məhsul kodu, B — Alt limit, C — Üst limit. Boş B və ya C mövcud dəyəri qoruyur. Naməlum, təkrarlanan, mənfi və düzgün formatlanmamış dəyərlər tətbiqdən əvvəl göstərilir.</p> },
  { id: "order-search", title: "Nömrə axtarış", icon: "search", information: <p>Sifariş nömrəsini daxil edərək sifarişi axtarın. Hər axtarış mövcud sorğu haqqınızdan istifadə edir.</p> },
  { id: "increase", title: "Qiymət qaldırma", icon: "arrowUp", information: <p><strong>Yeni qiymət = cari qiymət + (cari qiymət × faiz / 100)</strong>. Kütləvi dəyişiklik əvvəlcə serverdə önizlənir və ayrıca təsdiq tələb edir.</p> },
  { id: "friend-store", title: "Dost mağaza təyin etmə", icon: "bag", information: <p>Dost mağazanın xarici ID-si rəqib təkliflərini qiymətləndirərkən həmin satıcını istisna etmək üçün lokal sazlamada saxlanır.</p> },
  { id: "principle", title: "Botun işləmə prinsipi", icon: "info", information: <p>BBU daha sürətli və xəta ehtimalı daha az olan əsas mənbədir. Sayt BBU problemi zamanı alternativ mənbədir. Seçimi dəyişmək botu işə salmır.</p> },
  { id: "discount", title: "Endirim qiyməti təyin etmə", icon: "arrowDown", information: <p><strong>Hədəf endirimli qiymət = ən ucuz rəqib qiyməti − endirim məbləği</strong>. 1 qəpik 0.01 AZN, 50 qəpik 0.50 AZN kimi nöqtə ilə yazılır. Burada yalnız lokal sazlama dəyişir; bot işə düşmür.</p> }
];

function requestMessage(error: unknown, fallback: string) {
  if (error instanceof DOMException && error.name === "AbortError") return null;
  if (error instanceof ApiRequestError) return error.message || fallback;
  if (error instanceof TypeError) return "Lokal API ilə əlaqə yaratmaq mümkün olmadı.";
  return fallback;
}

function storeInitials(storeName?: string | null) {
  if (!storeName?.trim()) return "BM";
  return storeName.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toLocaleUpperCase("az");
}

export function SettingsDrawer({
  open, storeName, storeUsername, onClose, onSettingsSaved, onOperationApplied, onExportProducts,
  excelPanel, onOpenManagement, onNavigateDashboard, theme = "dark", onToggleTheme
}: SettingsDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const loadControllerRef = useRef<AbortController | null>(null);
  const saveControllerRef = useRef<AbortController | null>(null);
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [openSection, setOpenSection] = useState<SettingsSectionId | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const operation = useSettingsOperation(async (result) => onOperationApplied?.(result));
  const initials = useMemo(() => storeInitials(storeName), [storeName]);

  async function loadSettings() {
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchSettings(controller.signal);
      setSettings({ ...response.data, botPriceSource: response.data.botPriceSource ?? "BBU" });
    } catch (reason: unknown) {
      const message = requestMessage(reason, "Parametrləri yükləmək mümkün olmadı.");
      if (message) setError(message);
    } finally {
      if (loadControllerRef.current === controller) {
        loadControllerRef.current = null;
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setFeedback(null);
      setError(null);
      setOpenSection(null);
      dialog.showModal();
      void loadSettings();
    } else if (!open && dialog.open) {
      loadControllerRef.current?.abort();
      saveControllerRef.current?.abort();
      setHistoryOpen(false);
      setProfileOpen(false);
      operation.reset();
      dialog.close();
      previousFocusRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => () => {
    loadControllerRef.current?.abort();
    saveControllerRef.current?.abort();
  }, []);

  async function patchSettings(input: UpdateBotSettingsInput, successMessage: string) {
    if (saving) return;
    saveControllerRef.current?.abort();
    const controller = new AbortController();
    saveControllerRef.current = controller;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await updateSettings(input, controller.signal);
      const next = { ...response.data, botPriceSource: response.data.botPriceSource ?? "BBU" };
      setSettings(next);
      try {
        await onSettingsSaved?.(next);
        setFeedback({ tone: "success", message: successMessage });
      } catch {
        setFeedback({
          tone: "error",
          message: `${successMessage} Dashboard məlumatlarını yeniləmək mümkün olmadı.`
        });
      }
    } catch (reason: unknown) {
      const message = requestMessage(reason, "Parametri yadda saxlamaq mümkün olmadı.");
      if (message) setFeedback({ tone: "error", message });
    } finally {
      if (saveControllerRef.current === controller) {
        saveControllerRef.current = null;
        setSaving(false);
      }
    }
  }

  async function exportProducts(scope: ProductExportScope) {
    if (exporting) return;
    setExporting(true);
    setFeedback(null);
    try {
      await onExportProducts(scope);
      setFeedback({ tone: "success", message: "Məhsullar fayla ixrac edildi." });
    } catch (reason: unknown) {
      const message = requestMessage(reason, "Məhsulları ixrac etmək mümkün olmadı.");
      if (message) setFeedback({ tone: "error", message });
    } finally {
      setExporting(false);
    }
  }

  function toggleSection(id: SettingsSectionId) {
    const willOpen = openSection !== id;
    setOpenSection(willOpen ? id : null);
    setFeedback(null);
    operation.clearFeedback();
    if (willOpen) {
      window.requestAnimationFrame(() => {
        document.getElementById(`settings-trigger-${id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      });
    }
  }

  function renderPanel(id: SettingsSectionId) {
    if (!settings) return null;
    const bulkProps = { busy: operation.previewing || operation.applying, onPreview: operation.preview };
    const safeProps = { settings, busy: saving, onPatch: patchSettings };
    switch (id) {
      case "auto-limits": return <AutoLimitPanel {...bulkProps} />;
      case "adjust-to-limits": return <AdjustPricesPanel {...bulkProps} />;
      case "upper-limits": return <UpperLimitPanel {...bulkProps} />;
      case "export": return <ExportProductsPanel busy={exporting} onExport={exportProducts} />;
      case "excel": return <ExcelImportPanel>{excelPanel}</ExcelImportPanel>;
      case "order-search": return <OrderSearchPanel />;
      case "increase": return <IncreasePricesPanel {...bulkProps} />;
      case "friend-store": return <FriendStorePanel {...safeProps} />;
      case "principle": return <BotPrinciplePanel {...safeProps} />;
      case "discount": return <DiscountPanel {...safeProps} />;
    }
  }

  function handleNativeClose() {
    previousFocusRef.current?.focus();
    if (open) onClose();
  }

  function openManagement() {
    if (onOpenManagement) onOpenManagement();
    else if (onNavigateDashboard) onNavigateDashboard();
    else onClose();
  }

  const visibleFeedback = operation.feedback ?? feedback;

  return (
    <>
      <dialog ref={dialogRef} className="settings-shell" data-theme={theme} aria-labelledby="settings-shell-title" aria-describedby="settings-shell-description" onClose={handleNativeClose}>
        <header className="settings-shell__header">
          <div className="settings-shell__identity">
            <button type="button" className="settings-icon-button" onClick={onClose} aria-label="Parametrləri bağla"><Icon name="x" /></button>
            <div><h2 id="settings-shell-title">{storeName?.trim() || "Aktiv mağaza"}</h2><p id="settings-shell-description">Parametrlər</p></div>
          </div>
          <div className="settings-shell__utilities">
            <button type="button" className="settings-icon-button" onClick={onToggleTheme} disabled={!onToggleTheme} aria-label={theme === "dark" ? "İşıqlı görünüşə keç" : "Tünd görünüşə keç"} title={onToggleTheme ? undefined : "Görünüş seçimi növbəti inteqrasiyada aktiv olacaq"}>
              <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
            </button>
            <button
              type="button"
              className="settings-avatar"
              aria-label={storeName ? `${storeName} profilini aç` : "Aktiv mağaza profilini aç"}
              aria-haspopup="dialog"
              onClick={() => {
                setFeedback(null);
                setProfileOpen(true);
              }}
            >
              {initials}
            </button>
          </div>
        </header>

        <div className="settings-shell__body" aria-busy={loading}>
          <nav className="settings-primary-actions" aria-label="Parametr keçidləri">
            <button type="button" onClick={() => setHistoryOpen(true)}><span><Icon name="refresh" /></span><strong>Tarixçə</strong><Icon name="chevronRight" /></button>
            <button type="button" onClick={openManagement}><span><Icon name="grid" /></span><strong>İdarəetmə paneli</strong><Icon name="chevronRight" /></button>
          </nav>

          {visibleFeedback && <p className={`settings-feedback is-${visibleFeedback.tone}`} role={visibleFeedback.tone === "error" ? "alert" : "status"}>{visibleFeedback.message}</p>}

          {loading && !settings ? (
            <div className="settings-loading" role="status"><span className="loading-spinner" />Parametrlər yüklənir…</div>
          ) : error ? (
            <div className="settings-load-error" role="alert"><Icon name="alert" /><p>{error}</p><button type="button" className="button button--secondary" onClick={() => void loadSettings()}>Yenidən yoxla</button></div>
          ) : settings ? (
            <div className="settings-accordion-list">
              {sections.map((section) => (
                <SettingsAccordion key={section.id} id={section.id} title={section.title} icon={section.icon} open={openSection === section.id} onToggle={() => toggleSection(section.id)} information={section.information} badge={section.id === "order-search" ? "Növbəti mərhələdə" : undefined}>
                  {renderPanel(section.id)}
                </SettingsAccordion>
              ))}
            </div>
          ) : null}
        </div>
      </dialog>

      <PriceHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <ProfileDialog
        open={profileOpen}
        storeName={storeName}
        username={storeUsername}
        initials={initials}
        settingsLoaded={settings !== null}
        allowProductsWithoutMinimumPrice={settings?.allowProductsWithoutMinimumPrice ?? false}
        saving={saving}
        feedback={feedback}
        onClose={() => setProfileOpen(false)}
        onToggleProductsWithoutMinimumPrice={(enabled) => patchSettings(
          { allowProductsWithoutMinimumPrice: enabled },
          enabled
            ? "Alt limitsiz məhsullar üçün qiymət dəyişimi aktiv edildi."
            : "Alt limitsiz məhsullar üçün qiymət dəyişimi deaktiv edildi."
        )}
      />
      <ConfirmationDialog open={operation.confirmation !== null} title={operation.confirmation?.title ?? "Əməliyyatı təsdiqləyin"} description={operation.confirmation?.description ?? ""} preview={operation.confirmation?.preview ?? null} busy={operation.applying} tone={operation.confirmation?.tone} onClose={operation.closeConfirmation} onConfirm={operation.apply} />
    </>
  );
}
