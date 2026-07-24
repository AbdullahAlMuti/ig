import { Download } from 'lucide-react';
import { Panel } from './Panel';
import { Button } from './Button';
import type { MediaStoreApi } from '../store/useMediaStore';

function CountBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex min-w-[2.5ch] items-center justify-center rounded-full bg-[#0066cc]/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#0066cc]">
      {value}
    </span>
  );
}

export function BulkDownloadPanel({ store }: { store: MediaStoreApi }) {
  const { connected, busy, counts, progress, queue, downloadAll, downloadFiltered } = store;

  const progressLines: string[] = progress
    ? [
        `Status: ${progress.statusLabel}`,
        `Scope: ${progress.scopeLabel}`,
        `Posts: ${progress.processedPosts}/${progress.totalPosts}`,
        `Files: ${progress.completedFiles}/${progress.totalFiles}`,
        `Skipped posts: ${progress.skippedPosts}`,
        `Queue: ${queue}`,
        ...(progress.currentFileLabel ? [`Current: ${progress.currentFileLabel}`] : []),
      ]
    : [queue > 0 ? `Status: Queue ${queue}` : 'Status: Idle'];

  return (
    <Panel title="Bulk download media">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#1d1d1f]">
            <span>All media</span>
            <CountBadge value={counts.all} />
          </div>
          <Button
            variant="primary"
            disabled={!connected || busy || counts.all <= 0}
            onClick={() => void downloadAll()}
          >
            <Download className="h-3.5 w-3.5" />
            Download all
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-2">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#1d1d1f]">
            <span>Filtered media</span>
            <CountBadge value={counts.filtered} />
          </div>
          <Button
            variant="primary"
            disabled={!connected || busy || counts.filtered <= 0}
            onClick={() => void downloadFiltered()}
          >
            <Download className="h-3.5 w-3.5" />
            Download filtered
          </Button>
        </div>
      </div>

      <div className="mt-2.5 rounded-xl border border-[#e5e5e7] bg-[#fafafc] p-2.5">
        <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[#515154]">
          {progressLines.join('\n')}
        </pre>
      </div>
    </Panel>
  );
}
