import { useEffect, useRef, useState } from 'react';
import { Sparkles, ChevronDown, X, Check, Filter } from 'lucide-react';
import type { PerformanceFilterState, BadgeFilterValue } from '../../../shared/utils/sortFilter';
import { DEFAULT_PERFORMANCE_FILTERS, isPerformanceFilterActive } from '../../../shared/utils/sortFilter';
import { BADGE_METADATA, type BadgeType } from '../../../shared/utils/performanceRanker';

interface PerformanceFilterPopoverProps {
  filters: PerformanceFilterState;
  onChangeFilters: (next: PerformanceFilterState) => void;
  categoryCounts: Record<BadgeFilterValue, number>;
  totalBaseItems: number;
}

const BADGE_OPTIONS: { key: BadgeFilterValue; label: string }[] = [
  { key: 'top-performer', label: 'Top Performer' },
  { key: 'most-engaged', label: 'Most Engaged' },
  { key: 'most-liked', label: 'Most Liked' },
  { key: 'most-viewed', label: 'Most Viewed' },
  { key: 'trending', label: 'Trending' },
  { key: 'best-reach', label: 'Best Reach' },
  { key: 'rising-post', label: 'Rising Post' },
  { key: 'high-performer', label: 'High Performer' },
  { key: 'no-badge', label: 'No Badge' },
];

