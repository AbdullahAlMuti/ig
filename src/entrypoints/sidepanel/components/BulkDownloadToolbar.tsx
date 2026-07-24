import { Download, FileSpreadsheet } from 'lucide-react';
import type { MediaStoreApi } from '../store/useMediaStore';

export function BulkDownloadToolbar({ store }: { store: MediaStoreApi }) {
  const { connected, busy, counts, progress, downloadAll, downloadFiltered, exportExcel } = store;

  const totalFiles = progress?.totalFiles ?? 0;
  const completedFiles = progress?.completedFiles ?? 0;
  const percent = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0;
  const filteredDiffers = counts.filtered !== counts.all;

  return (
    <div className="flex flex-col border-b border-[#E6E8EC] bg-white px-3.5 py-2">
      {/* Compact Action Row: Download buttons + Item Count + Export */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            onClick={() => void downloadAll()}
            disabled={!connected || busy || counts.all <= 0}
            className="flex h-8 flex-1 items-center justify-center gap-1 rounded-md border border-[#E6E8EC] bg-white px-2 text-[11px] font-medium text-[#171A21] transition-all hover:bg-[#F4F5F7] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            title="Download all captured posts media"
          >
            <Download className="h-3.5 w-3.5 text-[#6558E8]" />
            <span className="truncate">All · {counts.all}</span>
          </button>

          <button
            onClick={() => void downloadFiltered()}
            disabled={!connected || busy || counts.filtered <= 0}
            className="flex h-8 flex-1 items-center justify-center gap-1 rounded-md border border-[#E6E8EC] bg-white px-2 text-[11px] font-medium text-[#171A21] transition-all hover:bg-[#F4F5F7] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            title="Download filtered posts media"
          >
            <Download className="h-3.5 w-3.5 text-[#6558E8]" />
            <span className="truncate">Filtered · {counts.filtered}</span>
          </button>
        </div>

        {/* Item Counter & Export Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-[11px] text-[#667085] hidden sm:block">
            {filteredDiffers ? (
              <span>
                <strong className="font-semibold text-[#171A21]">{counts.filtered}</strong>/{counts.all}
              </span>
            ) : (
              <span>
                <strong className="font-semibold text-[#171A21]">{counts.all}</strong> items
              </span>
            )}
          </div>

          <button
            onClick={() => void exportExcel()}
            disabled={!connected || counts.filtered <= 0}
            aria-label="Export media data"
            title="Export analytics to Excel"
            className="flex h-8 items-center gap-1.5 rounded-md border border-[#E6E8EC] bg-white px-2.5 text-[11px] font-medium text-[#171A21] transition-all hover:bg-[#F4F5F7] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#6558E8]" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Dynamic Progress Bar - ONLY rendered when actively processing/downloading */}
      {progress && (
        <div className="mt-2 flex flex-col gap-1 rounded-md border border-[#6558E8]/20 bg-[#6558E8]/5 p-2 text-[11px] text-[#171A21]">
          <div className="flex items-center justify-between font-medium">
            <span>
              {progress.statusLabel} ({completedFiles}/{totalFiles} files)
            </span>
            <span className="font-semibold text-[#6558E8]">{percent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#6558E8]/20">
            <div
              className="h-full bg-[#6558E8] transition-all duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
          {progress.currentFileLabel && (
            <div className="truncate text-[10px] text-[#667085]">
              Current: {progress.currentFileLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
