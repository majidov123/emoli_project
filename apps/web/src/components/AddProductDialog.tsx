import { useEffect, useRef, useState, type FormEvent } from "react";
import { addProductsFromCatalog, ApiRequestError, fetchCatalogProducts } from "../api";
import { formatMoney } from "../formatters";
import type {
  AddProductsFromCatalogResponse,
  CatalogProduct,
  Pagination
} from "../types";
import { Icon } from "./Icon";
import { ProductImagePlaceholder } from "./ProductBits";

const CATALOG_PAGE_SIZE = 5;

interface AddProductDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: (result: AddProductsFromCatalogResponse) => void | Promise<void>;
}

function errorMessage(error: unknown, action: "search" | "add") {
  if (error instanceof DOMException && error.name === "AbortError") return null;
  if (error instanceof ApiRequestError && error.status === 409) {
    return "Seçilmiş məhsullardan biri artıq mağazaya əlavə edilib. Siyahını yeniləyib yenidən cəhd edin.";
  }
  if (error instanceof ApiRequestError) {
    return error.status === 503
      ? "Verilənlər bazası əlçatan deyil. PostgreSQL bağlantısını yoxlayın."
      : action === "search"
        ? "Lokal kataloqda axtarış aparmaq mümkün olmadı."
        : "Məhsulları əlavə etmək mümkün olmadı.";
  }
  if (error instanceof TypeError) return "Lokal API ilə əlaqə yaratmaq mümkün olmadı.";
  if (error instanceof Error && error.message) return error.message;
  return action === "search"
    ? "Kataloqda axtarış aparmaq mümkün olmadı."
    : "Məhsulları əlavə etmək mümkün olmadı.";
}

function isLocalImageUrl(value: string | null): value is string {
  if (!value) return false;
  return (value.startsWith("/") && !value.startsWith("//"))
    || value.startsWith("data:image/")
    || value.startsWith("blob:");
}

