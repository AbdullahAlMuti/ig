/**
 * Pure date-range filtering + multi-criteria sorting.
 *
 * Behaviour mirrors the original extension:
 *  - Date filter: cutoff = now − days·86400 (seconds). Items with no
 *    `createdAt` are dropped and flagged.
 *  - Sort: descending by the chosen numeric key; `undefined` values sink to
 *    the bottom. Key '' ("Default") preserves capture order.
 */
import type { InstagramMediaItem, SortKey } from '../types/instagram';

export interface DateFilterResult {
  items: InstagramMediaItem[];
  /** true when at least one item was dropped for lacking a date. */
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
  /** true when the sort key was absent on at least one item. */
  hadMissingMetric: boolean;
}

export function sortByKey(
  items: InstagramMediaItem[],
  key: SortKey,
): SortResult {
  // "Default" — preserve the order posts were captured in.
  if (!key) return { items: [...items], hadMissingMetric: false };

  let hadMissingMetric = false;
  const sorted = [...items].sort((a, b) => {
    const av = a[key] as number | undefined;
    const bv = b[key] as number | undefined;
    if (av === undefined || bv === undefined) hadMissingMetric = true;
    if (av === undefined && bv === undefined) return 0;
    if (av === undefined) return 1; // missing → bottom
    if (bv === undefined) return -1;
    return bv - av; // descending
  });
  return { items: sorted, hadMissingMetric };
}

export interface FilterSortOptions {
  days: number;
  sortKey: SortKey;
}

export interface FilterSortOutput {
  items: InstagramMediaItem[];
  hadMissingDate: boolean;
  hadMissingMetric: boolean;
}

/** Convenience: date-filter then sort in one pass. */
export function filterAndSort(
  items: InstagramMediaItem[],
  { days, sortKey }: FilterSortOptions,
): FilterSortOutput {
  const filtered = filterByDateRange(items, days);
  const sorted = sortByKey(filtered.items, sortKey);
  return {
    items: sorted.items,
    hadMissingDate: filtered.hadMissingDate,
    hadMissingMetric: sorted.hadMissingMetric,
  };
}
