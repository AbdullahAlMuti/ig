import { ChevronsDown, ArrowUpToLine, Square } from 'lucide-react';
import { Panel } from './Panel';
import { Button } from './Button';
import type { MediaStoreApi } from '../store/useMediaStore';

export function AutomationPanel({ store }: { store: MediaStoreApi }) {
  const { connected, scrolling, swipe, scrollTop, stopScrolling } = store;
  const disabled = !connected;

  return (
    <Panel title="Automate scrolling">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={disabled || scrolling} onClick={() => void swipe(1)}>
          <ChevronsDown className="h-3.5 w-3.5" />
          Swipe down
        </Button>
        <Button variant="secondary" disabled={disabled || scrolling} onClick={() => void swipe(10)}>
          Swipe 10
        </Button>
        <Button variant="secondary" disabled={disabled || scrolling} onClick={() => void swipe(30)}>
          Swipe 30
        </Button>
        <Button variant="secondary" disabled={disabled} onClick={scrollTop}>
          <ArrowUpToLine className="h-3.5 w-3.5" />
          Top
        </Button>
        <Button variant="danger" disabled={!scrolling} onClick={() => void stopScrolling()}>
          <Square className="h-3.5 w-3.5" />
          Stop scrolling
        </Button>
      </div>
      {scrolling && (
        <p className="mt-2 text-[11px] text-slate-500">
          Auto-scrolling with human-like 3–8&nbsp;s gaps… click <b>Stop scrolling</b> to cancel.
        </p>
      )}
    </Panel>
  );
}
