/**
 * Pure date-range filtering, performance badge filtering, and multi-criteria sorting.
 *
 * CRITICAL PIPELINE ORDER:
 * 1. Base dataset filtering (Date range, Search, etc.)
 * 2. Calculate performance rankings on the BASE comparison dataset
 * 3. Apply Performance Badge & Advanced Performance Filters (Score, Rank, ER)
 * 4. Apply display sorting (Likes, Comments, Date, Views, ER, Default)
 *
 * This prevents circular recalculation so badges remain stable and truthful!
 */
import type { InstagramMediaItem, SortKey } from '../types/instagram';
import {
  calculatePerformanceRankings,
  BADGE_METADATA,
  type BadgeType,
  type RankingResult,
} from './performanceRanker';

export type BadgeFilterValue = BadgeType | 'no-badge';

export interface PerformanceFilterState {
  /** Selected badge categories (OR logic within array). Empty array = All performance. */
  badges: BadgeFilterValue[];
  /** Min performance score (0-100). null/undefined = no min. */
  minScore?: number | null;
  /** Max performance score (0-100). null/undefined = no max. */
  maxScore?: number | null;
  /** Max overall rank (e.g. 3 for Top 3, 5 for Top 5, 10 for Top 10). null/undefined = no limit. */
  maxOverallRank?: number | null;
  /** Min ER percent (e.g. 10 for 10%). null/undefined = no min. */
  minER?: number | null;
  /** Max ER percent. null/undefined = no max. */
  maxER?: number | null;
  /** Quick toggles */
  hasBadgeOnly?: boolean;
  noBadgeOnly?: boolean;
  top10PercentOnly?: boolean;
}

export const DEFAULT_PERFORMANCE_FILTERS: Readonly<PerformanceFilterState> = Object.freeze({
  badges: [],
  minScore: null,
  maxScore: null,
  maxOverallRank: null,
  minER: null,
  maxER: null,
  hasBadgeOnly: false,
  noBadgeOnly: false,
  top10PercentOnly: false,
});

export interface DateFilterResult {
  items: InstagramMediaItem[];
  hadMissingDate: boolean;
}

export function filterByDateRange(
  items: InstagramMediaItem[],
  days: number,
): DateFilterResult {
  if (!days || days <= 0) return { items: [...items], hadMissingDate: false };
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  let hadMissingDate = false;
  const out: InstagramMediaItem[] = [];
  for (const item of items) {
    if (item.createdAt == null) {
      hadMissingDate = true;
      continue;
    }
    if (item.createdAt >= cutoff) out.push(item);
  }
  return { items: out, hadMissingDate };
}

export interface SortResult {
  items: InstagramMediaItem[];
  hadMissingMetric: boolean;
}

export function sortByKey(
  items: InstagramMediaItem[],
  key: SortKey,
): SortResult {
  if (!key) return { items: [...items], hadMissingMetric: false };

  let hadMissingMetric = false;
  const sorted = [...items].sort((a, b) => {
    const av = a[key] as number | undefined;
    const bv = b[key] as number | undefined;
    if (av === undefined || bv === undefined) hadMissingMetric = true;
    if (av === undefined && bv === undefined) return 0;
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    return bv - av;
  });
  return { items: sorted, hadMissingMetric };
}

export interface FilterSortOptions {
  days: number;
  sortKey: SortKey;
  performanceFilters?: PerformanceFilterState;
}

export interface FilterSortOutput {
  items: InstagramMediaItem[];
  baseItems: InstagramMediaItem[];
  rankings: RankingResult;
  categoryCounts: Record<BadgeFilterValue, number>;
  hadMissingDate: boolean;
  hadMissingMetric: boolean;
  isPerformanceFiltered: boolean;
}