function CatalogImage({ product }: { product: CatalogProduct }) {
  const [failed, setFailed] = useState(false);

  if (failed || !isLocalImageUrl(product.imageUrl)) {
    return <ProductImagePlaceholder name={product.name} />;
  }

  return (
    <img
      className="product-image"
      src={product.imageUrl}
      alt={`${product.name} məhsulunun şəkli`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function AddProductDialog({ open, onClose, onAdded }: AddProductDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);
  const addControllerRef = useRef<AbortController | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [results, setResults] = useState<CatalogProduct[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setSearchInput("");
      setSubmittedSearch("");
      setResults(null);
      setPagination(null);
      setSelectedIds(new Set());
      setSearchError(null);
      setAddError(null);
      dialog.showModal();
      searchInputRef.current?.focus({ preventScroll: true });
    } else if (!open && dialog.open) {
      searchControllerRef.current?.abort();
      addControllerRef.current?.abort();
      dialog.close();
      previousFocusRef.current?.focus();
    }
  }, [open]);

  useEffect(() => () => {
    searchControllerRef.current?.abort();
    addControllerRef.current?.abort();
  }, []);

  async function searchCatalog(term: string, page: number) {
    const normalizedSearch = term.trim();
    if (!normalizedSearch) {
      setSearchError("Ad, barkod, MPN və ya məhsul kodu daxil edin.");
      searchInputRef.current?.focus();
      return;
    }

    searchControllerRef.current?.abort();
    const controller = new AbortController();
    searchControllerRef.current = controller;
    setSearching(true);
    setSearchError(null);
    setAddError(null);

    try {
      const response = await fetchCatalogProducts(
        normalizedSearch,
        page,
        CATALOG_PAGE_SIZE,
        controller.signal
      );
      setSubmittedSearch(normalizedSearch);
      setResults(response.data);
      setPagination(response.pagination);
    } catch (error: unknown) {
      const message = errorMessage(error, "search");
      if (message) {
        setResults(null);
        setPagination(null);
        setSearchError(message);
      }
    } finally {
      if (searchControllerRef.current === controller) {
        searchControllerRef.current = null;
        setSearching(false);
      }
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void searchCatalog(searchInput, 1);
  }

  function toggleSelection(product: CatalogProduct) {
    if (product.alreadyAdded) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(product.id)) next.delete(product.id);
      else if (next.size < 20) next.add(product.id);
      return next;
    });
    if (!selectedIds.has(product.id) && selectedIds.size >= 20) {
      setAddError("Bir əməliyyatda ən çox 20 məhsul seçilə bilər.");
      return;
    }
    setAddError(null);
  }

  function addAnotherProduct() {
    setSearchInput("");
    setSubmittedSearch("");
    setResults(null);
    setPagination(null);
    setSearchError(null);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  async function submitSelected() {
    if (selectedIds.size === 0 || adding) return;

    const controller = new AbortController();
    addControllerRef.current = controller;
    setAdding(true);
    setAddError(null);

    try {
      const response = await addProductsFromCatalog([...selectedIds], controller.signal);
      await onAdded(response);
    } catch (error: unknown) {
      const message = errorMessage(error, "add");
      if (message) setAddError(message);
    } finally {
      if (addControllerRef.current === controller) {
        addControllerRef.current = null;
        setAdding(false);
      }
    }
  }

  function handleNativeClose() {
    searchControllerRef.current?.abort();
    addControllerRef.current?.abort();
    previousFocusRef.current?.focus();
    if (open) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="add-product-dialog"
      aria-labelledby="add-product-dialog-title"
      aria-describedby="add-product-dialog-description"
      onClose={handleNativeClose}
      onCancel={() => {
        searchControllerRef.current?.abort();
        addControllerRef.current?.abort();
      }}
    >
      <header className="add-product-dialog__header">
        <div>
          <span className="section-kicker">Yeni məhsul</span>
          <h2 id="add-product-dialog-title">Məhsul əlavə et</h2>
          <p id="add-product-dialog-description">
            Yalnız lokal, uydurma kataloq məhsulları göstərilir.
          </p>
        </div>
        <button
          type="button"
          className="icon-button add-product-dialog__close"
          onClick={onClose}
          aria-label="Məhsul əlavə etmə dialoqunu bağla"
          disabled={adding}
        >
          <Icon name="x" />
        </button>
      </header>

      <div className="add-product-dialog__content">
        <section className="catalog-search" aria-labelledby="catalog-search-title">
          <div className="catalog-search__heading">
            <div>
              <h3 id="catalog-search-title">Yeni məhsul</h3>
              <p>Adı, barkodu, MPN və ya məhsul kodunu daxil edin</p>
            </div>
            {selectedIds.size > 0 && (
              <span className="catalog-selection-count" role="status">
                {selectedIds.size} məhsul seçilib
              </span>
            )}
          </div>

          <form className="catalog-search__form" onSubmit={handleSearch} role="search">
            <label className="search-field catalog-search__field">
              <span className="sr-only">Lokal kataloqda məhsul axtar</span>
              <Icon name="search" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Ad, barkod, MPN və ya məhsul kodu…"
                autoComplete="off"
                autoFocus
                maxLength={100}
                disabled={adding}
              />
            </label>
            <button
              type="submit"
              className="button button--primary catalog-search__submit"
              disabled={searching || adding || !searchInput.trim()}
              aria-busy={searching}
            >
              {searching ? "Axtarılır…" : "Axtar"}
            </button>
          </form>
        </section>

        <div className="catalog-results" aria-busy={searching} aria-live="polite">
          {searching ? (
            <div className="catalog-results__state" role="status">
              <span className="loading-spinner" aria-hidden="true" />
              <p>Lokal kataloqda axtarılır…</p>
            </div>
          ) : searchError ? (
            <div className="catalog-results__state catalog-results__state--error" role="alert">
              <Icon name="alert" />
              <p>{searchError}</p>
            </div>
          ) : results === null ? (
            <div className="catalog-results__state">
              <Icon name="search" />
              <p>Axtarış nəticələrini görmək üçün məhsul məlumatını daxil edin.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="catalog-results__state">
              <Icon name="box" />
              <p>“{submittedSearch}” üçün məhsul tapılmadı.</p>
            </div>
          ) : (
            <>
              <ul className="catalog-result-list" aria-label="Kataloq axtarış nəticələri">
                {results.map((product) => {
                  const selected = selectedIds.has(product.id);
                  return (
                    <li key={product.id} className={`catalog-result ${selected ? "is-selected" : ""}`}>
                      <CatalogImage product={product} />
                      <div className="catalog-result__details">
                        <strong title={product.name}>{product.name}</strong>
                        <span>Məhsul kodu: {product.externalId}</span>
                        <div className="catalog-result__meta">
                          {product.mpn && <span>MPN: {product.mpn}</span>}
                          {product.barcode && <span>Barkod: {product.barcode}</span>}
                          <span>{formatMoney(product.defaultPrice)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={selected ? "button button--secondary" : "button button--primary"}
                        onClick={() => toggleSelection(product)}
                        disabled={product.alreadyAdded || adding || (!selected && selectedIds.size >= 20)}
                        aria-pressed={selected}
                        aria-label={product.alreadyAdded
                          ? `${product.name} artıq mağazaya əlavə edilib`
                          : selected
                            ? `${product.name} seçimini ləğv et`
                            : `${product.name} məhsulunu seç`}
                      >
                        {product.alreadyAdded ? "Artıq əlavə edilib" : selected ? "Seçilib" : "Seçmək"}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {pagination && pagination.totalPages > 1 && (
                <nav className="catalog-pagination" aria-label="Kataloq nəticələrinin səhifələri">
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={pagination.page <= 1 || searching}
                    onClick={() => void searchCatalog(submittedSearch, pagination.page - 1)}
                  >
                    Əvvəlki
                  </button>
                  <span>Səhifə {pagination.page} / {pagination.totalPages}</span>
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={pagination.page >= pagination.totalPages || searching}
                    onClick={() => void searchCatalog(submittedSearch, pagination.page + 1)}
                  >
                    Növbəti
                  </button>
                </nav>
              )}
            </>
          )}
        </div>

        {selectedIds.size > 0 && (
          <button
            type="button"
            className="add-another-product"
            onClick={addAnotherProduct}
            disabled={adding}
          >
            <Icon name="plus" />
            Daha bir məhsul əlavə et
          </button>
        )}

        {addError && <p className="form-feedback form-feedback--error" role="alert">{addError}</p>}
      </div>

      <footer className="add-product-dialog__footer">
        <button type="button" className="button button--secondary" onClick={onClose} disabled={adding}>
          Ləğv et
        </button>
        <button
          type="button"
          className="button button--primary"
          onClick={() => void submitSelected()}
          disabled={selectedIds.size === 0 || adding}
          aria-busy={adding}
        >
          {adding ? "Əlavə edilir…" : "Məhsulu əlavə et"}
        </button>
      </footer>
    </dialog>
  );
}
