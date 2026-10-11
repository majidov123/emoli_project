import type {
  BotProductFilters,
  ProductFilters,
  ProductSource,
  ProductStatus
} from "./types";

interface DashboardProductFilterState {
  source: ProductSource;
  search: string;
  bbuPage: number;
  bbuPageSize: number;
  bbuStatus?: ProductStatus;
  botPage: number;
  botPageSize: number;
  botFilters: BotProductFilters;
}

export function createProductFilters(state: DashboardProductFilterState): ProductFilters {
  if (state.source === "bbu") {
    return {
      page: state.bbuPage,
      pageSize: state.bbuPageSize,
      search: state.search,
      status: state.bbuStatus,
      category: "",
      botEnabled: "all"
    };
  }

  return {
    page: state.botPage,
    pageSize: state.botPageSize,
    search: state.search,
    category: state.botFilters.category,
    botEnabled: state.botFilters.botEnabled,
    stockBucket: state.botFilters.stockBucket === "all"
      ? undefined
      : state.botFilters.stockBucket,
    hasMinimumPrice: state.botFilters.minimumPrice === "all"
      ? undefined
      : state.botFilters.minimumPrice === "limited"
  };
}

export async function reloadDashboardData(
  refreshers: readonly (() => Promise<unknown>)[]
): Promise<void> {
  const results = await Promise.allSettled(refreshers.map((refresh) => refresh()));
  const rejected = results.find((result) => result.status === "rejected");
  if (rejected?.status === "rejected") throw rejected.reason;
}
