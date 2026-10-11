import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type {
  AutoLimitSelection,
  BotSettings,
  ProductExportScope,
  SettingsOperationPreviewInput,
  UpdateBotSettingsInput,
  UpperLimitSelection
} from "../../types";
import { Icon } from "../Icon";

interface BulkPanelProps {
  busy: boolean;
  onPreview: (input: SettingsOperationPreviewInput, options: {
    title: string;
    description: string;
    tone?: "default" | "danger";
  }) => void | Promise<void>;
}

interface SafeSettingsPanelProps {
  settings: BotSettings;
  busy: boolean;
  onPatch: (input: UpdateBotSettingsInput, successMessage: string) => void | Promise<void>;
}

const decimalPattern = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

function PercentageField({
  id,
  value,
  onChange,
  disabled
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="settings-field settings-field--required" htmlFor={id}>
      <span>Faiz (%)</span>
      <div className="settings-input-affix">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Məsələn, 5"
          disabled={disabled}
          required
        />
        <span aria-hidden="true">%</span>
      </div>
    </label>
  );
}

function usePercentage() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function validate() {
    const next = value.trim();
    const numericValue = Number(next);
    if (!decimalPattern.test(next) || !Number.isFinite(numericValue) || numericValue > 100) {
      setError("Faizi 0–100 aralığında, nöqtə ilə və ən çox iki onluq rəqəmlə daxil edin.");
      return null;
    }
    setError(null);
    return next;
  }

  return { value, setValue: (next: string) => { setValue(next); setError(null); }, error, validate };
}

export function AutoLimitPanel({ busy, onPreview }: BulkPanelProps) {
  const percentage = usePercentage();
  const [selection, setSelection] = useState<AutoLimitSelection>("ALL");

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = percentage.validate();
    if (!value) return;
    void onPreview(
      { operation: "AUTO_ASSIGN_MINIMUM_LIMITS", selection, percentage: value },
      {
        title: "Alt limitləri dəyişdirməyi təsdiqləyin",
        description: "Önizləmədə göstərilən aktiv məhsulların alt limitləri lokal verilənlər bazasında dəyişdiriləcək."
      }
    );
  }

  return (
    <form className="settings-panel-form" onSubmit={submit}>
      <p className="settings-panel-copy">Aktiv statuslu məhsulların endirimli qiymətinə əsasən alt limit hesablayın.</p>
      <label className="settings-field settings-field--required">
        <span>Məhsul seçimi</span>
        <select value={selection} onChange={(event) => setSelection(event.target.value as AutoLimitSelection)} disabled={busy}>
          <option value="ALL">Bütün məhsullar</option>
          <option value="WITHOUT_LIMIT">Limitsiz məhsullar</option>
        </select>
      </label>
      <PercentageField id="auto-limit-percentage" value={percentage.value} onChange={percentage.setValue} disabled={busy} />
      <p className="settings-formula">Alt limit = endirimli qiymət − (endirimli qiymət × faiz / 100)</p>
      {percentage.error && <p className="settings-inline-error" role="alert">{percentage.error}</p>}
      <button type="submit" className="button button--primary" disabled={busy} aria-busy={busy}>{busy ? "Önizləmə hazırlanır…" : "Dəyişdir"}</button>
    </form>
  );
}

export function AdjustPricesPanel({ busy, onPreview }: BulkPanelProps) {
  const percentage = usePercentage();

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = percentage.validate();
    if (!value) return;
    void onPreview(
      { operation: "ADJUST_PRICES_TO_MINIMUM", percentage: value },
      {
        title: "Qiymətləri alt limitə uyğunlaşdırmağı təsdiqləyin",
        description: "Yeni qiymətlər alt limit və seçilən faiz əsasında hesablanacaq; üst limit aşılmayacaq."
      }
    );
  }

  return (
    <form className="settings-panel-form" onSubmit={submit}>
      <p className="settings-panel-copy">Alt limiti olan məhsulların qiymətini limitdən seçilən faiz qədər yuxarı təyin edin.</p>
      <PercentageField id="adjust-price-percentage" value={percentage.value} onChange={percentage.setValue} disabled={busy} />
      <p className="settings-formula">Endirimli qiymət = alt limit + (alt limit × faiz / 100). 0% qiyməti alt limitə bərabərləşdirir.</p>
      {percentage.error && <p className="settings-inline-error" role="alert">{percentage.error}</p>}
      <button type="submit" className="button button--primary" disabled={busy} aria-busy={busy}>{busy ? "Önizləmə hazırlanır…" : "Başla"}</button>
    </form>
  );
}

