import { FileSpreadsheet } from 'lucide-react';
import { Panel } from './Panel';
import { Button } from './Button';
import { DATE_RANGE_OPTIONS, SORT_OPTIONS } from '../../../shared/types/instagram';
import type { MediaStoreApi } from '../store/useMediaStore';

const SELECT_CLASS =
  'rounded-full border border-[#d2d2d7] bg-white px-3 py-1.5 text-[11px] font-medium text-[#1d1d1f] transition-all hover:border-[#b8b8bd] focus:border-[#0066cc] focus:outline-none focus:ring-2 focus:ring-[#0066cc]/20 shadow-[0_1px_2px_rgba(0,0,0,0.02)]';

export function FilterBar({ store }: { store: MediaStoreApi }) {
  const {
    dayIndex,
    setDayIndex,
    sortIndex,
    setSortIndex,
    counts,
    exportExcel,
    connected,
    warnings,
  } = store;

  const filteredDiffers = counts.filtered !== counts.all;

  return (
    <Panel title="Filter &amp; sort">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[11px] font-medium text-[#8e8e93]" htmlFor="timeRange">
          Filter:
        </label>
        <select
          id="timeRange"
          className={SELECT_CLASS}
          value={dayIndex}
          onChange={(e) => setDayIndex(Number(e.target.value))}
        >
          {DATE_RANGE_OPTIONS.map((opt, i) => (
            <option key={opt.label} value={i}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className="text-[11px] font-medium text-[#8e8e93]" htmlFor="sort_by">
          Sort:
        </label>
        <select
          id="sort_by"
          className={SELECT_CLASS}
          value={sortIndex}
          onChange={(e) => setSortIndex(Number(e.target.value))}
        >
          {SORT_OPTIONS.map((opt, i) => (
            <option key={opt.label} value={i}>
              {opt.label}
            </option>
          ))}
        </select>

        <Button
          variant="primary"
          className="ml-auto"
          disabled={!connected || counts.filtered <= 0}
          onClick={() => void exportExcel()}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      <div className="mt-2.5 text-[11px] text-[#8e8e93]">
        Showing{' '}
        <span className={filteredDiffers ? 'font-semibold text-[#ff3b30]' : 'font-semibold text-[#1d1d1f]'}>
          {counts.filtered}
        </span>{' '}
        of {counts.all} items
      </div>
      {(warnings.missingDate || warnings.missingMetric) && (
        <div className="mt-1 text-[11px] text-[#ff9500]">
          {warnings.missingDate && 'Some media have no date info and were hidden. '}
          {warnings.missingMetric && 'Some media lack the selected metric and sort last.'}
        </div>
      )}
    </Panel>
  );
}
