import { LayoutGrid, List, Download, FileSpreadsheet, X } from 'lucide-react';
import type { MediaStoreApi } from '../store/useMediaStore';

interface MediaToolbarProps {
  store: MediaStoreApi;
  viewMode: 'grid' | 'list';
  onToggleViewMode: (mode: 'grid' | 'list') => void;
}

export function MediaToolbar({ store, viewMode, onToggleViewMode }: MediaToolbarProps) {
  const {
    filtered,
    selectedCodes,
    toggleSelectAll,
    clearSelection,
    downloadSelected,
    exportSelected,
    busy,
  } = store;

  const total = filtered.length;
  const selectedCount = selectedCodes.size;
  const isAllSelected = total > 0 && selectedCount === total;

  return (
    <div className="sticky top-0 z-10 flex h-9 shrink-0 items-center justify-between border-b border-[#E6E8EC] bg-[#F8F9FC] px-3.5 text-[12px]">
      {selectedCount > 0 ? (
        /* Selection Mode Toolbar */
        <div className="flex w-full items-center justify-between gap-2 text-[#171A21]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#6558E8]">{selectedCount} selected</span>
            <button
              onClick={clearSelection}
              className="flex items-center gap-1 text-[11px] text-[#667085] hover:text-[#171A21]"
              title="Clear selection"
            >
              <X className="h-3 w-3" />
              <span>Clear</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => void downloadSelected()}
              disabled={busy}
              className="flex h-7 items-center gap-1 rounded bg-[#6558E8] px-2 text-[11px] font-medium text-white transition-all hover:bg-[#5548D8] disabled:opacity-50"
              title={`Download ${selectedCount} selected media`}
            >
              <Download className="h-3 w-3" />
              <span>Download</span>
            </button>
            <button
              onClick={() => void exportSelected()}
              className="flex h-7 items-center gap-1 rounded border border-[#E6E8EC] bg-white px-2 text-[11px] font-medium text-[#171A21] transition-all hover:bg-[#F4F5F7]"
              title={`Export ${selectedCount} selected items to Excel`}
            >
              <FileSpreadsheet className="h-3 w-3 text-[#6558E8]" />
              <span>Export</span>
            </button>
          </div>
        </div>
      ) : (
        /* Standard View Toolbar */
        <>
          <label className="flex items-center gap-2 font-medium text-[#171A21] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              disabled={total === 0}
              className="h-3.5 w-3.5 rounded border-[#D1D5DB] text-[#6558E8] focus:ring-[#6558E8] cursor-pointer disabled:opacity-40"
            />
            <span className="text-[#667085]">Select all · {total}</span>
          </label>

          <div className="flex items-center gap-0.5 rounded-md border border-[#E6E8EC] bg-white p-0.5">
            <button
              onClick={() => onToggleViewMode('grid')}
              className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#6558E8]/10 text-[#6558E8]'
                  : 'text-[#667085] hover:text-[#171A21]'
              }`}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onToggleViewMode('list')}
              className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#6558E8]/10 text-[#6558E8]'
                  : 'text-[#667085] hover:text-[#171A21]'
              }`}
              title="List view"
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