export function UpperLimitPanel({ busy, onPreview }: BulkPanelProps) {
  const [selection, setSelection] = useState<UpperLimitSelection>("ALL");

  function submit(event: FormEvent) {
    event.preventDefault();
    void onPreview(
      { operation: "SET_PRICES_TO_MAXIMUM", selection },
      {
        title: "Qiymətləri üst limitə bərabərləşdirməyi təsdiqləyin",
        description: "Üst limiti olan uyğun məhsulların cari qiyməti həmin limitə dəyişdiriləcək. Üst limiti olmayan məhsullar keçiləcək.",
        tone: "danger"
      }
    );
  }

  return (
    <form className="settings-panel-form" onSubmit={submit}>
      <p className="settings-warning"><Icon name="alert" />Bu əməliyyat çox sayda məhsulun qiymətini dəyişə bilər.</p>
      <label className="settings-field settings-field--required">
        <span>Məhsul seçimi</span>
        <select value={selection} onChange={(event) => setSelection(event.target.value as UpperLimitSelection)} disabled={busy}>
          <option value="ALL">Bütün məhsullar</option>
          <option value="ABOVE_UPPER">Üst limiti keçmiş məhsullar</option>
        </select>
      </label>
      <p className="settings-panel-copy">Üst limiti olmayan məhsullar avtomatik keçilir.</p>
      <button type="submit" className="button settings-button--danger" disabled={busy} aria-busy={busy}>{busy ? "Önizləmə hazırlanır…" : "Üst limitə bərabərləşdir"}</button>
    </form>
  );
}

const exportScopes: Array<{ value: ProductExportScope; label: string }> = [
  { value: "ALL", label: "Bütün məhsullar" },
  { value: "ACTIVE", label: "Satışda olan məhsullar" },
  { value: "NOT_ACTIVE", label: "Satışda olmayan məhsullar" },
  { value: "OUT_OF_STOCK_STORE", label: "Mağazamda bitən məhsullar" },
  { value: "OUT_OF_STOCK_PLATFORM", label: "Platformada bitən məhsullar" },
  { value: "HIDDEN", label: "Gizli məhsullar" },
  { value: "INVALID", label: "Qayda pozuntulu məhsullar" },
  { value: "UNSALEABLE", label: "Satıla bilməyən məhsullar" },
  { value: "READY", label: "Satışa hazır məhsullar" },
  { value: "DRAFT", label: "Qaralama məhsullar" }
];

export function ExportProductsPanel({
  busy,
  onExport
}: {
  busy: boolean;
  onExport: (scope: ProductExportScope) => void | Promise<void>;
}) {
  const [scope, setScope] = useState<ProductExportScope>("ALL");
  return (
    <div className="settings-panel-form">
      <p className="settings-panel-copy">Lokal bazadakı uydurma məhsulları seçilən status üzrə Excel faylına ixrac edin.</p>
      <label className="settings-field">
        <span>Məhsul statusu</span>
        <select value={scope} onChange={(event) => setScope(event.target.value as ProductExportScope)} disabled={busy}>
          {exportScopes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <button type="button" className="button button--primary" onClick={() => void onExport(scope)} disabled={busy} aria-busy={busy}>
        {busy ? "Fayl hazırlanır…" : "Excel ixrac et"}
      </button>
    </div>
  );
}

export function ExcelImportPanel({ children }: { children?: ReactNode }) {
  return children ? (
    <>{children}</>
  ) : (
    <div className="settings-panel-form settings-placeholder-panel">
      <p>Excel faylının nümunəsi, yüklənməsi və təsdiq önizləməsi ayrıca inteqrasiya ediləcək.</p>
      <button type="button" className="button button--secondary" disabled>Növbəti mərhələdə</button>
    </div>
  );
}

export function OrderSearchPanel() {
  const [orderNumber, setOrderNumber] = useState("");
  return (
    <div className="settings-panel-form">
      <label className="settings-field">
        <span>Sifariş nömrəsi</span>
        <input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="Sifariş nömrəsini daxil edin" />
      </label>
      <p className="settings-panel-copy">Sifariş məlumatları hələ qoşulmayıb.</p>
      <button type="button" className="button button--secondary" disabled>Axtar</button>
    </div>
  );
}

export function IncreasePricesPanel({ busy, onPreview }: BulkPanelProps) {
  const percentage = usePercentage();

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = percentage.validate();
    if (!value) return;
    void onPreview(
      { operation: "INCREASE_PRICES", percentage: value },
      {
        title: "Kütləvi qiymət artımını təsdiqləyin",
        description: "Önizləmədə göstərilən məhsulların cari qiymətləri seçilən faiz qədər artırılacaq.",
        tone: "danger"
      }
    );
  }

  return (
    <form className="settings-panel-form" onSubmit={submit}>
      <p className="settings-warning"><Icon name="alert" />Bu əməliyyat çox sayda lokal məhsul qiymətini dəyişə bilər.</p>
      <PercentageField id="increase-price-percentage" value={percentage.value} onChange={percentage.setValue} disabled={busy} />
      <p className="settings-formula">Yeni qiymət = cari qiymət + (cari qiymət × faiz / 100)</p>
      {percentage.error && <p className="settings-inline-error" role="alert">{percentage.error}</p>}
      <button type="submit" className="button settings-button--danger" disabled={busy} aria-busy={busy}>{busy ? "Önizləmə hazırlanır…" : "Başla"}</button>
    </form>
  );
}

