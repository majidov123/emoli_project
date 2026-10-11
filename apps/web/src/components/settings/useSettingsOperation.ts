import { useEffect, useRef, useState } from "react";
import { ApiRequestError, applySettingsOperation, previewSettingsOperation } from "../../api";
import type {
  SettingsOperationApplyInput,
  SettingsOperationPreview,
  SettingsOperationPreviewInput,
  SettingsOperationResult
} from "../../types";

export interface OperationConfirmation {
  input: SettingsOperationPreviewInput;
  preview: SettingsOperationPreview;
  title: string;
  description: string;
  tone: "default" | "danger";
}

interface PreviewOptions {
  title: string;
  description: string;
  tone?: "default" | "danger";
}

function requestMessage(error: unknown, fallback: string) {
  if (error instanceof DOMException && error.name === "AbortError") return null;
  if (error instanceof ApiRequestError) {
    if (error.code === "PREVIEW_STALE") return "Məlumat dəyişib. Əməliyyatı yenidən önizləyin.";
    if (error.code === "NO_CHANGES") return "Dəyişdiriləcək məhsul tapılmadı.";
    if (error.code === "IMPORT_PRODUCTS_NOT_FOUND") return "Excel faylındakı bir və ya bir neçə məhsul aktiv lokal mağazada tapılmadı.";
    if (error.code === "INVALID_PRICE_BOUNDS") return "Alt limit üst limitdən böyük ola bilməz.";
    if (error.code === "VALIDATION_ERROR") return "Daxil edilən əməliyyat məlumatları düzgün deyil.";
    if (error.code === "ACTIVE_STORE_NOT_FOUND") return "Aktiv lokal mağaza tapılmadı.";
    if (error.code === "OPERATION_RETRY_REQUIRED") return "Məhsul məlumatı eyni anda dəyişdi. Yeni önizləmə yaradın.";
    return error.message || fallback;
  }
  if (error instanceof TypeError) return "Lokal API ilə əlaqə yaratmaq mümkün olmadı.";
  return fallback;
}

export function useSettingsOperation(
  onApplied?: (result: SettingsOperationResult) => void | Promise<void>
) {
  const previewControllerRef = useRef<AbortController | null>(null);
  const applyControllerRef = useRef<AbortController | null>(null);
  const [confirmation, setConfirmation] = useState<OperationConfirmation | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => () => {
    previewControllerRef.current?.abort();
    applyControllerRef.current?.abort();
  }, []);

  async function preview(input: SettingsOperationPreviewInput, options: PreviewOptions) {
    if (previewing || applying) return;
    previewControllerRef.current?.abort();
    const controller = new AbortController();
    previewControllerRef.current = controller;
    setPreviewing(true);
    setFeedback(null);

    try {
      const response = await previewSettingsOperation(input, controller.signal);
      if (response.data.affectedCount === 0) {
        setFeedback({ tone: "success", message: "Bu seçim üzrə dəyişdiriləcək məhsul tapılmadı." });
        return;
      }
      setConfirmation({
        input,
        preview: response.data,
        title: options.title,
        description: options.description,
        tone: options.tone ?? "default"
      });
    } catch (error: unknown) {
      const message = requestMessage(error, "Əməliyyatın önizləməsini hazırlamaq mümkün olmadı.");
      if (message) setFeedback({ tone: "error", message });
    } finally {
      if (previewControllerRef.current === controller) {
        previewControllerRef.current = null;
        setPreviewing(false);
      }
    }
  }

  async function apply() {
    if (!confirmation || applying) return;
    const controller = new AbortController();
    applyControllerRef.current = controller;
    setApplying(true);
    setFeedback(null);

    const input = {
      ...confirmation.input,
      previewToken: confirmation.preview.previewToken,
      expectedAffectedCount: confirmation.preview.affectedCount
    } as SettingsOperationApplyInput;

    try {
      const response = await applySettingsOperation(input, controller.signal);
      setConfirmation(null);
      try {
        await onApplied?.(response.data);
        setFeedback({
          tone: "success",
          message: `${response.data.affectedCount} məhsul üzrə lokal dəyişiklik tətbiq edildi.`
        });
      } catch {
        setFeedback({
          tone: "error",
          message: `${response.data.affectedCount} məhsul üzrə dəyişiklik tətbiq edildi, lakin dashboard məlumatlarını yeniləmək mümkün olmadı.`
        });
      }
    } catch (error: unknown) {
      const message = requestMessage(error, "Əməliyyatı tətbiq etmək mümkün olmadı.");
      if (message) {
        setConfirmation(null);
        setFeedback({ tone: "error", message });
      }
    } finally {
      if (applyControllerRef.current === controller) {
        applyControllerRef.current = null;
        setApplying(false);
      }
    }
  }

  function reset() {
    previewControllerRef.current?.abort();
    applyControllerRef.current?.abort();
    setConfirmation(null);
    setFeedback(null);
    setPreviewing(false);
    setApplying(false);
  }

  return {
    confirmation,
    previewing,
    applying,
    feedback,
    preview,
    apply,
    closeConfirmation: () => setConfirmation(null),
    clearFeedback: () => setFeedback(null),
    reset
  };
}
