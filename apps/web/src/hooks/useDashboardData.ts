import { useCallback, useEffect, useState } from "react";
import { fetchProductCategories, fetchProducts, fetchStores } from "../api";
import type { ProductFilters, ProductsResponse, Store } from "../types";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function errorMessage(error: unknown) {
  if (error instanceof TypeError) return "API ilə əlaqə yaratmaq mümkün olmadı.";
  return error instanceof Error ? error.message : "Gözlənilməz xəta baş verdi.";
}

export function useStores() {
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<AsyncState<Store[]>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));

    fetchStores(controller.signal)
      .then((response) => setState({ data: response.data, loading: false, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ data: null, loading: false, error: errorMessage(error) });
        }
      });

    return () => controller.abort();
  }, [requestVersion]);

  const retry = useCallback(() => setRequestVersion((version) => version + 1), []);
  return { ...state, retry };
}

export function useProducts(filters: ProductFilters) {
  const [requestVersion, setRequestVersion] = useState(0);
  const queryKey = JSON.stringify([
    filters.page,
    filters.pageSize,
    filters.search,
    filters.status ?? null,
    filters.category,
    filters.botEnabled,
    filters.stockBucket ?? null,
    filters.hasMinimumPrice ?? null,
    requestVersion
  ]);
  const [state, setState] = useState<AsyncState<ProductsResponse> & { queryKey: string }>({
    data: null,
    loading: true,
    error: null,
    queryKey
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null, queryKey });

    fetchProducts(filters, controller.signal)
      .then((response) => setState({ data: response, loading: false, error: null, queryKey }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ data: null, loading: false, error: errorMessage(error), queryKey });
        }
      });

    return () => controller.abort();
  }, [
    filters.page,
    filters.pageSize,
    filters.search,
    filters.status,
    filters.category,
    filters.botEnabled,
    filters.stockBucket,
    filters.hasMinimumPrice,
    requestVersion
  ]);

  const retry = useCallback(() => setRequestVersion((version) => version + 1), []);
  return state.queryKey === queryKey
    ? { data: state.data, loading: state.loading, error: state.error, retry }
    : { data: null, loading: true, error: null, retry };
}

export function useProductCategories() {
  const [state, setState] = useState<AsyncState<string[]>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));

    fetchProductCategories(controller.signal)
      .then((response) => setState({ data: response.data, loading: false, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ data: null, loading: false, error: errorMessage(error) });
        }
      });

    return () => controller.abort();
  }, []);

  return state;
}

export function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}