/** Check if any performance filter option is active */
export function isPerformanceFilterActive(filters: PerformanceFilterState): boolean {
  if (!filters) return false;
  return (
    (filters.badges && filters.badges.length > 0) ||
    (filters.minScore != null && filters.minScore > 0) ||
    (filters.maxScore != null && filters.maxScore < 100) ||
    (filters.maxOverallRank != null && filters.maxOverallRank > 0) ||
    (filters.minER != null && filters.minER > 0) ||
    (filters.maxER != null && filters.maxER < 100) ||
    Boolean(filters.hasBadgeOnly) ||
    Boolean(filters.noBadgeOnly) ||
    Boolean(filters.top10PercentOnly)
  );
}

/** Check if an item matches active performance filters */
export function matchesPerformanceFilter(
  item: InstagramMediaItem,
  rankings: RankingResult,
  filters: PerformanceFilterState,
): boolean {
  if (!isPerformanceFilterActive(filters)) return true;

  const rankInfo = rankings.byCode.get(item.code);
  const badgeKey: BadgeFilterValue = rankInfo?.badge ? rankInfo.badge.type : 'no-badge';

  // 1. Badge Multi-select OR match
  if (filters.badges && filters.badges.length > 0) {
    if (!filters.badges.includes(badgeKey)) {
      return false;
    }
  }

  // 2. Quick toggles
  if (filters.hasBadgeOnly && !rankInfo?.badge) return false;
  if (filters.noBadgeOnly && rankInfo?.badge) return false;

  const score = rankInfo?.overallScore ?? 0;
  const overallRank = rankInfo?.overallRank ?? 999999;
  const erPercent = item.engagementRate != null ? item.engagementRate * 100 : 0;

  // 3. Top 10% toggle
  if (filters.top10PercentOnly) {
    const top10Threshold = Math.max(1, Math.ceil(rankings.totalCount * 0.10));
    if (overallRank > top10Threshold) return false;
  }

  // 4. Score range match
  if (filters.minScore != null && score < filters.minScore) return false;
  if (filters.maxScore != null && score > filters.maxScore) return false;

  // 5. Overall Rank limit match
  if (filters.maxOverallRank != null && overallRank > filters.maxOverallRank) return false;

  // 6. ER range match
  if (filters.minER != null && erPercent < filters.minER) return false;
  if (filters.maxER != null && erPercent > filters.maxER) return false;

  return true;
}

/** Main pipeline: date filter -> calculate rankings -> performance filter -> sort */
export function filterAndSort(
  allMedia: InstagramMediaItem[],
  { days, sortKey, performanceFilters = DEFAULT_PERFORMANCE_FILTERS }: FilterSortOptions,
): FilterSortOutput {
  // Step 1: Base dataset filter (Date range)
  const dateFiltered = filterByDateRange(allMedia, days);
  const baseItems = dateFiltered.items;

  // Step 2: Calculate Rankings on BASE comparison set
  const rankings = calculatePerformanceRankings(baseItems);

  // Calculate live category counts for popover UI
  const categoryCounts: Record<BadgeFilterValue, number> = {
    'top-performer': 0,
    'most-engaged': 0,
    'most-liked': 0,
    'most-viewed': 0,
    'trending': 0,
    'best-reach': 0,
    'rising-post': 0,
    'high-performer': 0,
    'no-badge': 0,
  };

  baseItems.forEach((item) => {
    const info = rankings.byCode.get(item.code);
    const badgeKey: BadgeFilterValue = info?.badge ? info.badge.type : 'no-badge';
    categoryCounts[badgeKey] = (categoryCounts[badgeKey] || 0) + 1;
  });

  const activePerf = isPerformanceFilterActive(performanceFilters);

  // Step 3: Performance Badge & Advanced Filtering
  let perfFiltered: InstagramMediaItem[] = baseItems;
  if (activePerf) {
    perfFiltered = baseItems.filter((item) =>
      matchesPerformanceFilter(item, rankings, performanceFilters),
    );
  }

  // Step 4: Apply Display Sorting
  const sorted = sortByKey(perfFiltered, sortKey);

  return {
    items: sorted.items,
    baseItems,
    rankings,
    categoryCounts,
    hadMissingDate: dateFiltered.hadMissingDate,
    hadMissingMetric: sorted.hadMissingMetric,
    isPerformanceFiltered: activePerf,
  };
}
