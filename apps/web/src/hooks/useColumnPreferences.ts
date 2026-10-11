import { useEffect, useMemo, useState } from "react";
import type { TableColumn } from "../tableColumns";

interface StoredColumnPreferences {
  version: 1;
  order: string[];
  visible: string[];
}

interface ColumnPreferenceState<Id extends string> {
  order: Id[];
  visible: Id[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function uniqueKnownIds<Id extends string>(value: unknown, knownIds: ReadonlySet<Id>): Id[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<Id>();
  const result: Id[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string" || !knownIds.has(candidate as Id) || seen.has(candidate as Id)) continue;
    seen.add(candidate as Id);
    result.push(candidate as Id);
  }
  return result;
}

function createDefaultState<Id extends string>(
  columns: readonly TableColumn<Id>[],
  defaultVisible: readonly Id[]
): ColumnPreferenceState<Id> {
  return {
    order: columns.map((column) => column.id),
    visible: [...defaultVisible]
  };
}

export function resolveColumnPreferences<Id extends string>(
  raw: string | null,
  columns: readonly TableColumn<Id>[],
  defaultVisible: readonly Id[]
): ColumnPreferenceState<Id> {
  const fallback = createDefaultState(columns, defaultVisible);

  try {
    if (!raw) return fallback;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return fallback;

    const knownIds = new Set(columns.map((column) => column.id));
    const storedOrder = uniqueKnownIds(parsed.order, knownIds);
    const storedVisible = uniqueKnownIds(parsed.visible, knownIds);
    const order = [...storedOrder, ...fallback.order.filter((id) => !storedOrder.includes(id))];

    return {
      order,
      visible: storedVisible.length > 0 ? storedVisible : fallback.visible
    };
  } catch {
    return fallback;
  }
}

function loadState<Id extends string>(
  storageKey: string,
  columns: readonly TableColumn<Id>[],
  defaultVisible: readonly Id[]
): ColumnPreferenceState<Id> {
  try {
    return resolveColumnPreferences(window.localStorage.getItem(storageKey), columns, defaultVisible);
  } catch {
    return createDefaultState(columns, defaultVisible);
  }
}

export function useColumnPreferences<Id extends string>(
  storageKey: string,
  columns: readonly TableColumn<Id>[],
  defaultVisible: readonly Id[]
) {
  const [state, setState] = useState<ColumnPreferenceState<Id>>(
    () => loadState(storageKey, columns, defaultVisible)
  );

  useEffect(() => {
    const payload: StoredColumnPreferences = {
      version: 1,
      order: state.order,
      visible: state.visible
    };

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // The table remains usable when browser storage is unavailable.
    }
  }, [state, storageKey]);

  const columnsById = useMemo(
    () => new Map(columns.map((column) => [column.id, column] as const)),
    [columns]
  );

  const orderedColumns = useMemo(
    () => state.order.flatMap((id) => {
      const column = columnsById.get(id);
      return column ? [column] : [];
    }),
    [columnsById, state.order]
  );

  const visibleSet = useMemo(() => new Set(state.visible), [state.visible]);
  const visibleColumns = useMemo(
    () => orderedColumns.filter((column) => visibleSet.has(column.id)),
    [orderedColumns, visibleSet]
  );

  function toggleVisibility(id: Id) {
    setState((current) => {
      const isVisible = current.visible.includes(id);
      if (isVisible && current.visible.length === 1) return current;
      return {
        ...current,
        visible: isVisible
          ? current.visible.filter((visibleId) => visibleId !== id)
          : [...current.visible, id]
      };
    });
  }

  function moveColumn(id: Id, targetIndex: number) {
    setState((current) => {
      const currentIndex = current.order.indexOf(id);
      if (currentIndex < 0) return current;

      const boundedIndex = Math.max(0, Math.min(targetIndex, current.order.length - 1));
      if (boundedIndex === currentIndex) return current;

      const order = [...current.order];
      order.splice(currentIndex, 1);
      order.splice(boundedIndex, 0, id);
      return { ...current, order };
    });
  }

  function reset() {
    setState(createDefaultState(columns, defaultVisible));
  }

  return {
    order: state.order,
    visibleIds: state.visible,
    orderedColumns,
    visibleColumns,
    visibleCount: state.visible.length,
    totalCount: columns.length,
    toggleVisibility,
    moveColumn,
    reset
  };
}
