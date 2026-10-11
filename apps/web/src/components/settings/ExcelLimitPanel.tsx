import { useRef, useState, type ChangeEvent } from "react";
import {
  downloadLimitsSampleWorkbook,
  parseLimitsWorkbook,
  type LimitImportError,
  type LimitImportRow
} from "../../lib/productExcel";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { useSettingsOperation } from "./useSettingsOperation";

interface ExcelLimitPanelProps {
  onApplied?: () => void | Promise<void>;
}

function errorKey(error: LimitImportError, index: number) {
  return `${error.rowNumber}-${error.field}-${index}`;
}

export function ExcelLimitPanel({ onApplied }: ExcelLimitPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [rows, setRows] = useState<LimitImportRow[]>([]);
  const [errors, setErrors] = useState<LimitImportError[]>([]);
  const [parsing, setParsing] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const operation = useSettingsOperation(async () => {
    setFilename(null);
    setRows([]);
    setErrors([]);
    if (inputRef.current) inputRef.current.value = "";
    await onApplied?.();
  });

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setRows([]);
    setErrors([]);
    setLocalError(null);
    operation.reset();
    if (!file) {
      setFilename(null);
      return;
    }

    setFilename(file.name);
    setParsing(true);
    try {
      const parsed = await parseLimitsWorkbook(file);
      setRows(parsed.rows);
      setErrors(parsed.errors);
    } catch {
      setLocalError("Excel faylını yoxlamaq mümkün olmadı.");
    } finally {
      setParsing(false);
    }
  }

  async function downloadSample() {
    if (downloadingSample) return;
    setDownloadingSample(true);
    setLocalError(null);
    try {
      await downloadLimitsSampleWorkbook();
    } catch {
      setLocalError("Nümunə Excel faylını hazırlamaq mümkün olmadı.");
    } finally {
      setDownloadingSample(false);
    }
  }

  async function previewImport() {
    if (errors.length > 0 || rows.length === 0) return;
    await operation.preview(
      {
        operation: "IMPORT_LIMITS",
        rows: rows.map(({ externalId, minimumPrice, maximumPrice }) => ({
          externalId,
          minimumPrice,
          maximumPrice
        }))
      },
      {
        title: "Excel limitlərini tətbiq etməyi təsdiqləyin",
        description: "Yalnız önizləmədə göstərilən yerli məhsul limitləri bir atomik əməliyyatda dəyişdiriləcək. Boş xanalar mövcud limiti qoruyur."
      }
    );
  }

  const busy = parsing || operation.previewing || operation.applying;
  return (
    <div className="settings-panel-form excel-limit-panel">
      <div className="excel-limit-panel__actions">
        <label className={`button button--secondary excel-file-button${busy ? " is-disabled" : ""}`}>
          <span>Excel Faylı Seç</span>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => void chooseFile(event)}
            disabled={busy}
          />
        </label>
        <button
          type="button"
          className="settings-link-button"
          onClick={() => void downloadSample()}
          disabled={busy || downloadingSample}
          aria-busy={downloadingSample}
        >
          {downloadingSample ? "Hazırlanır…" : "Nümunə excel yüklə"}
        </button>
      </div>

      {filename && <p className="excel-limit-panel__filename"><strong>Seçilmiş fayl:</strong> {filename}</p>}
      {parsing && <p className="settings-loading" role="status"><span className="loading-spinner" />Fayl yoxlanılır…</p>}
      {localError && <p className="settings-inline-error" role="alert">{localError}</p>}
      {errors.length > 0 && (
        <div className="excel-limit-panel__validation" role="alert" aria-labelledby="excel-errors-heading">
          <strong id="excel-errors-heading">Faylda {errors.length} xəta tapıldı</strong>
          <ul>
            {errors.slice(0, 50).map((error, index) => (
              <li key={errorKey(error, index)}>
                {error.rowNumber > 0 ? `${error.rowNumber}-ci sətir: ` : ""}{error.message}
              </li>
            ))}
          </ul>
          {errors.length > 50 && <p>Daha {errors.length - 50} xəta göstərilmir.</p>}
        </div>
      )}
      {!parsing && filename && errors.length === 0 && rows.length === 0 && (
        <p className="settings-inline-error" role="alert">Dəyişdiriləcək limit sətri tapılmadı.</p>
      )}
      {rows.length > 0 && errors.length === 0 && (
        <div className="excel-limit-panel__preview" role="status">
          <strong>{rows.length} sətir fayl formatı üzrə düzgündür.</strong>
          <p>Məhsul kodları və yekun limitlər növbəti önizləmədə lokal API tərəfindən yoxlanacaq.</p>
        </div>
      )}
      {operation.feedback && (
        <p className={`form-feedback form-feedback--${operation.feedback.tone}`} role={operation.feedback.tone === "error" ? "alert" : "status"}>
          {operation.feedback.message}
        </p>
      )}

      <button
        type="button"
        className="button button--primary"
        onClick={() => void previewImport()}
        disabled={busy || errors.length > 0 || rows.length === 0}
        aria-busy={operation.previewing}
      >
        {operation.previewing ? "Önizləmə hazırlanır…" : "Limitləri yoxla və önizlə"}
      </button>

      <ConfirmationDialog
        open={Boolean(operation.confirmation)}
        title={operation.confirmation?.title ?? "Excel limitlərini təsdiqləyin"}
        description={operation.confirmation?.description ?? ""}
        preview={operation.confirmation?.preview ?? null}
        busy={operation.applying}
        onClose={operation.closeConfirmation}
        onConfirm={operation.apply}
      />
    </div>
  );
}