export function FriendStorePanel({ settings, busy, onPatch }: SafeSettingsPanelProps) {
  const [candidate, setCandidate] = useState("");
  const [draftId, setDraftId] = useState<string | null>(settings.friendStoreExternalId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftId(settings.friendStoreExternalId);
    setCandidate("");
    setError(null);
  }, [settings.friendStoreExternalId]);

  function addCandidate() {
    const value = candidate.trim();
    if (!value || value.length > 200) {
      setError("Dost mağaza ID-si və ya lokal birmarket.az ünvanını düzgün daxil edin.");
      return;
    }
    setDraftId(value);
    setCandidate("");
    setError(null);
  }

  return (
    <div className="settings-panel-form">
      <p className="settings-panel-copy">Rəqib hesablamasında nəzərə alınmamalı bir dost mağaza ID-si saxlanıla bilər.</p>
      <div className="settings-inline-field">
        <label className="settings-field">
          <span>Dost mağaza ID-si və ya ünvanı</span>
          <input
            value={candidate}
            onChange={(event) => { setCandidate(event.target.value); setError(null); }}
            maxLength={200}
            placeholder="Məsələn, demo-friend-001"
            disabled={busy}
          />
        </label>
        <button type="button" className="button button--secondary" onClick={addCandidate} disabled={busy || !candidate.trim()}>Əlavə et</button>
      </div>
      <div className="settings-friend-list" aria-live="polite">
        {draftId ? (
          <div><span>{draftId}</span><button type="button" onClick={() => setDraftId(null)} disabled={busy} aria-label={`${draftId} dost mağazasını sil`}><Icon name="x" /></button></div>
        ) : <p>Dost mağaza əlavə edilməyib.</p>}
      </div>
      {error && <p className="settings-inline-error" role="alert">{error}</p>}
      <button
        type="button"
        className="button button--primary"
        disabled={busy || draftId === settings.friendStoreExternalId}
        aria-busy={busy}
        onClick={() => void onPatch({ friendStoreExternalId: draftId }, "Dost mağaza parametri yadda saxlanıldı.")}
      >
        {busy ? "Yadda saxlanılır…" : "Yadda saxla"}
      </button>
    </div>
  );
}

