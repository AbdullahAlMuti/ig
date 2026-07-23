import { FileSpreadsheet } from 'lucide-react';
import { Panel } from './Panel';
import { Button } from './Button';
import { DATE_RANGE_OPTIONS, SORT_OPTIONS } from '../../../shared/types/instagram';
import type { MediaStoreApi } from '../store/useMediaStore';

const SELECT_CLASS =
  'rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-brand focus:outline-none';

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
        <label className="text-xs font-medium text-slate-600" htmlFor="timeRange">
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

        <label className="text-xs font-medium text-slate-600" htmlFor="sort_by">
          Sort by:
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

      <div className="mt-2 text-xs text-slate-600">
        Showing{' '}
        <span className={filteredDiffers ? 'font-semibold text-red-500' : 'font-semibold'}>
          {counts.filtered}
        </span>{' '}
        of {counts.all} unfiltered items
      </div>
      {(warnings.missingDate || warnings.missingMetric) && (
        <div className="mt-1 text-[11px] text-amber-600">
          {warnings.missingDate && 'Some medias have no date and were hidden. '}
          {warnings.missingMetric && 'Some medias lack the selected metric and sort last.'}
        </div>
      )}
    </Panel>
  );
}
