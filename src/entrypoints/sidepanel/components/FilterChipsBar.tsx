import { X, RefreshCw } from 'lucide-react';
import type { PerformanceFilterState, BadgeFilterValue } from '../../../shared/utils/sortFilter';
import { BADGE_METADATA, type BadgeType } from '../../../shared/utils/performanceRanker';

interface FilterChipsBarProps {
  filters: PerformanceFilterState;
  onChangeFilters: (next: PerformanceFilterState) => void;
  onClearAll: () => void;
}

export function FilterChipsBar({ filters, onChangeFilters, onClearAll }: FilterChipsBarProps) {
  const chips: { id: string; label: string; onRemove: () => void }[] = [];

  // 1. Badge chips
  if (filters.badges && filters.badges.length > 0) {
    filters.badges.forEach((bKey) => {
      const label =
        bKey === 'no-badge'
          ? 'No Badge'
          : BADGE_METADATA[bKey as BadgeType]?.label ?? bKey;
      chips.push({
        id: `badge-${bKey}`,
        label,
        onRemove: () => {
          onChangeFilters({
            ...filters,
            badges: filters.badges.filter((b) => b !== bKey),
          });
        },
      });
    });
  }

  // 2. Score range chip
  if (filters.minScore != null || filters.maxScore != null) {
    let label = '';
    if (filters.minScore != null && filters.maxScore != null) {
      label = `Score ${filters.minScore}–${filters.maxScore}`;
    } else if (filters.minScore != null) {
      label = `Score ≥ ${filters.minScore}`;
    } else {
      label = `Score ≤ ${filters.maxScore}`;
    }
    chips.push({
      id: 'score-range',
      label,
      onRemove: () => {
        onChangeFilters({ ...filters, minScore: null, maxScore: null });
      },
    });
  }

  // 3. Overall rank chip
  if (filters.maxOverallRank != null) {
    chips.push({
      id: 'rank-limit',
      label: `Top ${filters.maxOverallRank} overall`,
      onRemove: () => {
        onChangeFilters({ ...filters, maxOverallRank: null });
      },
    });
  }

  // 4. ER range chip
  if (filters.minER != null || filters.maxER != null) {
    let label = '';
    if (filters.minER != null && filters.maxER != null) {
      label = `ER ${filters.minER}%–${filters.maxER}%`;
    } else if (filters.minER != null) {
      label = `ER ≥ ${filters.minER}%`;
    } else {
      label = `ER ≤ ${filters.maxER}%`;
    }
    chips.push({
      id: 'er-range',
      label,
      onRemove: () => {
        onChangeFilters({ ...filters, minER: null, maxER: null });
      },
    });
  }

  // 5. Toggle chips
  if (filters.hasBadgeOnly) {
    chips.push({
      id: 'has-badge-only',
      label: 'Has Badge',
      onRemove: () => onChangeFilters({ ...filters, hasBadgeOnly: false }),
    });
  }
  if (filters.noBadgeOnly) {
    chips.push({
      id: 'no-badge-only',
      label: 'No Badge only',
      onRemove: () => onChangeFilters({ ...filters, noBadgeOnly: false }),
    });
  }
  if (filters.top10PercentOnly) {
    chips.push({
      id: 'top-10-percent',
      label: 'Top 10%',
      onRemove: () => onChangeFilters({ ...filters, top10PercentOnly: false }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E6E8EC] bg-[#F8F9FC] px-3.5 py-1.5 text-[11px]">
      <span className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider shrink-0">
        Filters:
      </span>
      <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
        {chips.map((chip) => (
          <span
            key={chip.id}
            className="inline-flex items-center gap-1 rounded bg-white border border-[#E6E8EC] px-2 py-0.5 text-[10.5px] font-medium text-[#171A21] shadow-xs"
          >
            <span>{chip.label}</span>
            <button
              onClick={chip.onRemove}
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[#667085] hover:bg-[#E6E8EC] hover:text-[#171A21]"
              title={`Remove ${chip.label} filter`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <button
        onClick={onClearAll}
        className="text-[10.5px] font-medium text-[#6558E8] hover:underline shrink-0 ml-auto"
        title="Clear performance filters"
      >
        Clear all
      </button>
    </div>
  );
}
