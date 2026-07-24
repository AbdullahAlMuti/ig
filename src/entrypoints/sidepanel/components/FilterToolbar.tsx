import { FileSpreadsheet } from 'lucide-react';
import { DATE_RANGE_OPTIONS, SORT_OPTIONS } from '../../../shared/types/instagram';
import type { MediaStoreApi } from '../store/useMediaStore';

const SELECT_CLASS =
  'h-8 rounded-md border border-[#E6E8EC] bg-white px-2.5 text-[12px] font-medium text-[#171A21] transition-colors hover:border-[#D1D5DB] focus:border-[#6558E8] focus:outline-none focus:ring-1 focus:ring-[#6558E8] cursor-pointer';

export function FilterToolbar({ store }: { store: MediaStoreApi }) {
  const {
    dayIndex,
    setDayIndex,
    sortIndex,
    setSortIndex,
    counts,
    exportExcel,
    connected,
  } = store;

  const filteredDiffers = counts.filtered !== counts.all;

  return (
    <div className="flex flex-col gap-1.5 border-b border-[#E6E8EC] bg-white px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        {/* Dropdowns */}
        <div className="flex items-center gap-1.5 min-w-0">
          <select
            id="timeRange"
            className={SELECT_CLASS}
            value={dayIndex}
            onChange={(e) => setDayIndex(Number(e.target.value))}
            aria-label="Filter posts by date"
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
          >
            {SORT_OPTIONS.map((opt, i) => (
              <option key={opt.label} value={i}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={() => void exportExcel()}
          disabled={!connected || counts.filtered <= 0}
          aria-label="Export media data"
          className="flex h-8 items-center gap-1.5 rounded-md border border-[#E6E8EC] bg-white px-3 text-[12px] font-medium text-[#171A21] transition-all hover:bg-[#F4F5F7] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-[#6558E8]" />
          <span>Export</span>
        </button>
      </div>

      {/* Subtle Item Counter */}
      <div className="flex items-center justify-between text-[11px] text-[#667085]">
        <div>
          {filteredDiffers ? (
            <span>
              <strong className="font-semibold text-[#171A21]">{counts.filtered}</strong> of {counts.all} items
            </span>
          ) : (
            <span>
              <strong className="font-semibold text-[#171A21]">{counts.all}</strong> items
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
