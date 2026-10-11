import { useCallback, useEffect, useRef, useState } from "react";
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
  const controllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<AsyncState<Store[]>>({
    data: null,
    loading: true,
    error: null
  });

  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await fetchStores(controller.signal);
      setState({ data: response.data, loading: false, error: null });
    } catch (error: unknown) {
      if (controller.signal.aborted) throw error;
      const message = errorMessage(error);
      setState({ data: null, loading: false, error: message });
      throw new Error(message);
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
    return () => controllerRef.current?.abort();
  }, [refresh]);

  const retry = useCallback(() => void refresh().catch(() => undefined), [refresh]);
  return { ...state, retry, refresh };
}

export function useProducts(filters: ProductFilters) {
  const controllerRef = useRef<AbortController | null>(null);
  const queryKey = JSON.stringify([
    filters.page,
    filters.pageSize,
    filters.search,
    filters.status ?? null,
    filters.category,
    filters.botEnabled,
    filters.stockBucket ?? null,
    filters.hasMinimumPrice ?? null
  ]);
  const [state, setState] = useState<AsyncState<ProductsResponse> & { queryKey: string }>({
    data: null,
    loading: true,
    error: null,
    queryKey
  });

  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ data: null, loading: true, error: null, queryKey });

    try {
      const response = await fetchProducts({
        page: filters.page,
        pageSize: filters.pageSize,
        search: filters.search,
        status: filters.status,
        category: filters.category,
        botEnabled: filters.botEnabled,
        stockBucket: filters.stockBucket,
        hasMinimumPrice: filters.hasMinimumPrice
      }, controller.signal);
      setState({ data: response, loading: false, error: null, queryKey });
    } catch (error: unknown) {
      if (controller.signal.aborted) throw error;
      const message = errorMessage(error);
      setState({ data: null, loading: false, error: message, queryKey });
      throw new Error(message);
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [
    filters.page,
    filters.pageSize,
    filters.search,
    filters.status,
    filters.category,
    filters.botEnabled,
    filters.stockBucket,
    filters.hasMinimumPrice,
    queryKey
  ]);

  useEffect(() => {
    void refresh().catch(() => undefined);
    return () => controllerRef.current?.abort();
  }, [refresh]);

  const retry = useCallback(() => void refresh().catch(() => undefined), [refresh]);
  return state.queryKey === queryKey
    ? { data: state.data, loading: state.loading, error: state.error, retry, refresh }
    : { data: null, loading: true, error: null, retry, refresh };
}

export function useProductCategories() {
  const controllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<AsyncState<string[]>>({
    data: null,
    loading: true,
    error: null
  });

  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await fetchProductCategories(controller.signal);
      setState({ data: response.data, loading: false, error: null });
    } catch (error: unknown) {
      if (controller.signal.aborted) throw error;
      const message = errorMessage(error);
      setState({ data: null, loading: false, error: message });
      throw new Error(message);
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
    return () => controllerRef.current?.abort();
  }, [refresh]);

  const retry = useCallback(() => void refresh().catch(() => undefined), [refresh]);

  return { ...state, retry, refresh };
}

export function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}
