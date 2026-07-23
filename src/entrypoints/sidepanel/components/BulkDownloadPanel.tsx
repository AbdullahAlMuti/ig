import { Download } from 'lucide-react';
import { Panel } from './Panel';
import { Button } from './Button';
import type { MediaStoreApi } from '../store/useMediaStore';

function CountBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex min-w-[3ch] items-center justify-center rounded-full bg-sky-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-sky-800">
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
    <Panel title="Bulk download medias">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span>All medias</span>
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

        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span>Filtered medias</span>
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

      <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-500">
        {progressLines.join('\n')}
      </pre>
    </Panel>
  );
}