export function BotPrinciplePanel({ settings, busy, onPatch }: SafeSettingsPanelProps) {
  const [source, setSource] = useState<"BBU" | "SITE">(settings.botPriceSource);
  const [botEnabled, setBotEnabled] = useState(settings.botEnabled);
  const [interval, setInterval] = useState(String(settings.checkIntervalMinutes));
  const [allowWithoutLimit, setAllowWithoutLimit] = useState(settings.allowProductsWithoutMinimumPrice);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setSource(settings.botPriceSource);
    setBotEnabled(settings.botEnabled);
    setInterval(String(settings.checkIntervalMinutes));
    setAllowWithoutLimit(settings.allowProductsWithoutMinimumPrice);
    setError(null);
  }, [settings]);

  function save() {
    if (!/^\d+$/.test(interval)) {
      setError("Yoxlama intervalını tam dəqiqə ilə daxil edin.");
      return;
    }
    const checkIntervalMinutes = Number(interval);
    if (!Number.isSafeInteger(checkIntervalMinutes) || checkIntervalMinutes < 1 || checkIntervalMinutes > 10080) {
      setError("Yoxlama intervalı 1–10080 dəqiqə arasında olmalıdır.");
      return;
    }
    void onPatch(
      { botPriceSource: source, botEnabled, checkIntervalMinutes, allowProductsWithoutMinimumPrice: allowWithoutLimit },
      "Botun iş prinsipi parametrləri yadda saxlanıldı."
    );
  }

  const unchanged = source === settings.botPriceSource
    && botEnabled === settings.botEnabled
    && interval === String(settings.checkIntervalMinutes)
    && allowWithoutLimit === settings.allowProductsWithoutMinimumPrice;

  return (
    <div className="settings-panel-form">
      <fieldset className="settings-segmented">
        <legend>Qiymət mənbəyi</legend>
        <label className={source === "BBU" ? "is-selected" : ""}>
          <input type="radio" name="bot-source" value="BBU" checked={source === "BBU"} onChange={() => setSource("BBU")} disabled={busy} />
          <strong>BBU</strong>
          <span>Qiymət məlumatları BBU vasitəsilə əldə edilər; bu yol daha sürətli və xəta ehtimalı daha azdır.</span>
        </label>
        <label className={source === "SITE" ? "is-selected" : ""}>
          <input type="radio" name="bot-source" value="SITE" checked={source === "SITE"} onChange={() => setSource("SITE")} disabled={busy} />
          <strong>Sayt</strong>
          <span>BBU-da problem olduqda sayt alternativ mənbə kimi istifadə oluna bilər.</span>
        </label>
      </fieldset>
      <div className="settings-safe-grid">
        <label className="settings-switch-row">
          <input type="checkbox" checked={botEnabled} onChange={(event) => setBotEnabled(event.target.checked)} disabled={busy} />
          <span><strong>Bot aktivdir</strong><small>Yalnız lokal sazlamadır; bu düymə bot əməliyyatı başlatmır.</small></span>
        </label>
        <label className="settings-field">
          <span>Yoxlama intervalı (dəqiqə)</span>
          <input type="number" min="1" max="10080" step="1" value={interval} onChange={(event) => { setInterval(event.target.value); setError(null); }} disabled={busy} />
        </label>
        <label className="settings-switch-row">
          <input type="checkbox" checked={allowWithoutLimit} onChange={(event) => setAllowWithoutLimit(event.target.checked)} disabled={busy} />
          <span><strong>Alt limitsiz məhsullara icazə ver</strong><small>Qiymətləri dəyişdirmədən yalnız sazlama dəyərini saxlayır.</small></span>
        </label>
      </div>
      <p className="settings-panel-copy">Bu seçimlər yalnız lokal sazlamanı saxlayır və botu işə salmır.</p>
      {error && <p className="settings-inline-error" role="alert">{error}</p>}
      <button
        type="button"
        className="button button--primary"
        disabled={busy || unchanged}
        aria-busy={busy}
        onClick={save}
      >
        {busy ? "Yadda saxlanılır…" : "Yadda saxla"}
      </button>
    </div>
  );
}

export function DiscountPanel({ settings, busy, onPatch }: SafeSettingsPanelProps) {
  const [amount, setAmount] = useState(settings.undercutAmount);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setAmount(settings.undercutAmount); setError(null); }, [settings.undercutAmount]);

  function save() {
    const value = amount.trim();
    if (!decimalPattern.test(value)) {
      setError("Endirim məbləğini nöqtə ilə və ən çox iki onluq rəqəmlə daxil edin.");
      return;
    }
    void onPatch({ undercutAmount: value }, "Endirim məbləği yadda saxlanıldı.");
  }

  return (
    <div className="settings-panel-form">
      <label className="settings-field settings-field--required">
        <span>Endirim məbləği (AZN)</span>
        <div className="settings-input-affix">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => { setAmount(event.target.value); setError(null); }}
            disabled={busy}
            placeholder="0.01"
          />
          <span aria-hidden="true">₼</span>
        </div>
      </label>
      <div className="settings-examples" aria-label="Endirim məbləği nümunələri">
        {[
          { value: "0.01", label: "1 qəpik = 0.01" },
          { value: "0.02", label: "2 qəpik = 0.02" },
          { value: "0.50", label: "50 qəpik = 0.50" },
          { value: "1.00", label: "1 manat = 1.00" }
        ].map(({ value, label }) => (
          <button key={value} type="button" onClick={() => { setAmount(value); setError(null); }} disabled={busy}>{label}</button>
        ))}
      </div>
      <p className="settings-formula">Hədəf endirimli qiymət = ən ucuz rəqib qiyməti − endirim məbləği</p>
      {error && <p className="settings-inline-error" role="alert">{error}</p>}
      <button type="button" className="button button--primary" onClick={save} disabled={busy || amount.trim() === settings.undercutAmount} aria-busy={busy}>
        {busy ? "Yadda saxlanılır…" : "Dəyişdir"}
      </button>
    </div>
  );
}
