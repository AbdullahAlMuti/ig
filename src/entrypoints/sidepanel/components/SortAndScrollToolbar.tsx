import { Play, ArrowUpToLine, Square, Loader2 } from 'lucide-react';
import { DATE_RANGE_OPTIONS, SORT_OPTIONS } from '../../../shared/types/instagram';
import type { MediaStoreApi } from '../store/useMediaStore';
import { PerformanceFilterPopover } from './PerformanceFilterPopover';

const SELECT_CLASS =
  'h-8 flex-1 min-w-0 rounded-md border border-[#E6E8EC] bg-white px-2 text-[11px] font-medium text-[#171A21] transition-colors hover:border-[#D1D5DB] focus:border-[#6558E8] focus:outline-none focus:ring-1 focus:ring-[#6558E8] cursor-pointer';

export function SortAndScrollToolbar({ store }: { store: MediaStoreApi }) {
  const {
    connected,
    dayIndex,
    setDayIndex,
    sortIndex,
    setSortIndex,
    performanceFilters,
    setPerformanceFilters,
    categoryCounts,
    counts,
    scrolling,
    startAutoScroll,
    scrollTop,
    stopScrolling,
  } = store;

  const disabled = !connected;

  return (
    <div className="flex flex-col gap-2 border-b border-[#E6E8EC] bg-white px-3.5 py-2.5">
      {/* Row 1: Date Filter, Sorter & Performance Badge Filter (Single Horizontal Line) */}
      <div className="flex w-full items-center gap-1.5 flex-nowrap">
        <select
          id="timeRange"
          className={SELECT_CLASS}
          value={dayIndex}
          onChange={(e) => setDayIndex(Number(e.target.value))}
          aria-label="Filter posts by date"
          title="Filter posts by date"
        >
          {DATE_RANGE_OPTIONS.map((opt, i) => (
            <option key={opt.label} value={i}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          id="sort_by"
          className={SELECT_CLASS}
          value={sortIndex}
          onChange={(e) => setSortIndex(Number(e.target.value))}
          aria-label="Sort collected posts"
          title="Sort collected posts"
        >
          {SORT_OPTIONS.map((opt, i) => (
            <option key={opt.label} value={i}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Performance Badge Multi-Select Popover Filter */}
        <div className="flex-1 min-w-0">
          <PerformanceFilterPopover
            filters={performanceFilters}
            onChangeFilters={setPerformanceFilters}
            categoryCounts={categoryCounts}
            totalBaseItems={counts.base}
          />
        </div>
      </div>

      {/* Row 2: Auto-scroll Controls */}
      <div className="flex w-full items-center justify-between gap-1.5">
        {/* Start Scrolling / Scrolling state */}
        <button
          onClick={() => void startAutoScroll()}
          disabled={disabled || scrolling}
          className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-all active:scale-95 disabled:pointer-events-none ${
            scrolling
              ? 'bg-[#6558E8]/10 text-[#6558E8] border border-[#6558E8]/30 font-semibold'
              : 'border border-[#E6E8EC] bg-white text-[#171A21] hover:bg-[#F4F5F7] disabled:opacity-40'
          }`}
          title={scrolling ? 'Auto-scrolling Instagram feed...' : 'Start continuous auto-scrolling'}
        >
          {scrolling ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6558E8]" />
              <span className="truncate">Scrolling…</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 text-[#6558E8]" />
              <span className="truncate">Start scrolling</span>
            </>
          )}
        </button>

        {/* Scroll Top */}
        <button
          onClick={() => void scrollTop()}
          disabled={disabled}
          className="flex h-8 items-center justify-center gap-1 rounded-md border border-[#E6E8EC] bg-white px-2.5 text-[11px] font-medium text-[#171A21] transition-all hover:bg-[#F4F5F7] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          title="Scroll to top of Instagram page"
        >
          <ArrowUpToLine className="h-3.5 w-3.5 text-[#667085]" />
          <span>Top</span>
        </button>

        {/* Stop Scrolling */}
        <button
          onClick={() => void stopScrolling()}
          disabled={!scrolling}
          className={`flex h-8 items-center justify-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-all active:scale-95 ${
            scrolling
              ? 'border border-rose-300 bg-rose-50/50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 cursor-pointer shadow-sm'
              : 'border border-[#E6E8EC] bg-white text-[#667085] opacity-40 pointer-events-none'
          }`}
          title="Stop auto-scrolling immediately"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
          <span>Stop</span>
        </button>
      </div>
    </div>
  );
}
