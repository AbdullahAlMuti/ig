import { useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Header } from './components/Header';
import { Panel } from './components/Panel';
import { Button } from './components/Button';
import { BulkDownloadPanel } from './components/BulkDownloadPanel';
import { AutomationPanel } from './components/AutomationPanel';
import { FilterBar } from './components/FilterBar';
import { MediaGrid } from './components/MediaGrid';
import { SettingsDialog } from './components/SettingsDialog';
import { useMediaStore } from './store/useMediaStore';

export default function App() {
  const store = useMediaStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-2">
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      {!store.connected && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
          Waiting for an active Instagram tab… open instagram.com and this panel will start
          capturing posts automatically.
        </div>
      )}

      <Panel title="Access">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={store.gotoInstagram}>
            <ExternalLink className="h-3.5 w-3.5" />
            Goto Instagram
          </Button>
          <Button variant="secondary" disabled={!store.connected} onClick={() => void store.cleanRefresh()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Clean &amp; Refresh
          </Button>
        </div>
      </Panel>

      <BulkDownloadPanel store={store} />
      <AutomationPanel store={store} />
      <FilterBar store={store} />
      <MediaGrid store={store} />

      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} onSaved={store.flashToast} />
      )}

      {store.toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[3000] flex justify-center">
          <div className="rounded-md bg-slate-800 px-4 py-2 text-xs font-medium text-white shadow-lg">
            {store.toast}
          </div>
        </div>
      )}
    </div>
  );
}