export function PerformanceFilterPopover({
  filters,
  onChangeFilters,
  categoryCounts,
  totalBaseItems,
}: PerformanceFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isActive = isPerformanceFilterActive(filters);
  const selectedBadges = filters.badges ?? [];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Trigger button label logic (Section 35)
  let triggerLabel = 'Performance';
  if (selectedBadges.length === 1) {
    const opt = BADGE_OPTIONS.find((o) => o.key === selectedBadges[0]);
    triggerLabel = opt ? opt.label : 'Performance';
  } else if (selectedBadges.length === 2) {
    const opt1 = BADGE_OPTIONS.find((o) => o.key === selectedBadges[0]);
    const opt2 = BADGE_OPTIONS.find((o) => o.key === selectedBadges[1]);
    const short1 = opt1?.key === 'no-badge' ? 'No Badge' : BADGE_METADATA[opt1?.key as BadgeType]?.shortLabel ?? opt1?.label;
    const short2 = opt2?.key === 'no-badge' ? 'No Badge' : BADGE_METADATA[opt2?.key as BadgeType]?.shortLabel ?? opt2?.label;
    triggerLabel = `${short1} + ${short2}`;
  } else if (selectedBadges.length > 2) {
    triggerLabel = `Performance · ${selectedBadges.length}`;
  } else if (isActive) {
    triggerLabel = 'Performance (Filtered)';
  }

  const toggleBadge = (key: BadgeFilterValue) => {
    const exists = selectedBadges.includes(key);
    const nextBadges = exists
      ? selectedBadges.filter((b) => b !== key)
      : [...selectedBadges, key];
    onChangeFilters({ ...filters, badges: nextBadges });
  };

  const handleClear = () => {
    onChangeFilters({ ...DEFAULT_PERFORMANCE_FILTERS });
  };

  const applyPresetScore = (min: number | null, max: number | null) => {
    onChangeFilters({ ...filters, minScore: min, maxScore: max });
  };

  const applyPresetRank = (maxRank: number | null) => {
    onChangeFilters({ ...filters, maxOverallRank: maxRank });
  };

  return (
    <div ref={popoverRef} className="relative inline-block text-left shrink-0">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Filter media by performance metrics"
        className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-all active:scale-95 ${
          isActive
            ? 'border-[#6558E8] bg-[#6558E8]/10 text-[#6558E8] font-semibold'
            : 'border-[#E6E8EC] bg-white text-[#171A21] hover:border-[#D1D5DB] hover:bg-[#F4F5F7]'
        }`}
      >
        <Sparkles className={`h-3.5 w-3.5 ${isActive ? 'text-[#6558E8]' : 'text-[#667085]'}`} />
        <span className="truncate max-w-[110px]">{triggerLabel}</span>
        <ChevronDown className="h-3 w-3 text-[#667085]" />
      </button>

      {/* Popover Card Modal */}
      {open && (
        <div className="absolute left-0 top-9 z-50 w-[280px] rounded-lg border border-[#E6E8EC] bg-white p-3 shadow-xl text-[#171A21] animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-[#E6E8EC] pb-2">
            <span className="text-[12px] font-semibold">Filter by Performance</span>
            <button
              onClick={() => setOpen(false)}
              className="flex h-5 w-5 items-center justify-center rounded text-[#667085] hover:bg-[#F4F5F7]"
              aria-label="Close performance filter popover"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Multi-Select Badge Options List */}
          <div className="mt-2 flex flex-col gap-1 max-h-[190px] overflow-y-auto pr-1">
            {BADGE_OPTIONS.map((opt) => {
              const checked = selectedBadges.includes(opt.key);
              const count = categoryCounts[opt.key] ?? 0;
              const meta = opt.key !== 'no-badge' ? BADGE_METADATA[opt.key as BadgeType] : null;

              return (
                <label
                  key={opt.key}
                  className={`flex items-center justify-between rounded px-2 py-1 text-[11px] cursor-pointer transition-colors ${
                    checked ? 'bg-[#6558E8]/10 text-[#6558E8] font-medium' : 'hover:bg-[#F8F9FC] text-[#171A21]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBadge(opt.key)}
                      className="h-3.5 w-3.5 rounded border-[#D1D5DB] text-[#6558E8] focus:ring-[#6558E8] cursor-pointer"
                    />
                    <span className="truncate">{opt.label}</span>
                  </div>
                  <span className={`text-[10px] tabular-nums font-semibold px-1.5 py-0.2 rounded ${
                    count > 0 ? 'bg-[#E6E8EC] text-[#171A21]' : 'text-[#9CA3AF]'
                  }`}>
                    {count}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Quick Rank & Score Presets */}
          <div className="mt-2.5 border-t border-[#E6E8EC] pt-2">
            <div className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider mb-1">
              Quick Shortcuts
            </div>
            <div className="flex flex-wrap gap-1 text-[10px]">
              <button
                onClick={() => applyPresetRank(3)}
                className={`rounded border px-1.5 py-0.5 transition-colors ${
                  filters.maxOverallRank === 3 ? 'border-[#6558E8] bg-[#6558E8]/10 text-[#6558E8]' : 'border-[#E6E8EC] hover:bg-[#F4F5F7]'
                }`}
              >
                Top 3 overall
              </button>
              <button
                onClick={() => applyPresetRank(5)}
                className={`rounded border px-1.5 py-0.5 transition-colors ${
                  filters.maxOverallRank === 5 ? 'border-[#6558E8] bg-[#6558E8]/10 text-[#6558E8]' : 'border-[#E6E8EC] hover:bg-[#F4F5F7]'
                }`}
              >
                Top 5 overall
              </button>
              <button
                onClick={() => applyPresetScore(60, 79)}
                className={`rounded border px-1.5 py-0.5 transition-colors ${
                  filters.minScore === 60 && filters.maxScore === 79
                    ? 'border-[#6558E8] bg-[#6558E8]/10 text-[#6558E8]'
                    : 'border-[#E6E8EC] hover:bg-[#F4F5F7]'
                }`}
              >
                Score 60–79
              </button>
              <button
                onClick={() => applyPresetScore(80, 100)}
                className={`rounded border px-1.5 py-0.5 transition-colors ${
                  filters.minScore === 80 && filters.maxScore === 100
                    ? 'border-[#6558E8] bg-[#6558E8]/10 text-[#6558E8]'
                    : 'border-[#E6E8EC] hover:bg-[#F4F5F7]'
                }`}
              >
                Score 80+
              </button>
            </div>
          </div>

          {/* Collapsible Advanced Filters (Section 38) */}
          <div className="mt-2 border-t border-[#E6E8EC] pt-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between text-[11px] font-medium text-[#6558E8] hover:underline"
            >
              <span>Advanced filters</span>
              <span>{showAdvanced ? '▲' : '▼'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-2 flex flex-col gap-2 rounded bg-[#F8F9FC] p-2 text-[11px]">
                {/* Min / Max Score */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[#667085]">Score (0-100):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="Min"
                      min={0}
                      max={100}
                      value={filters.minScore ?? ''}
                      onChange={(e) =>
                        onChangeFilters({
                          ...filters,
                          minScore: e.target.value !== '' ? Number(e.target.value) : null,
                        })
                      }
                      className="h-6 w-12 rounded border border-[#E6E8EC] bg-white px-1 text-[10px]"
                    />
                    <span>-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      min={0}
                      max={100}
                      value={filters.maxScore ?? ''}
                      onChange={(e) =>
                        onChangeFilters({
                          ...filters,
                          maxScore: e.target.value !== '' ? Number(e.target.value) : null,
                        })
                      }
                      className="h-6 w-12 rounded border border-[#E6E8EC] bg-white px-1 text-[10px]"
                    />
                  </div>
                </div>

                {/* Overall Rank Limit */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[#667085]">Overall Rank Top N:</span>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    min={1}
                    value={filters.maxOverallRank ?? ''}
                    onChange={(e) =>
                      onChangeFilters({
                        ...filters,
                        maxOverallRank: e.target.value !== '' ? Number(e.target.value) : null,
                      })
                    }
                    className="h-6 w-16 rounded border border-[#E6E8EC] bg-white px-1 text-[10px]"
                  />
                </div>

                {/* Min ER % */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[#667085]">Min ER %:</span>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    min={0}
                    step={0.5}
                    value={filters.minER ?? ''}
                    onChange={(e) =>
                      onChangeFilters({
                        ...filters,
                        minER: e.target.value !== '' ? Number(e.target.value) : null,
                      })
                    }
                    className="h-6 w-16 rounded border border-[#E6E8EC] bg-white px-1 text-[10px]"
                  />
                </div>

                {/* Quick Checkboxes */}
                <label className="flex items-center gap-1.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={Boolean(filters.hasBadgeOnly)}
                    onChange={(e) =>
                      onChangeFilters({ ...filters, hasBadgeOnly: e.target.checked })
                    }
                    className="h-3 w-3 rounded text-[#6558E8]"
                  />
                  <span>Has a performance badge</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(filters.noBadgeOnly)}
                    onChange={(e) =>
                      onChangeFilters({ ...filters, noBadgeOnly: e.target.checked })
                    }
                    className="h-3 w-3 rounded text-[#6558E8]"
                  />
                  <span>No Badge only</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(filters.top10PercentOnly)}
                    onChange={(e) =>
                      onChangeFilters({ ...filters, top10PercentOnly: e.target.checked })
                    }
                    className="h-3 w-3 rounded text-[#6558E8]"
                  />
                  <span>Top 10% overall</span>
                </label>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-3 flex items-center justify-between border-t border-[#E6E8EC] pt-2">
            <button
              onClick={handleClear}
              disabled={!isActive}
              className="text-[11px] font-medium text-[#667085] hover:text-[#171A21] disabled:opacity-40"
            >
              Clear
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded bg-[#6558E8] px-3 py-1 text-[11px] font-medium text-white hover:bg-[#5548D8]"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
